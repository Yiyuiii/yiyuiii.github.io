---
title: "Building on GitHub Pages: From Static Hosting to Reproducible Deployment"
uid: "202109160000"
author: Yiyu Chen
date: 2021-09-16 00:00:00 +0800
lang: en
permalink: /en/posts/build-a-personal-github-page/
translation_key: post-202109160000
translation_url: /posts/搭建个人-github-主页/
categories: [Tutorial]
tags: [GitHub]
thumbnail: /assets/posts/202109160000/cover-homepage-2026-07-30.webp
article_cover:
  alt: "The Chinese writing index of this personal GitHub Pages site"
  caption: >-
    Cover: this site's Chinese writing index on 30 July 2026; screenshot and site content by the author.
excerpt: >-
  I first published this article after building my own site in 2021. The implementation has since changed, so this revision rebuilds the tutorial around the parts that remain useful.
description: >-
  Build a maintainable GitHub Pages site by choosing the right publishing path, locking Jekyll dependencies, testing in CI, configuring DNS and HTTPS, and diagnosing failures systematically.
revisions:
  - date: "2021-09-16"
    note: Initial publication
  - date: "2026-08-08"
    note: Researched and rewritten by GPT-5.6 Sol; replaced the obsolete theme-specific account with a current guide to hosting boundaries, Jekyll dependencies, Pages workflows, domains, CI, and troubleshooting
---

I first published this article after building my own site in 2021. The implementation has since changed, so this revision rebuilds the tutorial around the parts that remain useful.

<span id="building-a-personal-github-page" aria-hidden="true"></span>

The durable lesson is not where a button happens to be today. It is the boundary between source, build environment, generated artifact, and public hosting. Once that boundary is explicit, themes and product interfaces can change without turning the whole site into a mystery.

## Understand the system before choosing tools

### What GitHub Pages hosts

[GitHub Pages is a static-site hosting service](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). Its public output is HTML, CSS, JavaScript, images, fonts, and other static files. Pages may build those files from source first, but it does not run a long-lived application server and does not execute server-side PHP, Ruby, or Python for each request.

That boundary leads to three practical rules:

- Browser-side JavaScript can call an external API, but a credential embedded in the repository or shipped JavaScript is public. Keep secrets and privileged operations off a Pages site.
- Features such as accounts, private data, payments, and trusted form processing need a separate backend or a managed service with an appropriate security model.
- A static-site generator is a compiler, not the production server. Jekyll runs before deployment and emits the files that Pages serves afterward.

Pages supports two URL shapes. A user or organization site is normally stored in `<owner>.github.io` and published at the domain root. A project site belongs to a repository and is normally published below `/<repository>/`. That extra path matters when generating links and assets.

| Site type | Typical repository | Default URL | Common URL concern |
| --- | --- | --- | --- |
| User or organization site | `<owner>.github.io` | `https://<owner>.github.io/` | Usually an empty base path |
| Project site | Any project repository | `https://<owner>.github.io/<repository>/` | Links and assets must include the project base path |

The official [site-creation guide](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) is the current authority for repository visibility, entry files, account plans, and setup screens. Treat those as product facts to verify, not values to memorize from a dated tutorial.

### The four-stage model

A maintainable deployment has four distinguishable stages:

1. **Source:** Markdown, layouts, data, configuration, code, and dependency declarations stored in Git.
2. **Build:** a pinned toolchain converts the source into a static directory and reports errors.
3. **Artifact:** the exact generated directory that has passed automated checks.
4. **Deploy:** GitHub Pages publishes that artifact and associates it with the Pages environment and domain.

Keeping these stages separate answers many debugging questions. A Markdown error is a source or build problem. A missing file in `_site` is a build or artifact problem. A valid artifact that never reaches the public URL is a deployment problem. A public page whose images point to the wrong path is usually a build-configuration problem, even though it appears in the browser.

## Choose a publishing path

GitHub currently supports [publishing from a branch or with a custom GitHub Actions workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). Both end at Pages hosting, but they assign responsibility differently.

### Publish from a branch

In the repository's Pages settings, choose **Deploy from a branch**, then select the branch and either its root or `/docs` directory. GitHub publishes changes from that location and uses Jekyll by default unless the publishing source contains `.nojekyll`.

This path is appropriate when the source is already static output or when a conventional Jekyll site fits GitHub's built-in environment. It minimizes workflow code, but it also gives you less control over Ruby, Jekyll, plugins, pre-build steps, and validation. If an unsupported plugin or another generator is essential, move the build into Actions rather than making the branch build imitate a custom server.

### Publish with GitHub Actions

Choose **GitHub Actions** when the project needs an explicit toolchain, arbitrary generators, tests before release, or a clean separation between source and generated output. The current official flow is:

1. check out the source;
2. configure Pages metadata;
3. build the static site;
4. upload one Pages artifact;
5. deploy that artifact from a job with the required Pages and identity-token permissions.

The following skeleton uses the action major versions shown by GitHub's official documentation on the revision date. Before copying it into a new repository, compare it with the current [custom-workflow guide](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) or the workflow template offered in the repository's Pages settings.

