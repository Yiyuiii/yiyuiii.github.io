#!/usr/bin/env python3
"""Validate semantic and bilingual contracts against built Jekyll HTML."""

from __future__ import annotations

import argparse
import re
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from bs4 import BeautifulSoup


class SiteCheckError(RuntimeError):
    """The built site violates a public contract."""


REQUIRED = (
    "/",
    "/en/",
    "/projects/",
    "/en/projects/",
    "/publications/",
    "/en/publications/",
    "/about/",
    "/en/about/",
    "/archives/",
    "/feed.xml",
    "/sitemap.xml",
    "/404.html",
)
FORBIDDEN = ("/research/", "/cv/", "/playground/")
INDEX_ROUTES = {
    "/projects/",
    "/en/projects/",
    "/publications/",
    "/en/publications/",
}
EXPECTED_NAV = {
    "zh": ["随笔", "GitHub", "论文", "关于yiyuiii"],
    "en": ["Writing", "GitHub", "Papers", "About yiyuiii"],
}
GITHUB_UPDATED_AT_RE = re.compile(
    r"\b20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b"
)


def route_path(site: Path, route: str) -> Path:
    parsed = urlparse(route)
    if parsed.path == "/":
        return site / "index.html"
    relative = parsed.path.lstrip("/")
    if parsed.path.endswith("/"):
        return site / relative / "index.html"
    return site / relative


def _soup(site: Path, route: str) -> BeautifulSoup:
    path = route_path(site, route)
    if not path.is_file():
        raise SiteCheckError(f"{route}: missing built file {path}")
    return BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")


def _check_nav(soup: BeautifulSoup, *, route: str, language: str) -> None:
    html = soup.find("html")
    actual_language = (html.get("lang") if html else "") or ""
    if actual_language != language:
        raise SiteCheckError(
            f"{route}: html lang is {actual_language!r}, expected {language!r}"
        )
    nav = soup.select_one(".site-nav")
    if not nav:
        raise SiteCheckError(f"{route}: .site-nav missing")
    labels = [link.get_text(" ", strip=True) for link in nav.find_all("a")]
    if labels != EXPECTED_NAV[language]:
        raise SiteCheckError(
            f"{route}: navigation labels {labels!r}, expected {EXPECTED_NAV[language]!r}"
        )


def _check_index_shell(soup: BeautifulSoup, route: str) -> None:
    if soup.select_one(".page-header"):
        raise SiteCheckError(f"{route}: redundant page-header is present")


def _check_projects(soup: BeautifulSoup, route: str) -> None:
    entries = soup.select("article.project-entry")
    if len(entries) != 6:
        raise SiteCheckError(
            f"{route}: expected 6 project-entry articles, got {len(entries)}"
        )
    visible = soup.get_text(" ", strip=True)
    if GITHUB_UPDATED_AT_RE.search(visible):
        raise SiteCheckError(f"{route}: GitHub updated_at is visible")

    for entry in entries:
        if not entry.has_attr("data-filter-entry") or not entry.get("data-tags"):
            raise SiteCheckError(f"{route}: project entry lacks filter data")
        if entry.select("a a"):
            raise SiteCheckError(f"{route}: project entry contains a nested anchor")

        links = entry.find_all("a", href=True)
        metadata_links = entry.select("a.project-tag")
        if not metadata_links:
            raise SiteCheckError(f"{route}: project metadata filter is missing")
        for link in metadata_links:
            parsed = urlparse(link.get("href", ""))
            tags = parse_qs(parsed.query).get("tag", [])
            if (
                parsed.scheme
                or parsed.netloc
                or parsed.path != route
                or len(tags) != 1
                or not tags[0]
            ):
                raise SiteCheckError(
                    f"{route}: project metadata filter is not localized: "
                    f"{link.get('href', '')}"
                )

        external_links = [
            link
            for link in links
            if urlparse(link.get("href", "")).scheme
            or urlparse(link.get("href", "")).netloc
        ]
        main_links = entry.select("a.project-main")
        if (
            len(external_links) != 1
            or len(main_links) != 1
            or external_links[0] is not main_links[0]
        ):
            raise SiteCheckError(
                f"{route}: project entry must have exactly one GitHub repository link"
            )

        main_link = main_links[0]
        href = main_link.get("href", "")
        if not href.startswith("https://github.com/Yiyuiii/"):
            raise SiteCheckError(
                f"{route}: project link is not an allowed GitHub URL: {href}"
            )
        if (
            main_link.get("target") != "_blank"
            or "noopener" not in (main_link.get("rel") or [])
            or "noreferrer" not in (main_link.get("rel") or [])
        ):
            raise SiteCheckError(
                f"{route}: project link lacks safe external target: {href}"
            )
        if not main_link.find("h2"):
            raise SiteCheckError(f"{route}: repository link lacks a project title")
        summary = main_link.find("p")
        if not summary or not summary.get_text(" ", strip=True):
            raise SiteCheckError(f"{route}: repository link lacks a README summary")

        if len(links) != len(metadata_links) + 1:
            raise SiteCheckError(
                f"{route}: project entry contains a non-metadata secondary link"
            )


