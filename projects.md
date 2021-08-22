---
permalink: /projects
title: Projects
---

# Projects

{% assign sorted = site.projects | reverse | slice: 0, 10 %}

{% for project in sorted %}

## [{{ project.title }}]({{ project.url }})

{{ project.date | date: "%d/%m/%Y" }}

{% endfor %}

{% assign psize = sorted | size %}

{% if psize == 0 %}

{% include no-projects.html %}

{% endif %}