```yaml
name: pages

on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  pages: read

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      JEKYLL_ENV: production
    steps:
      - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803 # v6
      - uses: ruby/setup-ruby@95ef2b042f9d7a56d8268cba8559e2842e2ad01b # v1.321.0
        with:
          bundler-cache: true
      - name: Setup Pages
        id: pages
        uses: actions/configure-pages@983d7736d9b0ae728b81ab479565c72886d7745b # v5
      - run: bundle exec jekyll build --trace --baseurl "${{ steps.pages.outputs.base_path }}"
      - uses: actions/upload-pages-artifact@7b1f4a764d45c48632c6b24a0339c27f5614fb0b # v4
        with:
          path: ./_site

  deploy:
    if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
    needs: build
    permissions:
      pages: write
      id-token: write
    concurrency:
      group: pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e # v4
```

Use this as architecture, not as an immutable version list. The comments show the action versions checked on this article's revision date, while each `uses:` line pins the exact commit that was verified; GitHub's [secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use) identifies a full commit SHA as the immutable reference. Let Dependabot or a deliberate maintenance pass propose reviewed SHA updates rather than silently following a moving tag. Keep the Ruby version in `.ruby-version` or set it explicitly in the workflow; the maintained [`ruby/setup-ruby` action](https://github.com/ruby/setup-ruby) reads the project version and can run `bundle install` from `Gemfile.lock` through `bundler-cache`. The build job has read-only repository and Pages access; the deployment job alone receives write and identity-token permissions, runs only for `main`, and serializes production deployments. `configure-pages` supplies the project-site base path to Jekyll. Add the project's own test commands between build and upload, and let pull requests execute the build without deploying. Protect the `github-pages` environment as a second branch guard. A different generator can replace the Ruby and build steps while preserving the artifact and deploy stages.

### Decide by ownership, not fashion

| Question | Branch publishing | Custom Actions |
| --- | --- | --- |
| Who defines the build environment? | GitHub's built-in Pages/Jekyll environment | The repository workflow and lockfiles |
| Can arbitrary pre-build checks run? | Limited | Yes |
| Is generated output kept in the source branch? | Sometimes | Not required; upload an artifact |
| Best fit | Small static or conventional Jekyll site | Tested, customized, or multi-step site |

Avoid maintaining two deployment paths at once. Local scripts and CI should produce the same output model, and only one path should be authorized to publish it.

## Make Jekyll builds reproducible

### Know what each Ruby tool does

Jekyll is a Ruby gem. RubyGems distributes gems. A `Gemfile` declares the direct gems a project needs. Bundler resolves that graph, installs it, and records exact resolved versions in `Gemfile.lock`. `bundle exec` then runs a command inside that selected dependency environment instead of silently picking a different system-wide executable.

The official [Jekyll introduction](https://jekyllrb.com/docs/) and [Bundler guide](https://bundler.io/guides/getting_started.html) describe this relationship. The command is `bundle`, never `buddle`; the normal local entry point is `bundle exec jekyll serve`.

A minimal dependency file for a custom Actions build can begin like this:

```ruby
source "https://rubygems.org"

gem "jekyll"

group :jekyll_plugins do
  gem "jekyll-feed"
end
```

Run `bundle install` to resolve and install dependencies. For an application such as a website, commit both `Gemfile` and `Gemfile.lock`; Bundler's [lockfile documentation](https://bundler.io/man/bundle-install.1.html) explains why later installations then use the same dependency snapshot. Update dependencies intentionally with `bundle update <gem>` or an equivalent reviewed dependency-update process, rebuild, and commit the resulting lockfile change.

Branch publishing is a special case: GitHub's built-in Jekyll environment, supported plugins, and `github-pages` gem govern production compatibility. Follow GitHub's current [Pages and Jekyll documentation](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-github-pages-and-jekyll) rather than assuming the newest local Jekyll and every third-party plugin are supported there.

### Establish one local command path

From a fresh checkout, the basic loop should be short enough that every contributor actually uses it:

```console
bundle install
bundle exec jekyll serve --livereload
```

Before pushing, run the production build and the project's checks rather than relying only on the development server:

```console
bundle exec jekyll build --trace
bundle exec jekyll doctor
```

GitHub also maintains a [local Jekyll testing guide](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/testing-your-github-pages-site-locally-with-jekyll). A real repository should document its required Ruby version and wrap any additional link, HTML, accessibility, or browser checks in one validation command. CI must call that same entry point instead of reimplementing a weaker approximation.

For stronger reproducibility, periodically test a clean checkout with an empty dependency cache. A warm local machine can hide an undeclared gem, an ignored generated file, or a platform-specific dependency that a fresh Linux runner will expose.

### Test the artifact, not only the source

A successful `jekyll build` proves that generation completed; it does not prove that the site works. At minimum, CI should verify:

- the expected entry file exists in `_site`;
- internal links and referenced local assets resolve;
- project-site URLs honor `baseurl`;
- pages that require JavaScript still have meaningful static HTML;
- no secret, draft, cache, or source-only file entered the artifact;
- a browser can load representative desktop and mobile pages without console errors;
- deployment runs only after the exact artifact under test succeeds.

Store a preview artifact for pull requests when visual review matters. This turns review into an inspection of the candidate output rather than a guess based on Markdown alone.

## Configure a custom domain safely

Domain setup spans two control planes: GitHub Pages must know which domain belongs to the site, and the DNS provider must route that domain to Pages. Configure the custom domain in Pages settings before publishing DNS records; GitHub recommends verifying the domain to reduce takeover risk.

For a subdomain such as `www.example.com`, the usual record is a `CNAME` pointing directly to `<owner>.github.io`, without a repository path. Apex domains use provider-supported `ALIAS` or `ANAME` records, or the current Pages `A` and optional `AAAA` records. Do not copy IP addresses from an old article: read the current [custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) when changing DNS. Avoid wildcard records unless you have a separately justified and secured design.

Check public DNS rather than trusting only a provider dashboard:

```console
dig example.com A
dig www.example.com CNAME
```

On PowerShell, `Resolve-DnsName example.com` provides the same kind of external check. DNS propagation and certificate issuance are asynchronous, so distinguish “the record is not visible yet” from “the record points to the wrong target.”

After DNS is correct, enable **Enforce HTTPS**. GitHub's [HTTPS guide](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https) covers certificate provisioning and mixed-content failures. Load every stylesheet, script, image, and font over HTTPS or from the same origin; otherwise a valid page certificate does not prevent the browser from blocking insecure assets.

With branch publishing, setting a custom domain may create a `CNAME` file in the source. With a custom Actions workflow, the Pages setting or API is authoritative and an existing repository `CNAME` is not what activates the domain. Recheck the current documentation whenever switching publication modes.

## Troubleshoot by locating the failed stage

Start with the most specific evidence: the failed workflow job, its first meaningful error, the generated artifact, and the Pages settings. Email notifications and browser symptoms are secondary clues.

| Symptom | Inspect first | Likely correction |
| --- | --- | --- |
| Build fails locally | The first error from `bundle exec jekyll build --trace` | Fix front matter, configuration, dependency, plugin, or source syntax before deployment |
| Local build passes but CI fails | Ruby/platform assumptions, ignored files, filename case, lockfile, production environment | Reproduce from a clean checkout using CI's inputs |
| Workflow succeeds but the site is old | The deployed run, artifact identity, deploy-job condition, Pages source | Confirm the expected commit actually produced and deployed the artifact |
| Root URL returns 404 | Pages source, repository naming, entry file at artifact root | Put the entry file in the configured source or artifact root |
| HTML loads but CSS or images return 404 | Generated URLs, `url`, `baseurl`, absolute versus relative paths | Generate URLs for the user-site or project-site path actually being deployed |
| Custom domain or certificate fails | Public DNS records, extra conflicting records, Pages domain setting | Correct DNS, wait for propagation, then restart certificate provisioning if needed |
| HTTPS page reports insecure content | Browser network panel and generated asset URLs | Replace `http://` asset references and rebuild |

For built-in Jekyll failures, use GitHub's current [build-error guide](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/about-jekyll-build-errors-for-github-pages-sites). For a custom workflow, make the build run on `pull_request` so errors appear before merge, and inspect the Actions log rather than trying to infer the cause from the public 404 page.

If the configuration appears correct but the public site still fails, check GitHub Status and the repository's Pages deployment history before changing DNS or code. Multiple speculative fixes at once destroy the evidence needed to identify the failed stage.

## Keep changing facts out of the architecture

Some facts in this area are intentionally time-sensitive: plan eligibility, quotas, build timeouts, supported gems and plugins, runner images, action major versions, DNS addresses, billing, and the exact settings interface. Check them when they affect a decision.

For example, GitHub maintains a dedicated [Pages limits page](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits). Linking to that live contract is more reliable than copying today's bandwidth or build-rate values into a tutorial and presenting them as permanent constraints.

Before a new deployment or a major maintenance pass, verify this short list:

1. Pages supports the repository visibility and intended use under the current plan.
2. The selected branch or workflow is still the configured publishing source.
3. Ruby, Jekyll, plugins, Actions, and lockfiles describe one compatible build.
4. A clean local or CI build produces the artifact that was actually tested.
5. DNS values and HTTPS status match GitHub's current domain documentation.
6. Current limits fit the site's generated size, build duration, and expected traffic.

That checklist survives product redesigns because it asks where authority resides. The exact answer may change; the method for obtaining and validating it does not.

## Official references

- [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Creating a GitHub Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Set up Ruby in GitHub Actions](https://github.com/ruby/setup-ruby)
- [Jekyll documentation](https://jekyllrb.com/docs/)
- [Using Jekyll with Bundler](https://jekyllrb.com/tutorials/using-jekyll-with-bundler/)
- [Bundler getting started](https://bundler.io/guides/getting_started.html)
- [Testing a Pages site locally with Jekyll](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/testing-your-github-pages-site-locally-with-jekyll)
- [Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Securing a Pages site with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
