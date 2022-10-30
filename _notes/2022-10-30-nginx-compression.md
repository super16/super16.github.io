---
title:  "Improve Your Frontend App Performance with NGINX Compression"
slug: "nginx-compression-for-frontend-app"
snippet: "Use gzip or Brotli compression to improve performance of the app."
native: true
meta: "Use gzip or Brotli compression to improve performance of the app with NGINX, Docker and Vite.js."
---

# {{ page.title }}

**Posted {{ page.date | date: "%B %d, %Y" }}**

Aside from developing your frontend application, one of the most
important things is to deploy and run it effectively. Let us imagine
that there is some frontend application, that should be deployed through
NGINX with Docker. It's rather easy to make, there are a lot of guides
how to do it. But most of it using only default NGINX config.

We can improve application loading time using NGINX response compression methods.
They reduce the size of transmitted data from web-server to client,
so the browsers decompress obtained data. There are two standard algorithms
to compress data, that's widely supported on the web:

* [gzip](https://developer.mozilla.org/en-US/docs/Glossary/GZip_compression)
* [Brotli](https://developer.mozilla.org/en-US/docs/Glossary/brotli_compression)

I won't go into details how these algorithms work, but focus on how
to set NGINX config and show the difference between response data size
for each compression method.

* * *

## Create and Build Project

*For this part, you can use your own ready application. For demonstration
purposes, I will use Vite.js empty template project as frontend application
and lightweight `alpine` images for Node.js and NGINX*.

*All commands examples are for Unix systems.*

1. Create basic application with [Vite.js](https://vitejs.dev/) templates
as default TypeScript vanilla project. You can try any other template,
add your features and run the development server (follow the CLI tips).

   ```bash
   # npm
   npm create vite@latest my-dockerized-app -- --template vanilla-ts

   # or yarn
   yarn create vite my-dockerized-app --template vanilla-ts
   ```

2. Create `Dockerfile` and `.dockerignore` file.

   ```bash
   cd my-dockerized-app
   touch Dockerfile .dockerignore
   ```

3. Add `node_modules` and `dist` directories paths to
`.dockerignore` file. If you have installed dependencies, 
run or built project. Such artifacts should be out of the
Docker build context.

   ```
   /dist
   /node_modules
   ```

4. Fill the `Dockerfile`. We will use
[multi-stage build](https://docs.docker.com/build/building/multi-stage/#use-multi-stage-builds).
At first stage, Docker will build frontend application with node image,
and after will copy from first to second stage with `nginx` image.

   ```Dockerfile
   FROM node:lts-alpine as frontend-build

   WORKDIR /app
   COPY package*.json ./
   RUN npm i
   COPY . .
   RUN npm run build

   FROM nginx:alpine

   COPY --from=frontend-build /app/dist /usr/share/nginx/html
   ```

5. Build and run the container.

   ```bash
   docker build -t nginx-frontend .
   docker run -p 80:80/tcp --name nginx-frontend nginx-frontend
   ```

Now we can test our built and containerized application with [curl](https://curl.se/)
and `-I` flag to show only response headers.

```bash
curl -I http://localhost
```

Below, you can see the truncated response for the index page, which contains
illustrative headers. We are interested in `Content-Length` header, which displays
the size of the response body in bytes.

```
HTTP/1.1 200 OK
Server: nginx/1.23.1
Content-Type: text/html
Content-Length: 448
Connection: keep-alive
Accept-Ranges: bytes
```

HTML pages usually weight a little, so the more visual showcase would be
to request JavaScript asset file.

```bash
curl -I http://localhost/assets/index.acb3e620.js
```

*Most likely in your case filename hash for JS asset would be different,
so you can find it among requests during index page loading at network tab
in your browser. Without browser, you can find `.js`-filename by the command below.*

```bash
docker exec nginx-frontend ls /usr/share/nginx/html/assets | grep .js
```

So, as you can see below, the size of the transferred JavaScript asset
file is 1436 bytes. Let's see, how can we reduce it.

```
HTTP/1.1 200 OK
Server: nginx/1.23.1
Content-Type: application/javascript
Content-Length: 1436
Connection: keep-alive
Accept-Ranges: bytes
```

* * *

## gzip

The first option is to use gzip compression, which is *batteries included*
compression module at default NGINX package, but we should edit the
configuration file.

1. Stop the running container and add the configuration file.

   ```bash
   touch nginx.conf
   ```

2. Edit `Dockerfile` to copy created configuration file to container.

   ```Dockerfile
   FROM node:lts-alpine as frontend-build

   WORKDIR /app
   COPY package*.json ./
   RUN npm i
   COPY . .
   RUN npm run build

   FROM nginx:alpine

   COPY --from=frontend-build /app/dist /usr/share/nginx/html

   COPY nginx.conf /etc/nginx/nginx.conf
   ```

3. Fill the `nginx.conf` file with the following lines.

   ```conf
   user  nginx;
   worker_processes  auto;

   error_log  /var/log/nginx/error.log notice;
   pid        /var/run/nginx.pid;

   events {
       worker_connections  1024;
   }

   http {
       include       /etc/nginx/mime.types;
       default_type  application/octet-stream;

       log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                       '$status $body_bytes_sent "$http_referer" '
                       '"$http_user_agent" "$http_x_forwarded_for"';

       access_log  /var/log/nginx/access.log  main;

       sendfile        on;

       keepalive_timeout  65;

       gzip on;
       gzip_types
           application/javascript
           image/svg+xml
           text/css;
       gzip_min_length 100;

       include /etc/nginx/conf.d/*.conf;
   }
   ```

    Such configuration overrides the default NGINX configuration
    with three directives `gzip`, `gzip_types` and `gzip_min_length`.
    The first one activates gzip compression for web server, the another
    one specifies MIME types for files to compress and the last one sets
    the minimum length of a response in bytes that will be gzipped.

    As we saw earlier, our HTML-page weights less than 500 bytes,
    `gzip_min_length` directive depends on initial `Content-Length` header
    value and this determines whether the compression will be done,
    that's why we have set the value to `100` bytes.

4. Delete the previous container, rebuild and run the updated one.

   ```bash
   docker rm nginx-frontend
   docker build -t nginx-frontend .
   docker run -p 80:80/tcp --name nginx-frontend nginx-frontend
   ```

5. Test the size of obtained compressed file. To enable `Accept-Encoding`
request headers for `curl`, we should add `--compressed` option.

   ```bash
   curl --compressed -I http://localhost
   ```

    You can see the new response header `Content-Encoding`, which is
    displaying the name of encoding algorithm.

   ```
   HTTP/1.1 200 OK
   Server: nginx/1.23.1
   Content-Type: text/html
   Connection: keep-alive
   Content-Encoding: gzip
   ```

    With data encoding, we couldn't use `Content-Length` header anymore to get the size
    of response [because of reasons](https://serverfault.com/a/542536).

   ```bash
   curl --compressed -so /dev/null http://localhost -w '%{size_download} bytes\n'
   ```

    The command above formats information on stdout after a completed
    transfer and displays the total amount of bytes that were downloaded.

   ```bash
   300 bytes
   ```

    This is a much better result than 448 bytes without compression. So,
    let's try to test the JavaScript asset file.

   ```bash
   curl --compressed -so /dev/null http://localhost/assets/index.acb3e620.js -w '%{size_download} bytes\n'
   ```

   ```bash
   752 bytes
   ```

The output result is almost twice better. 752 bytes against 1436 bytes. But don't forget
that such performance improvements benefit only clients and transferred data amount.
Compressing algorithms increase computational workload for web servers, because the data is
compressed dynamically, i.e. on the fly.

Another way to reduce workload on a web server that distributes compressed files is
to build the application as precompressed gzipped static bundle,
that can be statically stored and sent, but the NGINX should have
[static compression module and another configuration](https://nginx.org/en/docs/http/ngx_http_gzip_static_module.html). 

* * *

## Brotli

Another compressing option is Brotli module. Current latest version of NGINX
(1.23 at the time of publication) doesn't have included Brotli module,
that's why we need to download and configure NGINX with external
[ngx_brotli](https://github.com/google/ngx_brotli) module.

1. Stop the running container and edit `Dockerfile`. We won't use NGINX Docker image
anymore and change it to [alpine](https://hub.docker.com/_/alpine) image to install
dependencies, download NGINX archive and build it with `ngx_brotli` module.

   ```Dockerfile
   FROM node:lts-alpine as frontend-build

   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   FROM alpine:latest

   RUN apk add --update --no-cache build-base git pcre-dev openssl-dev zlib-dev linux-headers \
       && wget https://nginx.org/download/nginx-1.23.2.tar.gz \
       && tar zxf nginx-1.23.2.tar.gz \
       && git clone https://github.com/google/ngx_brotli.git --recursive \
       && cd ../nginx-1.23.2 \
       && ./configure \
           --with-compat \
           --prefix=/usr/share/nginx \
           --sbin-path=/usr/local/sbin/nginx \
           --conf-path=/etc/nginx/nginx.conf \
           --pid-path=/run \
           --add-dynamic-module=../ngx_brotli \
       && make modules \
       && make install

   COPY --from=frontend-build /app/dist /usr/share/nginx/html

   COPY nginx.conf /etc/nginx/nginx.conf

   CMD ["nginx", "-g", "daemon off;"]
   ```

2. Edit `nginx.conf`.

   ```conf
   load_module modules/ngx_http_brotli_filter_module.so;
   load_module modules/ngx_http_brotli_static_module.so;

   user  nobody;
   worker_processes  auto;

   error_log  /dev/stderr;
   pid        /run/nginx.pid;


   events {
       worker_connections  1024;
   }


   http {
       include       /etc/nginx/mime.types;
       default_type  application/octet-stream;

       log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

       access_log  /dev/stdout;

       sendfile        on;

       keepalive_timeout  65;

       brotli on;
       brotli_types application/javascript
           image/svg+xml
           text/css;
       brotli_min_length 100;

       gzip on;
       gzip_types application/javascript
           image/svg+xml
           text/css;
       gzip_min_length 100;

       server {
           listen 80;
           location / {
               root /usr/share/nginx/html;
               index index.html index.htm;
           }
       }
   }
   ```

    At the top of the file we added two import statement with paths
    to external Brotli modules. The Brotli module uses similar directives
    as gzip encoding module:
    
    * `brotli` to switch on Brotli compressing
    * `brotli_types` to specify MIME types for files to compress
    * `brotli_min_length` to set the minimum length of a response that will be compressed

    We will leave gzip directives as fallback, despite the Brotli encoding
    [is supported by almost all modern browsers](https://caniuse.com/?search=brotli).

3. Delete the previous container, rebuild and run the updated one.

   ```bash
   docker rm nginx-frontend
   docker build -t nginx-frontend .
   docker run -p 80:80/tcp --name nginx-frontend nginx-frontend
   ```

4. Test the size of obtained index page compressed with Brotli module.

   ```bash
   curl --compressed -I http://localhost
   ```

    With the response header `Content-Encoding` value, you will see,
    that the Brotli enconding is now applied.

   ```
   HTTP/1.1 200 OK
   Server: nginx/1.23.2
   Content-Type: text/html
   Connection: keep-alive
   Content-Encoding: br
   ```

5. Test the size of Brotli compressed assets.

   ```bash
   curl --compressed -so /dev/null http://localhost -w '%{size_download} bytes\n'
   ```

    The result is a little bit better than gzip encoding. 205 bytes against 300 bytes.

   ```bash
   205 bytes
   ```

    For the JavaScript asset file Brotli compressing is saving more than 100 bytes.

   ```bash
   curl --compressed -so /dev/null http://localhost/assets/index.acb3e620.js -w '%{size_download} bytes\n'
   ```

   ```bash
   634 bytes
   ```

Brotli compressing has the same cons as gzip encoding with the increasing workload
for on the fly actions, but also can be optimized with static modules and precompressed
application files. It is also advised to pay attention to
[`brotli_comp_level` directive](https://github.com/google/ngx_brotli#brotli_comp_level)
to set the level of compression.

## Synopsis

The compression is a flexible tool to improve performance of your application,
that can be configured for your needs and capabilities. It doesn't require
many lines of code or complex configuring to reduce the size of transferred
data and to improve load time for clients of your application.
