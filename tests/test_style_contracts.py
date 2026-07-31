from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CSS = (ROOT / "assets" / "css" / "main.scss").read_text(encoding="utf-8")


def test_approved_pearl_amethyst_jade_palette_is_present():
    for declaration in (
        "--page: #f6f6f3",
        "--ink: #202521",
        "--body: #3d443f",
        "--muted: #69716c",
        "--meta: #6b726c",
        "--amethyst: #665996",
        "--jade: #337a70",
        "--divider: #c9c9ce",
    ):
        assert declaration in CSS


def test_single_column_responsive_primitives_are_used():
    assert "minmax(0, 1fr)" in CSS
    assert "aspect-ratio: 1" in CSS
    assert "clamp(" in CSS
    assert "min(" in CSS
    assert "@media (max-width: 640px)" in CSS
    assert "max-width: 72ch" in CSS
    assert "overflow-x: clip" in CSS


def test_accessibility_states_and_motion_preference_are_explicit():
    assert ":focus-visible" in CSS
    assert "prefers-reduced-motion: reduce" in CSS
    assert "outline:" in CSS
    assert "scroll-behavior: auto" in CSS


def test_profile_uses_a_quieter_highlighted_greeting():
    greeting_styles = CSS[
        CSS.index(".about-greeting") : CSS.index(".about-section")
    ]

    assert "font-size: clamp(1.8rem, 4.2vw, 2.8rem)" in greeting_styles
    assert "font-weight: 660" in greeting_styles
    assert "background-image: linear-gradient(" in greeting_styles
    assert "background-size: 100% 0.34em" in greeting_styles
    assert "overflow-wrap: anywhere" in greeting_styles
    assert "font-size: clamp(2.15rem, 8vw, 4.9rem)" not in CSS


def test_profile_sections_use_label_rule_content_in_one_column():
    assert ".about-section > h2" in CSS
    assert ".about-section > h2::after" in CSS
    heading_styles = CSS[
        CSS.index(".about-section > h2") : CSS.index(".about-education")
    ]
    assert "display: flex" in heading_styles
    assert "height: 1px" in heading_styles
    assert "background: var(--divider)" in heading_styles

    education_start = CSS.index(".about-education {")
    education_styles = CSS[
        education_start : CSS.index(".about-detail-list {", education_start)
    ]
    assert ".about-education > div" in education_styles
    assert "display: grid" in education_styles
    assert "grid-template-columns: 6.75rem minmax(0, 1fr)" in education_styles
    assert ".about-education__details" in education_styles

    detail_start = CSS.index(".about-detail-list {")
    detail_styles = CSS[detail_start : CSS.index(".about-links", detail_start)]
    assert ".about-detail-list > div" in detail_styles
    assert "grid-template-columns: minmax(8.5rem, 11rem) minmax(0, 1fr)" in detail_styles
    assert "display: grid" in detail_styles

    link_styles = CSS[CSS.index(".about-links") : CSS.index(".writing-archive")]
    assert "border-top: 0" in link_styles
    assert ".about-links a:focus-visible" in link_styles


def test_profile_stacks_internal_fields_at_the_approved_640px_breakpoint():
    mobile = CSS[CSS.index("@media (max-width: 640px)") :]

    assert ".about-detail-list > div" in mobile
    assert "grid-template-columns: minmax(0, 1fr)" in mobile
    assert ".about-education__time" in mobile
    assert "grid-column: 1 / -1" in mobile
    assert ".about-education__details" in mobile


def test_obsolete_profile_tags_and_clipping_are_absent():
    about_styles = CSS[CSS.index(".about-greeting") : CSS.index(".writing-archive")]

    for obsolete in (
        ".about-timeline",
        ".about-tag-list",
        ".about-section--compact",
        "line-clamp",
        "overflow: hidden",
        "max-height:",
    ):
        assert obsolete not in about_styles


def test_project_metadata_filters_and_repository_body_have_distinct_styles():
    assert ".project-tag" in CSS
    assert ".project-main" in CSS
    assert ".project-main:hover h2" in CSS
    assert ".project-main > p" in CSS


