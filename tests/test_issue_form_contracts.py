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
    notice = fields["public_notice"]["attributes"]["options"][0]["label"]
    assert "私人信息" in notice and "private information" in notice