def _check_publications(soup: BeautifulSoup, route: str, language: str) -> None:
    entries = soup.select(".publication-entry")
    if len(entries) != 8:
        raise SiteCheckError(
            f"{route}: expected 8 publication entries, got {len(entries)}"
        )
    if not soup.select_one(".publication-self"):
        raise SiteCheckError(f"{route}: .publication-self is missing")
    if soup.select_one(".publication-note"):
        raise SiteCheckError(f"{route}: standalone publication note is visible")
    expected_contribution = (
        "（共同第一作者）" if language == "zh" else "(co-first author)"
    )
    contributions = soup.select(
        ".publication-authors .publication-self-entry > "
        ".publication-contribution"
    )
    if len(contributions) != 2:
        raise SiteCheckError(
            f"{route}: expected two inline self contributions, "
            f"got {len(contributions)}"
        )
    for contribution in contributions:
        wrapper = contribution.parent
        owner = wrapper.select_one(".publication-self") if wrapper else None
        if (
            owner is None
            or contribution.find_previous_sibling() is not owner
            or contribution.get_text(" ", strip=True) != expected_contribution
        ):
            raise SiteCheckError(
                f"{route}: self contribution is not inline after the owner"
            )
    visible = soup.get_text(" ", strip=True)
    if "已发表" in visible:
        raise SiteCheckError(f"{route}: published label is visible")
    if "俞俊鹏" in visible:
        raise SiteCheckError(f"{route}: translated author is visible")
    text = soup.get_text(" ", strip=True).lower()
    for forbidden in (
        "taco",
        "mambo",
        "under review",
        "under submission",
        "extended abstract",
    ):
        if forbidden in text:
            raise SiteCheckError(f"{route}: forbidden publication status {forbidden!r}")
    for entry in entries:
        if not entry.find("h2") or not entry.find("a", href=True):
            raise SiteCheckError(f"{route}: publication entry lacks title or public link")
        if language == "en":
            metadata = " ".join(
                node.get_text(" ", strip=True)
                for node in (
                    entry.find("h2"),
                    entry.select_one(".publication-authors"),
                    entry.select_one(".index-meta"),
                )
                if node
            )
            if re.search(r"[\u3400-\u9fff]", metadata):
                raise SiteCheckError(
                    f"{route}: English publication metadata contains Chinese text: "
                    f"{metadata!r}"
                )


