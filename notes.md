---
permalink: "/notes"
title: "Notes"
meta: "Full list of recent notes"
---

# Notes

{% assign sorted = site.notes | reverse | slice: 0, 10 %}

{% for note in sorted %}

- **[{{ note.title }}]({{ note.url }})** {% include notes-date.html %}

    <small>{{ note.snippet }}</small>

{% endfor %}

{% assign nsize = sorted | size %}

{% if nsize == 0 %}

{% include no-notes.html %}

{% endif %}
