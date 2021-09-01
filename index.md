---
permalink: /
title: Super16 Personal Page
---

# Hi! I'm Mark

{% include introduction.html %}

{% include buttons.html %}

## [Notes](/notes)

{% assign sorted = site.notes | reverse | slice: 0, 9 %}

{% for note in sorted %}

- {{ note.date | date: "%d/%m/%Y" }} \| [{{ note.title }}]({{ note.url }})

{% endfor %}

{% assign nsize = sorted | size %}

{% if nsize == 0 %}

*There are no notes yet.*

{% endif %}