def _check_about(soup: BeautifulSoup, route: str, language: str) -> None:
    if soup.select_one(".page-header"):
        raise SiteCheckError(f"{route}: redundant page-header is present")
    expected_label = "关于yiyuiii" if language == "zh" else "About yiyuiii"
    headings = soup.select("main h1")
    greeting = soup.select_one("h1.about-greeting")
    if (
        len(headings) != 1
        or greeting is None
        or greeting.get("aria-label") != expected_label
        or not greeting.get_text(" ", strip=True).startswith("Ciallo")
    ):
        raise SiteCheckError(
            f"{route}: accessible Ciallo heading is missing or incorrect"
        )

    profile = soup.select_one(".about-profile")
    intro = soup.select_one("#about-intro.about-intro")
    if profile is None or intro is None or intro.find(["h1", "h2"]):
        raise SiteCheckError(f"{route}: headingless profile introduction is missing")
    if profile.select_one("#about-education"):
        raise SiteCheckError(
            f"{route}: About section headings include temporarily hidden education"
        )

    expected_headings = (
        ["个人基调", "科研方向", "兴趣方向", "日常技能", "我的链接"]
        if language == "zh"
        else [
            "Personal Tastes",
            "Research Directions",
            "Interests",
            "Everyday Skills",
            "My Links",
        ]
    )
    sections = profile.select(":scope > section.about-section")
    section_headings = [
        heading.get_text(" ", strip=True)
        for section in sections
        if (heading := section.find("h2", recursive=False))
    ]
    section_ids = [section.get("id") for section in sections]
    expected_ids = [
        "about-aesthetics",
        "about-research",
        "about-interests",
        "about-skills",
        "about-links",
    ]
    if section_headings != expected_headings or section_ids != expected_ids:
        raise SiteCheckError(
            f"{route}: About section headings/order are {section_headings!r} "
            f"with ids {section_ids!r}"
        )
    for section in sections:
        heading = section.find("h2", recursive=False)
        if (
            heading is None
            or section.get("aria-labelledby") != heading.get("id")
            or heading.get("id") != f"{section.get('id')}-heading"
        ):
            raise SiteCheckError(
                f"{route}: About section heading is not accessibly associated"
            )

    count_contracts = (
        ("research", 3, "research rows"),
        ("interests", 11, "interest rows"),
        ("skills", 3, "skill rows"),
    )
    for block_id, expected_count, label in count_contracts:
        rows = soup.select(
            f"#about-{block_id} .about-detail-list > "
            f'div[id^="about-{block_id}-"]'
        )
        if len(rows) != expected_count:
            raise SiteCheckError(
                f"{route}: expected {expected_count} {label}, got {len(rows)}"
            )
        if any(
            row.find("dt", recursive=False) is None
            or row.find("dd", recursive=False) is None
            or not row.find("dd", recursive=False).get_text(" ", strip=True)
            for row in rows
        ):
            raise SiteCheckError(f"{route}: {label} lack dt/dd content")

    visible = soup.get_text(" ", strip=True)
    forbidden_profile_copy = (
        ("兴趣驱动的复杂系统的拆解者", "我目前是")
        if language == "zh"
        else ("curiosity-driven dissector", "currently a PhD student")
    )
    forbidden_private_copy = (
        "出生年月",
        "政治面貌",
        "中共党员",
        "under submission",
    )
    if any(
        phrase.lower() in visible.lower()
        for phrase in (*forbidden_profile_copy, *forbidden_private_copy)
    ):
        raise SiteCheckError(f"{route}: obsolete or inferred profile copy is visible")

    links = soup.select(".about-links a")
    if len(links) != 4:
        raise SiteCheckError(f"{route}: expected exactly 4 profile links, got {len(links)}")
    hrefs = {link.get("href") for link in links}
    expected = {
        "https://github.com/Yiyuiii",
        "mailto:yiyuiii@foxmail.com",
        "/feed.xml",
        "https://paypal.me/yiyuiii",
    }
    if hrefs != expected:
        raise SiteCheckError(f"{route}: profile links are {sorted(hrefs)!r}")
    expected_labels = (
        ["GitHub", "电子邮件", "RSS", "PayPal"]
        if language == "zh"
        else ["GitHub", "Email", "RSS", "PayPal"]
    )
    labels = [link.get_text(" ", strip=True) for link in links]
    if labels != expected_labels:
        raise SiteCheckError(
            f"{route}: profile link labels are {labels!r}, "
            f"expected {expected_labels!r}"
        )
    heading = soup.select_one(".about-links h2")
    expected_heading = "我的链接" if language == "zh" else "My Links"
    heading_text = heading.get_text(" ", strip=True) if heading else ""
    if heading_text != expected_heading:
        raise SiteCheckError(
            f"{route}: profile link heading is {heading_text!r}, "
            f"expected {expected_heading!r}"
        )


