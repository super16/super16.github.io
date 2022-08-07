---
permalink: "/"
title: "Hey! I'm Mark"
index_page: true
meta: "👋 Hey! I'm Mark. I am a fullstack software developer with
  extensive technical writing experience.
  I'm interested in computational linguistics,
  web technologies and the humanities."
---

# Hey! I'm Mark

I am a fullstack software developer with
extensive technical writing experience.
I'm interested in computational linguistics,
web technologies and the humanities.

## Latest notes

{% assign sorted = site.notes | reverse | slice: 0, 9 %}

{% for note in sorted %}

- **[{{ note.title }}]({{ note.url }})** <small>{{ note.date | date: "%d/%m/%Y" }}</small>

{% endfor %}

{% assign nsize = sorted | size %}

{% if nsize == 0 %}

*There are no notes yet.*

{% endif %}
