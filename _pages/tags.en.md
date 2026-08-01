---
layout: page
title: Writing tags
permalink: /en/tags/
description: Browse writing by topic.
lang: en
translation_url: /tags/
---

{% assign lang_key = page.lang | default: 'en' %}
{% assign text = site.data.site_text[lang_key] %}
<div class="taxonomy-grid">
  {% assign sorted_tags = site.tags | sort %}
  {% for tag in sorted_tags %}
    {% assign lang_items = tag[1] | where: "lang", page.lang %}
    {% assign lang_count = lang_items | size %}
    {% if lang_count > 0 %}
      {% assign encoded_tag = tag[0] | url_encode %}
      <a class="taxonomy-item" href="{{ text.urls.writing | append: '?tag=' | append: encoded_tag | relative_url }}">
        <span>{{ tag[0] }}</span>
        <small>{{ lang_count }}</small>
      </a>
    {% endif %}
  {% endfor %}
</div>