def test_publication_recognition_is_a_quiet_metadata_link():
    start = CSS.index(".publication-recognition")
    styles = CSS[start : CSS.index(".publication-authors", start)]

    assert "color: var(--jade)" in styles
    assert "text-decoration: none" in styles
    assert ".publication-recognition:hover" in styles
    assert "text-decoration: underline" in styles
    assert "border" not in styles
    assert "background" not in styles


def test_publication_contribution_is_quiet_inline_metadata():
    start = CSS.index(".publication-self-entry")
    styles = CSS[start : CSS.index(".publication-links", start)]

    assert "white-space: nowrap" in styles
    assert ".publication-contribution" in styles
    assert "color: var(--meta)" in styles
    assert "font-size: 0.88em" in styles
    assert "background" not in styles
    assert "border" not in styles
    assert ".publication-note" not in CSS


def test_article_keeps_centered_reading_width_with_a_readable_left_sticky_navigation():
    article = CSS[CSS.index(".article-shell") : CSS.index(".about-greeting")]
    desktop = article[article.index("@media (min-width: 1180px)") :]
    side = desktop[
        desktop.index(".article-side-toc") :
        desktop.index(".article-side-toc nav")
    ]
    side_nav = desktop[
        desktop.index(".article-side-toc nav") :
        desktop.index(".article-section-trigger")
    ]

    assert ".article-column" in article
    assert "max-width: 72ch" in article
    assert "@media (min-width: 1180px)" in CSS
    assert "grid-template-columns: minmax(0, 1fr) minmax(0, 72ch) minmax(0, 1fr)" in CSS
    assert "max-width: calc(72ch + 32rem)" in article
    assert ".article-side-toc" in article
    assert "grid-column: 1" in side
    assert "grid-row: 1" in side
    assert "align-self: start" in side
    assert "position: sticky" in side
    assert "max-height: calc(100vh - 3rem)" in side
    assert "overflow-y: auto" in side
    assert "border-right: 1px solid var(--divider)" in side
    assert "position: sticky" not in side_nav
    assert "font-size: 0.86rem" in side_nav
    assert "font-size: 0.8rem" in side_nav
    assert ".toc-h3" in article
    assert 'a[aria-current="location"]' in article
    assert ".article-toc" not in article


def test_page_root_clips_horizontal_overflow_without_becoming_a_scroll_container():
    root = CSS[CSS.index("html {") : CSS.index("a {")]

    assert root.count("overflow-x: clip") == 2
    assert "overflow-x: hidden" not in root


def test_article_mobile_sections_use_a_native_dialog_not_an_inline_panel():
    article = CSS[CSS.index(".article-shell") : CSS.index(".about-greeting")]

    assert ".article-section-trigger" in article
    assert "position: fixed" in article
    assert "env(safe-area-inset-bottom)" in article
    assert ".article-section-dialog" in article
    assert ".article-section-dialog::backdrop" in article
    assert ".article-section-dialog[open]" in article


def test_article_history_preserves_marker_space_and_uses_a_compact_focus_ring():
    article = CSS[CSS.index(".article-shell") : CSS.index(".about-greeting")]

    assert "max-width: calc(100% - 1.25rem)" in article
    assert ".article-history summary:focus-visible" in article
    assert ".article-history summary:focus-visible .article-history__summary" in article
    assert "outline: none" in article
    assert "outline: 3px solid" in article


def test_article_evidence_is_quieter_than_prose_and_distinct_from_quotations():
    article = CSS[CSS.index(".article-shell") : CSS.index(".about-greeting")]

    assert ".post-content blockquote:not(.article-evidence)" in article
    assert ".post-content blockquote.article-evidence" in article
    evidence = article[
        article.index(".post-content blockquote.article-evidence") :
    ]
    assert "font-size: 16px" in evidence
    assert "border-left: 2px solid" in evidence
    assert "background: transparent" in evidence
    assert "color: var(--muted)" in evidence
    assert "font-size: 1.2rem" not in article
    assert "border-left: 5px" not in article


def test_rejected_visual_patterns_are_absent():
    lowered = CSS.lower()
    for forbidden in (
        "line-clamp",
        "interest-grid",
        "writing-grid",
        "home-intro",
        "hero-links",
        "text-shadow",
        "manrope",
        "noto sans",
    ):
        assert forbidden not in lowered
    assert 'html[data-theme="dark"]' not in lowered
