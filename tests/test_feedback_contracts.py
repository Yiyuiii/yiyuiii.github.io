from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def text(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_issue_form_is_bilingual_structured_and_requires_public_confirmation():
    form = yaml.safe_load(text(".github/ISSUE_TEMPLATE/page-feedback.yml"))

    assert "页面反馈" in form["name"] and "Page feedback" in form["name"]
    assert "页面反馈" in form["description"] or "Report" in form["description"]
    assert "labels" not in form and "assignees" not in form and "projects" not in form

    fields = {item.get("id"): item for item in form["body"] if item.get("id")}
    assert set(fields) == {
        "page_url",
        "feedback_type",
        "problem",
        "suggestion",
        "evidence",
        "public_notice",
    }
    for field_id in ("page_url", "feedback_type", "problem"):
        assert fields[field_id]["validations"]["required"] is True
    assert fields["public_notice"]["type"] == "checkboxes"
    assert fields["public_notice"]["attributes"]["options"][0]["required"] is True
    assert "私人信息" in fields["public_notice"]["attributes"]["options"][0]["label"]
    assert "private information" in fields["public_notice"]["attributes"]["options"][0]["label"]


def test_feedback_copy_is_complete_and_parallel_in_both_languages():
    data = yaml.safe_load(text("_data/site_text.yml"))
    zh = data["zh"]["feedback"]
    en = data["en"]["feedback"]

    assert zh.keys() == en.keys()
    assert set(zh) == {
        "heading",
        "prompt",
        "public_link",
        "private_link",
        "privacy_note",
        "page_issue_prefix",
        "post_issue_prefix",
        "email_subject",
        "email_body",
    }
    assert "公开" in zh["privacy_note"] and "public" in en["privacy_note"]
    assert "私人信息" in zh["privacy_note"] and "private information" in en["privacy_note"]
    for copy in (zh, en):
        assert "{title}" in copy["email_subject"]
        assert "{url}" in copy["email_body"]


def test_feedback_include_is_static_private_by_default_and_prefills_context():
    include = text("_includes/page-feedback.liquid")

    assert include.count("data-page-feedback") == 1
    assert "site.data.site_text[feedback_lang].feedback" in include
    assert "page.canonical_url | default: page.url" in include
    assert "| absolute_url" in include
    assert "page.collection == 'posts'" in include
    assert "post_issue_prefix" in include and "page_issue_prefix" in include
    assert "issues/new?template=page-feedback.yml" in include
    assert "title={{ issue_title }}" in include
    assert "page_url={{ issue_page_url }}" in include
    assert "feedback_url | url_encode" in include
    assert "mailto:yiyuiii@foxmail.com?subject=" in include
    assert "body={{ email_body }}" in include
    assert 'rel="external nofollow noopener noreferrer"' in include
    assert 'referrerpolicy="no-referrer"' in include
    assert 'aria-labelledby="{{ heading_id }}"' in include

    lowered = include.lower()
    for forbidden in (
        "<script",
        "<iframe",
        "<form",
        "fetch(",
        "xmlhttprequest",
        "sendbeacon",
        "document.cookie",
        "localstorage",
        "sessionstorage",
    ):
        assert forbidden not in lowered


def test_default_layout_renders_feedback_once_and_excludes_redirects():
    layout = text("_layouts/default.liquid")

    assert layout.count("include page-feedback.liquid") == 1
    assert "{% unless page.redirect %}" in layout
    assert layout.index("{{ content }}") < layout.index("include page-feedback.liquid")
    assert layout.index("include page-feedback.liquid") < layout.index("include footer.liquid")


def test_not_found_layout_localizes_both_feedback_variants_with_unique_ids():
    layout = text("_layouts/not-found.liquid")

    assert layout.count("include page-feedback.liquid") == 2
    assert "lang='zh'" in layout and "lang='en'" in layout
    assert "site.data.site_text.zh.not_found.title" in layout
    assert "site.data.site_text.en.not_found.title" in layout
    assert layout.count("page_url='/404.html'") == 2
    include = text("_includes/page-feedback.liquid")
    assert "page-feedback-title-{{ feedback_lang }}" in include
