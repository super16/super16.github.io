---
title: "Dependency Injection in Sanic"
slug: "sanic-dependency-injection"
snippet: "A practical guide how to inject database connection to your views."
native: true
meta: "A practical guide how to inject database connection to your views."
---

# {{ page.title }}

**Posted {{ page.date | date: "%B %d, %Y" }}**

*Dependency Injection* is a very common pattern for MVC frameworks and
used a lot to handle connections to databases, injecting services and
preprocess data for the response.

Let's take a look at the [Sanic framework](https://sanic.dev/) and what
strategies we can use to handle queries to databases at views layer:

1. Put database connection pools to `app.ctx` and use them wherever
we want through the whole application. That's a very convenient thing to do,
but the absence of context object typing aggravate the coding practices
(of course, we can override `app.ctx` to the typed object during
application initialization, but that's not the way how we use frameworks).

2. Create a middleware to take the repeating logic from the previous point
out of the views layer. It's a good practice if all application views
require the same flow of operations with database connection. But what
if the application has routes like health check ping or responses with
static HTML pages, that don't need connection to database, but middleware
still would create and destroy abstractions to handle query to database
for each request. This approach creates overhead logic for applications
that have different types of responses.

3. Use [dependency injection](https://sanic.dev/en/plugins/sanic-ext/injection.html)
API from Sanic Extensions that has lower and higher level to handle injected object.
This extension makes injection optional to our views and does all the work for us
to resolve what kind of dependency should be injected by the function's signature.


The following practical example of a common application that uses connection
to relational database and to Redis key-value storage as cache is displaying
how we can use dependency injection pattern in the robust way.

## Create application

For this practical example, we will use `SQLAlchemy` module to connect
to PostgreSQL with `asyncpg` driver and `redis` module to connect to Redis.

Suppose, we'd like to store some `Item` objects in database as an artificial service,
but some objects are wide-used read-only constants, which should be taken
from Redis cache to reduce number of requests to the database.

*All commands examples are for Unix systems. Using 3.11 Python version.*

Locally, you can set up the lightweight PostgreSQL database and Redis server
with Docker containers if you haven’t one.

```shell
docker pull postgres:alpine && docker pull redis:alpine

docker run -d \
    --name sanic-postgres \
    -p 5432:5432 \
    -e POSTGRES_USER=sanic-postgres \
    -e POSTGRES_PASSWORD=password \
    -e POSTGRES_DB=sanic-postgres \
    postgres:alpine

docker run -d \
    --name sanic-redis \
    -p 6379:6379 \
    redis:alpine
```

1. Start new Python application with virtual environment or
   `poetry` package manager.

   ```shell
   # with virtual environment
   
   mkdir sanic-di && cd "$_"
   python3 -m venv myenv
   source myenv/bin/activate
   python -m pip install --upgrade pip
   pip install asyncpg redis sanic[ext] sqlalchemy
   mkdir sanic_di

   # or with poetry
   
   poetry new sanic-di && cd "$_"
   poetry add asyncpg redis sanic[ext] sqlalchemy
   ```

   Make sure that your project using `^22.6` version of `Sanic` module.

2. Create Python files to structure application.

   ```shell
   touch sanic_di/{__init__,config,database,models,server}.py
   ```

3. Create class to store application connection credentials and
   mixin config class in `sanic_di/config.py` and fill the credentials.

   ```python
   class ConnectionsConfig:
       DB_DRIVER = "postgresql+asyncpg"
       DB_USER = "sanic-postgres"
       DB_PASSWORD = "password"
       DB_HOST = "localhost"
       DB_PORT = 5432
       DB_NAME = "sanic-postgres"
       REDIS_HOST = "localhost"
       REDIS_PORT = 6379
   ```

4. Fill the `sanic_di/models.py` file with `Item` model.

   Make sure that your project using `^2.0` version of `SQLAlchemy`,
   here and further we use the new `SQLAlchemy` declarative API.

   ```python
   from sqlalchemy.orm import (
       DeclarativeBase,
       Mapped,
       mapped_column,
   )


   class Base(DeclarativeBase):
       pass


   class Item(Base):

       __tablename__ = "items"

       item_id: Mapped[int] = mapped_column(primary_key=True)
       title: Mapped[str] = mapped_column(unique=True)

       def serialize(self):
           return {"id": self.item_id, "title": self.title}
   ```

4. Create wrapper class for connection to PostgreSQL in `sanic_di/database.py`
   with `SQLAlchemy`.

   ```python
   from typing import Type

   from sqlalchemy import URL
   from sqlalchemy.ext.asyncio import (
       AsyncEngine,
       AsyncSession,
       async_sessionmaker,
       create_async_engine,
   )
   from sanic.config import Config

   from sanic_di.models import Base


   class DatabaseConnection:

       def __init__(self, config: Config) -> None:
           self._url: URL = URL.create(
               config.DB_DRIVER,
               config.DB_USER,
               config.DB_PASSWORD,
               config.DB_HOST,
               config.DB_PORT,
               config.DB_NAME,
           )
           self._connection: AsyncEngine = create_async_engine(self._url)
           self._session_factory: async_sessionmaker[AsyncSession] = \
               async_sessionmaker(
                   self._connection, expire_on_commit=False,
               )

       async def initial_migration(self, base: Type[Base]) -> None:
           async with self._connection.begin() as conn:
               await conn.run_sync(base.metadata.create_all)

       def create_session(self) -> AsyncSession:
           return self._session_factory()
   ```

   There are two methods in `DatabaseConnection` class, one is to create
   initial migration for database (*don't do this for production code,*
   *migrations never should be run from the application*). Another method
   is the function expression for `SQLAlchemy` session factory.

5. Add the basic part of application to `sanic_di/server.py`.
   Never mind all the unused imports at this point, we will use them later.

   ```python
   from random import choice
   from string import ascii_letters
   from typing import Optional, TYPE_CHECKING

   from redis.asyncio import Redis, from_url
   from sanic import Sanic, HTTPResponse
   from sanic.exceptions import NotFound, ServerError
   from sanic.response import empty, json, json_dumps
   from sqlalchemy import select
   from sqlalchemy.dialects.postgresql import insert
   from sqlalchemy.ext.asyncio import AsyncSession
   from ujson import loads

   if TYPE_CHECKING:
       from sqlalchemy.engine import Result, ScalarResult

   from sanic_di.config import ConnectionsConfig
   from sanic_di.database import DatabaseConnection
   from sanic_di.models import Base, Item


   app = Sanic("dependency_injection_app")
   app.update_config(ConnectionsConfig)


   @app.before_server_start
   async def setup_db(application: Sanic, _) -> None:

       # Initialize connection to PostgreSQL
       db_conn = DatabaseConnection(application.config)
       await db_conn.initial_migration(Base)
       db_session: AsyncSession = db_conn.create_session()

       # Initialize Redis client
       redis_url = (
           f"redis://{application.config.REDIS_HOST}:"
           f"{application.config.REDIS_PORT}"
       )
       redis_client: Redis = from_url(redis_url)

       # Creating constant item and cache it
       async with db_session.begin():
           result: Result = await db_session.execute(
               insert(Item).values(title="constant_item")
               .on_conflict_do_nothing().returning(Item)
           )
           constant_item: Optional[Item] = result.scalar()

       if constant_item:
           async with redis_client:
               await redis_client.set(
                   "constant_item",
                   json_dumps(constant_item.serialize())
               )

       # Adding DIs
       application.ext.dependency(db_session)
       application.ext.dependency(redis_client)


   @app.get("/ping")
   def health_check(_) -> HTTPResponse:
       return json({"status": "pong"})
   ```

   Here, we create an application and update its config with credentials for
   services connections. Succeeding, we initialize previously created database
   connections classes, create our constant `Item` object and put it to the
   Redis cache. Finally, add connection classes to the applications as
   dependency injections.

6. Run the application server.

   ```shell
   sanic sanic_di.server.app --debug --reload

   # or with poetry

   poetry run sanic sanic_di.server.app --debug --reload
   ```

   Test the health check route in another terminal.

   ```shell 
   curl http://127.0.0.1:8000/ping | python3 -m json.tool

   # {
   #     "status": "pong"
   # }
   ```

## Views

Now we can add views with different combinations of injected dependencies.
Let's start with basic endpoint `/items` to get all the items and to create
the new ones. Append the following lines to the `sanic_di/server.py` file.

```python
@app.get("/items")
async def get_items(_, db_session: AsyncSession) -> HTTPResponse:
    async with db_session.begin():
        result: Result = await db_session.execute(select(Item))
        items: ScalarResult[Item] = result.scalars()

    if not items:
        return empty()

    return json([item.serialize() for item in items])


@app.post("/items")
async def create_item(_, db_session: AsyncSession) -> HTTPResponse:
    async with db_session.begin():
        query = insert(Item).values(
            title="".join(choice(ascii_letters) for __ in range(10))
        ).returning(Item)
        result: Result = await db_session.execute(query)
        created_item: Optional[Item] = result.scalar()

    if not created_item:
        error_message = "Can't create item"
        raise ServerError(error_message)

    return json(created_item.serialize())
```

For these views, we pass the database connection class as the second
argument. At first glance, you can think that calling this endpoint
should raise `TypeError` with positional argument error, but the
framework resolves what dependency object should be passed as an
argument by the argument's type value and implicitly does so without
any errors.

Try to create new `Item` object and get all the objects.

```shell
curl -X POST http://127.0.0.1:8000/items | python3 -m json.tool

# {
#     "id": 3,
#     "title": "sSyxhnCUrN"
# }

curl http://127.0.0.1:8000/items | python3 -m json.tool

# [
#     {
#         "id": 1,
#         "title": "constant_item"
#     },
#     {
#         "id": 3,
#         "title": "sSyxhnCUrN"
#     }
# ]
```

Let's create an endpoint to get cached object from Redis and
to look how we can use more than one dependency in one view method.
Additionally, we need to create an endpoint to clear the Redis cache
as an example to illustrate.

```python
@app.get("/cache/constant_item")
async def cached_item(
    _,
    redis_client: Redis,
    db_session: AsyncSession,
) -> HTTPResponse:
    async with redis_client as redis:
        result = await redis.get("constant_item")

        if not result:
            """
            Fallback if cache is empty, request query to database
            and update the cache
            """
            async with db_session.begin():
                selected_item: Result = await db_session.execute(
                    select(Item).where(Item.title == "constant_item")
                )
                item: Optional[Item] = selected_item.scalar()

            if not item:
                error_message = "Can't found cached item"
                raise NotFound(error_message)

            serialized_item = item.serialize()

            await redis.set(
                "constant_item",
                json_dumps(serialized_item)
            )

            serialized_item.update({"source": "database"})

            return json(serialized_item)
        else:
            parsed_result: dict = loads(result)
            parsed_result.update({"source": "cache"})
            return json(parsed_result)


@app.delete("/cache")
async def flush_cache(_, redis_client: Redis) -> HTTPResponse:
    async with redis_client as redis:
        await redis.flushall()
    return empty()
```

For the `/cache/get_constant_item` endpoint, we extend the response 
with a special property returning the source of data. It displays
if the constant object is present in the  Redis cache or for this
request we took it from the database and updated the cache.

Try to request cached item, flush the cache and request the item again.

```shell
curl http://127.0.0.1:8000/cache/constant_item | python3 -m json.tool

# {
#     "id": 1,
#     "title": "constant_item",
#     "source": "cache"
# }

# Constant item was taken from cache

curl -X DELETE  http://127.0.0.1:8000/cache
curl http://127.0.0.1:8000/cache/constant_item | python3 -m json.tool

# {
#     "id": 1,
#     "title": "constant_item",
#     "source": "database"
# }

# Constant item was taken from the database and was cached

curl http://127.0.0.1:8000/cache/constant_item | python3 -m json.tool

# {
#     "id": 1,
#     "title": "constant_item",
#     "source": "cache"
# }

# Constant item was taken from cache again
```

## Summary

With dependency injection extension, we can quite simply and explicitly
define only needed dependencies for the views, avoid the boilerplate
code and loose the coupling between views layer and service layer.

*Final code listing you can find [here as gist](https://gist.github.com/super16/6b0384052a10fa631c9b0ae1211f4894).*

### Further reading

* [Dependency Injection in Sanic framework](https://sanic.dev/en/plugins/sanic-ext/injection.html)
* [Asynchronous I/O in SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
* [Asyncio Examples in redis-py](https://redis-py.readthedocs.io/en/stable/examples/asyncio_examples.html)
