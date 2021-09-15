---
title: Building a Personal GitHub Page
author: Yiyu Chen
date: 2021-09-16 00:00:00 +0800
categories: [Blogging, Tutorial]
tags: [GitHub]
excerpt: This article is about my experience of how to successfully start a Personal GitHub website. 
---

This article is about my experience of how to successfully start a Personal GitHub website. 

**Attention:** since there are variety of detailed tutorials available online, here we just focus on some key points. You may frequently open other websites.

## Background

During my hard going through, I found that there's plenty of background barriers in front of a beginner to arrange everything elegantly. So let's begin.

### GitHub Pages

[GitHub Pages](https://pages.github.com/) provides free personal & project websites for all users. 

Its pros are,

- Totally free

- Easy to manage

Its cons are,

- Static contents only

- Blogs cannot be indexed by Baidu

- Space cannot be greater than 1G

- Flow cannot exceed 100G monthly

- No more than 10 updates per hour

But it's free!

To enable this feature, follow the steps below.

1. Get a repository with name '\*.github.io'. The content of repository is the source of website.
2. Enable feature in 'Repository - Setting - Pages'.
3. Website '\*.github.io' is generated automatically each time the repository is updated. Upload a README, and watch it on '\*.github.io'.

Notice that

- Page building requires time. It's often done within 1 minute.

- Page files generated is not visible on GitHub.

- GitHub Pages supports Jekyll, as well as pure HTML documents. The theme in 'Repository - Setting - Pages' is exactly Jekyll themes.

Upon getting the website, the next step is to enrich it. Commonly on GitHub Pages we use Jekyll.

### Jekyll

[Jekyll](https://jekyllrb.com/) provides generator of static websites and blogs without database. In most time, we update Jekyll websites with Markdown files.

For installation: <https://jekyllrb.com/docs/installation/>

Jekyll is a Ruby 'package', so Ruby first.

### Ruby

[Ruby](https://www.ruby-lang.org/) is an object-oriented dynamic language. For our usage, Ruby+Devkit installed is all we need.

### RubyGems

[RubyGems](https://rubygems.org/) is a package manager for Ruby. It provides a standard format for distributing Ruby programs and libraries, as well as a tool for managing package installation. A package for Ruby is called a 'gem'.

Jekyll is a Ruby gem.

### Buddle

[Buddle](https://bundler.io/) (or Bundler) provides a consistent environment for Ruby projects by tracking and installing the exact gems and versions that are needed.

In our procedure, sometimes `buddle exec` is needed.

### Jekyll Theme

[Jekyll Theme](https://jekyllrb.com/docs/themes/) specify plugins and package up assets, layouts, includes, and stylesheets in a way that can be overridden by your site’s content. A Jekyll Theme is a Gem. Specifically, those resources are included:

- assets

- _layouts

- _includes

- _sass

Above is what I found online. At a guess, its potentiality is more than these, but I haven't found out the mechanism yet.

## My Practice

With the information above, in fact we have multiple choices to build a GitHub Page:

1. Build with Jekyll, with theme & site separated
2. Build with Jekyll, with theme & site integrated
3. Build locally, just upload site files

Up to now my blog matches Option 2, and Option 1 is a final goal.

## Theme

 [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) is the theme I currently use, it's so close to the perfection in my mind. We have three ways to apply a theme:

1. Remote import in '_config.yml': `remote_theme: cotes2020/jekyll-theme-chirpy`
2. Fork the project, then remote import the copy in '_config.yml'
3. Copy all, with theme & site integrated, and disable external theme in '_config.yml'

I chose Option 3, as there was code incompatibility between Chirpy & Github-Pages Gem, and it's unstable to use external theme.

Chirpy also provides a [tutorial](https://github.com/cotes2020/jekyll-theme-chirpy#readme).

## Debug

As long as a BUG occurs during GitHub Page building, you will receive an e-mail.

#### Common Build Failure

> The page build failed for the `master` branch with the following error:
>
> Page build failed. For more information, see https://docs.github.com/github/working-with-github-pages/troubleshooting-jekyll-build-errors-for-github-pages-sites#troubleshooting-build-errors.
>
> For information on troubleshooting Jekyll see:
>
>  https://docs.github.com/articles/troubleshooting-jekyll-builds
>
> If you have any questions you can submit a request at https://support.github.com/contact?tags=dotcom-pages&repo_id=406411513&page_build_id=279574162

This message does not feedback the exact problems to us. To deal with this, we should rely on local environment, where bug feedbacks can be found in the console.

But notice that GitHub Page building relies on a specific set of Gems. The list is shown on <https://pages.github.com/versions.json>. While testing locally, the difference of Gem version may leads to different result. To sync, just import Gem in 'Gemfile': `gem 'github-pages'`, and exec `buddle exec jekyll serve` in console.

#### _config.yml Failure

> The page build failed for the `master` branch with the following error:
>
> You have an error on line 2 of your `_config.yml` file. For more information, see https://docs.github.com/github/working-with-github-pages/troubleshooting-jekyll-build-errors-for-github-pages-sites#config-file-error.
>
> For information on troubleshooting Jekyll see:
>
>  https://docs.github.com/articles/troubleshooting-jekyll-builds
>
> If you have any questions you can submit a request at https://support.github.com/contact?tags=dotcom-pages&repo_id=406061228&page_build_id=279331936

This kind of messages indicate where the bug exists. For more information, just test it locally.

## Result

And [this website](https://yiyuiii.github.io/) is the outcome.

## Reference

[chirpy-homepage]: https://github.com/cotes2020/jekyll-theme-chirpy/