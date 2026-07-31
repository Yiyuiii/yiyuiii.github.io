---
layout: page
title: 随笔标签
permalink: /tags/
description: 按标签浏览随笔。
lang: zh
translation_url: /en/tags/
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
