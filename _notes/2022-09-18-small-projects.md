---
title:  "Small Projects"
slug: "small-projects-i-mage-recently"
snippet: "Collection of tiny pet-projects I made recently."
native: true
meta: "Collection of tiny pet-projects I made recently."
---

# {{ page.title }}

**Posted {{ page.date | date: "%B %d, %Y" }}**

Last times are not an easy time for all of us, but I try to keep discipline
to make things in my spare time. So here's a collection of my tiny pet-projects
I've created and maintained for the last year.

* * *

## Eesti

I love to learn new languages, but previously it was languages from
Indo-European family, so I had an urge to loosen my mental language model
and start to learn Estonian from Uralic family (also I am a big fan
of Estonia and Estonian culture).

After I discovered that I need a pocket Estonian dictionary, but can't
find a convenient web dictionary to use. That's why I make my implementation
of Estonian dictionary using MediaWiki API.

![Eesti keel](/assets/img/eesti-keel.png)

As in a regular dictionary, almost every entry has an etymology section,
definition, declension table (Estonian is a predominantly agglutinative language
with inflection elements), synonyms, derived terms and reference links to other
resources. It seems to me that's enough for basic language studying.

Dictionary is made with Vue.js as a single-page application with
internal dynamic routing. Application is styled with Tailwind CSS,
which is also overlay HTML-markup from MediaWiki API responses.

* [Live Demo](/eesti)
* [Source Code](https://github.com/super16/eesti)

* * *

## Just The Punctuation

Last year I saw a
[beautiful post](https://medium.com/creators-hub/what-i-learned-about-my-writing-by-seeing-only-the-punctuation-efd5334060b1)
by Clive Thompson about his web-tool [just the punctuation](https://just-the-punctuation.glitch.me/).
In brief, this tool strips out text from the input, but leaves the punctuation and
displays the literal sequence of punctuation marks. It perfectly works for English,
but when I tried French or Russian, tool doesn't recognize marks which are adopted
for these languages. So I needed the same tool, which can be used for every language,
that's why I made my implementation.

Application is just a single page made with Vue.js + Tailwind CSS. It's kind of
overhead for such simple functionality, but it was the quickest way to do it.

* [Live Demo](/punct)
* [Source Code](https://github.com/super16/punct)

* * *

## ELIZA Chatbot

[ELIZA](https://en.wikipedia.org/wiki/ELIZA) is one of the first chatbots ever programmed.
First time I saw about ELIZA in Adam Curtis's
[HyperNormalisation](https://www.imdb.com/title/tt6156350/) documentary film and
all this time was fascinated by such primitive, but impressive for its cultural
impact, program.

Frontend application is a single page chat window made with
Vue.js and Quasar framework. It is communicating with backend server via
WebSocket protocol. The backend is made with FastAPI framework and using
NLTK chat module.

* [Live Demo](/punct)
* [Frontend Source Code](https://github.com/super16/eliza-chatbot)
* [Backend Source Code](https://github.com/super16/eliza-chatbot-fastapi)

* * *

## Vue.js Plugin to Use Tachyons CSS

This plugin is an experimental package for using [Tachyons CSS UI Kit](https://tachyons.io/)
selectors as v-directives inside Vue.js 3.x components.

### Installation

```bash
npm i tachyons github:super16/vue-tachyons-directives-plugin
```

### Usage

Import Tachyons CSS stylesheet and add plugin to your application mount in `main.js`.

```js
import { createApp } from 'vue';
import App from './App.vue';
import VueTachyonsPlugin from 'vue-tachyons-directives-plugin';
import 'tachyons/css/tachyons.css';

createApp(App).use(VueTachyonsPlugin).mount('#app');
```

Instead of such syntax (taken from
[Large Paragraph](https://tachyons.io/components/text/large-paragraph/index.html) example):

```vue
<template>
  <main class="pa3 pa5-ns">
    <p class="f4 lh-copy measure">
      Typography has one plain duty before it and that is to convey information
      in writing. No argument or consideration can absolve typography from this
      duty. A printed work which cannot be read becomes a product without
      purpose.
    </p>
  </main>
</template>
```

You can use v-directives like that:

```vue
<template>
  <main v-pa="3" v-pa.ns="5">
    <p v-f="4" v-lh.copy v-measure>
      Typography has one plain duty before it and that is to convey information
      in writing. No argument or consideration can absolve typography from this
      duty. A printed work which cannot be read becomes a product without
      purpose.
    </p>
  </main>
</template>
```

All class selectors modifiers such as `copy` in `lh-copy` can be added
like v-directive modifier: `v-lh.copy`.

* [Documentation (WIP)](/vue-tachyons-directives-plugin/)
* [Source Code](https://github.com/super16/vue-tachyons-directives-plugin)
