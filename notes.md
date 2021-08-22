---
permalink: /notes
title: Notes
---

# Notes

{% assign sorted = site.notes | reverse | slice: 0, 10 %}

{% for note in sorted %}

## [{{ note.title }}]({{ note.url }})

{{ note.date | date: "%d/%m/%Y" }}

{% endfor %}

{% assign nsize = sorted | size %}

{% if nsize == 0 %}

{% include no-notes.html %}

{% endif %}