def _check_not_found(soup: BeautifulSoup) -> None:
    if soup.find("meta", attrs={"http-equiv": re.compile(r"^refresh$", re.I)}):
        raise SiteCheckError(
            "/404.html: missing pages must preserve 404 semantics instead of redirecting"
        )

    html = soup.find("html")
    if not html or html.get("data-not-found-language") != "zh":
        raise SiteCheckError(
            "/404.html: path-aware language state is missing from the document"
        )

    script = "\n".join(node.get_text(" ", strip=True) for node in soup.find_all("script"))
    if "location.pathname" not in script or "/en/" not in script:
        raise SiteCheckError(
            "/404.html: requested /en/ paths cannot select the English error page"
        )

    blocks = {
        block.get("data-language"): block
        for block in soup.select("main [data-language]")
    }
    if set(blocks) != {"zh", "en"}:
        raise SiteCheckError(
            "/404.html: expected exactly one Chinese and one English error block"
        )

    expected = {
        "zh": ("/", "页面不存在"),
        "en": ("/en/", "Page not found"),
    }
    for language, (home, heading) in expected.items():
        block = blocks[language]
        title = block.find("h1")
        link = block.find("a", href=True)
        if not title or title.get_text(" ", strip=True) != heading:
            raise SiteCheckError(
                f"/404.html: {language} error heading is missing or incorrect"
            )
        if not link or link.get("href") != home:
            raise SiteCheckError(
                f"/404.html: {language} recovery link must point to {home}"
            )


def _check_tag_order(soup: BeautifulSoup) -> None:
    for entry in soup.select(".writing-entry"):
        heading = entry.find("h2")
        if heading and heading.get_text(strip=True) == "四季物语量化分析攻略":
            tags = [tag.get_text(strip=True) for tag in entry.select(".entry-tags a")]
            if tags[:2] != ["桌游", "四季物语"]:
                raise SiteCheckError(f"/: tag order is {tags!r}, expected common tag first")
            return
    raise SiteCheckError("/: writing entry for tag order assertion is missing")


def _check_writing_entries(
    soup: BeautifulSoup,
    *,
    route: str,
    language: str,
) -> None:
    date_pattern = (
        re.compile(r"^\d{4}年\d{1,2}月\d{1,2}日$")
        if language == "zh"
        else re.compile(r"^\d{4}-\d{2}-\d{2}$")
    )
    expected_sizes = (
        "(max-width: 380px) 88px, (max-width: 640px) 109px, 134px"
    )
    for index, entry in enumerate(soup.select(".writing-entry")):
        heading = entry.find("h2")
        title = heading.get_text(" ", strip=True) if heading else "(untitled)"
        summary = entry.select_one(".entry-main > p")
        summary_text = summary.get_text(" ", strip=True) if summary else ""
        if not summary_text or len(summary_text) > 500:
            raise SiteCheckError(
                f"{route}: summary for {title!r} must be authored and at most "
                f"500 characters, got {len(summary_text)}"
            )
        time = entry.find("time")
        date_text = time.get_text(" ", strip=True) if time else ""
        if not date_pattern.fullmatch(date_text):
            raise SiteCheckError(
                f"{route}: date for {title!r} uses invalid display format "
                f"{date_text!r}"
            )
        thumbnail = entry.select_one(".entry-thumbnail img")
        if thumbnail is None:
            raise SiteCheckError(f"{route}: thumbnail for {title!r} is missing")
        source = thumbnail.get("src", "")
        candidates = [
            item.rsplit(" ", 1)
            for item in thumbnail.get("srcset", "").split(", ")
            if item
        ]
        if not source.endswith("-index-v1-160.webp"):
            raise SiteCheckError(
                f"{route}: thumbnail src for {title!r} is not the 160px derivative"
            )
        if (
            len(candidates) != 2
            or candidates[0] != [source, "160w"]
            or candidates[1][1] != "320w"
            or not candidates[1][0].endswith("-index-v1-320.webp")
            or candidates[1][0].removesuffix("-index-v1-320.webp")
            != source.removesuffix("-index-v1-160.webp")
        ):
            raise SiteCheckError(
                f"{route}: thumbnail candidates for {title!r} are invalid"
            )
        expected_attributes = {
            "sizes": expected_sizes,
            "width": "160",
            "height": "160",
            "decoding": "async",
            "loading": "eager" if index == 0 else "lazy",
        }
        for attribute, expected in expected_attributes.items():
            if thumbnail.get(attribute) != expected:
                raise SiteCheckError(
                    f"{route}: thumbnail {attribute} for {title!r} must be "
                    f"{expected!r}"
                )
        expected_priority = "high" if index == 0 else None
        if thumbnail.get("fetchpriority") != expected_priority:
            raise SiteCheckError(
                f"{route}: thumbnail priority for {title!r} is invalid"
            )


