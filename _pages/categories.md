---
layout: page
title: 随笔分类
permalink: /categories/
description: 按分类浏览随笔。
lang: zh
schema_type: CollectionPage
translation_url: /en/categories/
---

{% assign lang_key = page.lang | default: 'zh' %}
{% assign text = site.data.site_text[lang_key] %}
<div class="taxonomy-grid">
  {% assign sorted_categories = site.categories | sort %}
  {% for category in sorted_categories %}
    {% assign lang_items = category[1] | where: "lang", page.lang %}
    {% assign lang_count = lang_items | size %}
    {% if lang_count > 0 %}
      {% assign encoded_category = category[0] | url_encode %}
      <a class="taxonomy-item" href="{{ text.urls.writing | append: '?tag=' | append: encoded_category | relative_url }}">
        <span>{{ category[0] }}</span>
        <small>{{ lang_count }}</small>
      </a>
    {% endif %}
  {% endfor %}
</div>
