---
layout: page
title: Writing tags
permalink: /en/tags/
description: Browse writing by topic.
lang: en
translation_url: /tags/
---

<div class="taxonomy-grid">
  {% assign sorted_tags = site.tags | sort %}
  {% for tag in sorted_tags %}
    {% assign lang_items = tag[1] | where: "lang", page.lang %}
    {% assign lang_count = lang_items | size %}
    {% if lang_count > 0 %}
      <a class="taxonomy-item" href="{{ tag[0] | slugify | prepend: '/tags/' | relative_url }}">
        <span>{{ tag[0] }}</span>
        <small>{{ lang_count }}</small>
      </a>
    {% endif %}
  {% endfor %}
</div>
