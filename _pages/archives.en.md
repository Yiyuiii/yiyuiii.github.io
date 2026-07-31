---
layout: page
title: Writing archive
permalink: /en/archives/
description: Browse writing by year.
lang: en
translation_url: /archives/
---

{% assign lang_posts = site.posts | where: "lang", page.lang %}
{% assign posts_by_year = lang_posts | group_by_exp: "post", "post.date | date: '%Y'" %}
<div class="writing-archive">
  {% for year in posts_by_year %}
    <section class="archive-year">
      <h2>{{ year.name }}</h2>
      <ol>
        {% for post in year.items %}
          {% if post.lang == page.lang %}
            <li>
              <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%m-%d" }}</time>
              <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
            </li>
          {% endif %}
        {% endfor %}
      </ol>
    </section>
  {% endfor %}
</div>