def _check_external_links(site: Path) -> None:
    urls: set[str] = set()
    for path in site.rglob("*.html"):
        soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
        urls.update(
            link["href"]
            for link in soup.find_all("a", href=True)
            if link["href"].startswith("https://")
        )
    errors = []
    for url in sorted(urls):
        request = urllib.request.Request(
            url,
            method="HEAD",
            headers={"User-Agent": "yiyuiii.github.io-site-check"},
        )
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                if response.status >= 400:
                    errors.append(f"{url}: HTTP {response.status}")
        except (urllib.error.URLError, TimeoutError) as error:
            errors.append(f"{url}: {error}")
    if errors:
        raise SiteCheckError("\n".join(errors))


def check_site(site: Path, *, external_links: bool = False) -> None:
    site = site.resolve()
    errors = []
    internal_outputs = [
        name
        for name in ("AGENTS.md", "scripts", "tests")
        if (site / name).exists()
    ]
    if internal_outputs:
        errors.append(
            "internal sources are public: " + ", ".join(internal_outputs)
        )
    for route in REQUIRED:
        if not route_path(site, route).is_file():
            errors.append(f"{route}: required route is missing")
    for route in FORBIDDEN:
        if route_path(site, route).exists():
            errors.append(f"{route}: route must remain unpublished")
    if errors:
        raise SiteCheckError("\n".join(errors))

    zh_routes = ("/", "/projects/", "/publications/", "/about/", "/archives/")
    en_routes = ("/en/", "/en/projects/", "/en/publications/", "/en/about/")
    for route in zh_routes:
        _check_nav(_soup(site, route), route=route, language="zh")
    for route in en_routes:
        _check_nav(_soup(site, route), route=route, language="en")
    for route in INDEX_ROUTES:
        _check_index_shell(_soup(site, route), route)

    _check_projects(_soup(site, "/projects/"), "/projects/")
    _check_projects(_soup(site, "/en/projects/"), "/en/projects/")
    _check_publications(_soup(site, "/publications/"), "/publications/", "zh")
    _check_publications(
        _soup(site, "/en/publications/"),
        "/en/publications/",
        "en",
    )
    _check_about(_soup(site, "/about/"), "/about/", "zh")
    _check_about(_soup(site, "/en/about/"), "/en/about/", "en")
    _check_not_found(_soup(site, "/404.html"))
    zh_writing = _soup(site, "/")
    en_writing = _soup(site, "/en/")
    _check_tag_order(zh_writing)
    _check_writing_entries(zh_writing, route="/", language="zh")
    _check_writing_entries(en_writing, route="/en/", language="en")

    css_files = list((site / "assets" / "css").glob("main*.css"))
    if css_files:
        css = "\n".join(path.read_text(encoding="utf-8") for path in css_files)
        if "line-clamp" in css:
            raise SiteCheckError("assets/css: summary clipping rule is forbidden")

    if external_links:
        _check_external_links(site)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", type=Path, required=True)
    parser.add_argument("--external-links", action="store_true")
    args = parser.parse_args(argv)
    check_site(args.site, external_links=args.external_links)
    print("Built site contracts verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
