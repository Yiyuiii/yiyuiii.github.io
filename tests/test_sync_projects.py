import base64
import json
from pathlib import Path

import pytest
import yaml

from scripts import sync_projects as sync_projects_module
from scripts.sync_projects import (
    GitHubResponse,
    PublicRepositoryError,
    RateLimitError,
    StaleProjectCacheError,
    extract_description,
    merge_runtime,
    request_json,
    sync_records,
    validate_repository,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "github"


def load_json(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def response(status, payload, headers=None):
    body = payload if isinstance(payload, str) else json.dumps(payload)
    return GitHubResponse(status=status, body=body.encode(), headers=headers or {})


class SequenceTransport:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def __call__(self, url, headers):
        self.calls.append((url, headers))
        if not self.responses:
            raise AssertionError("unexpected request")
        item = self.responses.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def test_extracts_first_meaningful_paragraph_after_language_switch():
    markdown = (FIXTURES / "readme-language-links.md").read_text(encoding="utf-8")

    assert extract_description(markdown) == "一个忠于仓库原文的项目描述。"


def test_extracts_plain_text_without_badges_or_markdown_markup():
    markdown = (FIXTURES / "readme-description.md").read_text(encoding="utf-8")

    assert (
        extract_description(markdown)
        == "A faithful repository description with small formatting details."
    )


def test_skips_single_unlinked_language_switch_and_uses_description():
    markdown = """# Voice chat

[中文介绍](README.zh.md) | English

A simple voice-to-voice LLM chat repo.
"""

    assert extract_description(markdown) == "A simple voice-to-voice LLM chat repo."


def test_prefers_real_description_over_paper_citation_blockquote():
    markdown = """# TACO

Official code repository for the paper:

> **TACO: A Paper Title**
> Yiyu Chen, Coauthor
> Nanjing University

TACO extends an optimization framework with active cross-task transfer.
"""

    assert (
        extract_description(markdown)
        == "TACO extends an optimization framework with active cross-task transfer."
    )


@pytest.mark.parametrize(
    ("changes", "message"),
    [
        ({"private": True, "visibility": "private"}, "not public"),
        ({"disabled": True}, "disabled"),
    ],
)
def test_ineligible_repository_is_rejected(changes, message):
    metadata = load_json("repo-public.json") | changes

    with pytest.raises(PublicRepositoryError, match=message):
        validate_repository(metadata)


def test_archived_public_repository_remains_eligible():
    metadata = load_json("repo-public.json")

    validate_repository(metadata)


def test_runtime_uses_api_stats_not_cache():
    cache_item = {
        "repository": "Yiyuiii/example",
        "source": {
            "locale": "en",
            "path": "README.md",
            "object_id": "abc123",
            "description": "Source description.",
        },
        "translations": {
            "zh": {
                "source_object_id": "abc123",
                "status": "current",
                "description": "中文描述。",
            }
        },
    }

    runtime = merge_runtime(cache_item, load_json("repo-public.json"))

    assert runtime["stars"] == 7
    assert runtime["forks"] == 2
    assert runtime["updated_at"] == "2026-01-02T03:04:05Z"
    assert runtime["language"] == "Python"
    assert runtime["license"] == "MIT"
    assert "order" not in runtime
    assert runtime["descriptions"] == {
        "en": "Source description.",
        "zh": "中文描述。",
    }


def test_runtime_rejects_missing_or_invalid_updated_at():
    cache_item = {
        "repository": "Yiyuiii/example",
        "source": {
            "locale": "en",
            "path": "README.md",
            "object_id": "abc123",
            "description": "Source description.",
        },
    }
    metadata = load_json("repo-public.json")

    with pytest.raises(PublicRepositoryError, match="updated_at"):
        merge_runtime(cache_item, metadata | {"updated_at": None})
    with pytest.raises(PublicRepositoryError, match="updated_at"):
        merge_runtime(cache_item, metadata | {"updated_at": "not-a-date"})
    with pytest.raises(PublicRepositoryError, match="no timezone"):
        merge_runtime(cache_item, metadata | {"updated_at": "2026-01-02T03:04:05"})


def test_runtime_projects_sort_by_stars_then_update_then_repository():
    assert hasattr(sync_projects_module, "sort_runtime_projects")
    projects = [
        {
            "repository": "Yiyuiii/zeta",
            "stars": 1,
            "updated_at": "2026-01-02T00:00:00Z",
        },
        {
            "repository": "Yiyuiii/alpha",
            "stars": 3,
            "updated_at": "2025-01-01T00:00:00Z",
        },
        {
            "repository": "Yiyuiii/beta",
            "stars": 1,
            "updated_at": "2026-02-01T00:00:00Z",
        },
        {
            "repository": "Yiyuiii/alpha-2",
            "stars": 1,
            "updated_at": "2026-01-02T00:00:00Z",
        },
    ]

    ordered = sync_projects_module.sort_runtime_projects(projects)

    assert [item["repository"] for item in ordered] == [
        "Yiyuiii/alpha",
        "Yiyuiii/beta",
        "Yiyuiii/alpha-2",
        "Yiyuiii/zeta",
    ]


def test_rate_limit_failure_exposes_remaining_and_reset():
    transport = SequenceTransport(
        [
            response(
                403,
                {"message": "API rate limit exceeded"},
                {"X-RateLimit-Remaining": "0", "X-RateLimit-Reset": "123456"},
            )
        ]
        * 3
    )

    with pytest.raises(
        RateLimitError, match=r"remaining=0.*reset=123456"
    ):
        request_json(
            "https://api.github.test/repos/Yiyuiii/example",
            transport=transport,
            retries=3,
            sleep=lambda _: None,
        )

    assert len(transport.calls) == 3


def test_retry_exhaustion_covers_invalid_json_and_server_error():
    transport = SequenceTransport(
        [
            response(500, {"message": "temporary"}),
            response(200, "{broken"),
            response(502, {"message": "still temporary"}),
        ]
    )

    with pytest.raises(PublicRepositoryError, match="after 3 attempts"):
        request_json(
            "https://api.github.test/repos/Yiyuiii/example",
            transport=transport,
            retries=3,
            sleep=lambda _: None,
        )


def test_404_is_not_retried():
    transport = SequenceTransport([response(404, {"message": "Not Found"})])

    with pytest.raises(PublicRepositoryError, match="HTTP 404"):
        request_json(
            "https://api.github.test/repos/Yiyuiii/missing",
            transport=transport,
            sleep=lambda _: None,
        )

    assert len(transport.calls) == 1


def test_sync_rejects_object_id_mismatch_and_stale_translation():
    allowlist = [
        {
            "repository": "Yiyuiii/example",
            "order": 10,
            "primary_locale": "en",
            "readmes": {"en": "README.md"},
        }
    ]
    cache = [
        {
            "repository": "Yiyuiii/example",
            "source": {
                "locale": "en",
                "path": "README.md",
                "object_id": "old-object",
                "description": "Old description.",
            },
            "translations": {
                "zh": {
                    "source_object_id": "old-object",
                    "status": "current",
                    "description": "旧描述。",
                }
            },
        }
    ]
    readme = {
        "type": "file",
        "sha": "new-object",
        "content": base64.b64encode(b"# Example\n\nNew description.").decode(),
        "encoding": "base64",
    }
    transport = SequenceTransport(
        [response(200, load_json("repo-public.json")), response(200, readme)]
    )

    with pytest.raises(StaleProjectCacheError, match="old-object.*new-object"):
        sync_records(allowlist, cache, transport=transport)


def test_update_cache_records_new_object_and_marks_translation_stale():
    allowlist = [
        {
            "repository": "Yiyuiii/example",
            "order": 10,
            "primary_locale": "en",
            "readmes": {"en": "README.md"},
        }
    ]
    cache = [
        {
            "repository": "Yiyuiii/example",
            "source": {
                "locale": "en",
                "path": "README.md",
                "object_id": "old-object",
                "description": "Old description.",
            },
            "translations": {
                "zh": {
                    "source_object_id": "old-object",
                    "status": "current",
                    "description": "旧描述。",
                }
            },
        }
    ]
    readme = {
        "type": "file",
        "sha": "new-object",
        "content": base64.b64encode(b"# Example\n\nNew description.").decode(),
        "encoding": "base64",
    }
    transport = SequenceTransport(
        [response(200, load_json("repo-public.json")), response(200, readme)]
    )

    runtime, updated = sync_records(
        allowlist, cache, transport=transport, update_cache=True
    )

    assert runtime[0]["descriptions"] == {"en": "New description."}
    assert updated[0]["source"]["object_id"] == "new-object"
    assert updated[0]["translations"]["zh"]["status"] == "stale"
    assert updated[0]["translations"]["zh"]["source_object_id"] == "old-object"


def test_production_mode_fails_on_stale_cache(tmp_path):
    cache = [
        {
            "repository": "Yiyuiii/example",
            "source": {
                "locale": "en",
                "path": "README.md",
                "object_id": "abc123",
                "description": "Source description.",
            },
            "translations": {
                "zh": {
                    "source_object_id": "abc123",
                    "status": "stale",
                    "description": "旧描述。",
                }
            },
        }
    ]

    with pytest.raises(StaleProjectCacheError, match="stale translation"):
        merge_runtime(cache[0], load_json("repo-public.json"), production=True)


def test_allowlist_fixture_round_trips_as_yaml():
    fixture = yaml.safe_load(
        """
        - repository: Yiyuiii/example
          primary_locale: en
          readmes: {en: README.md}
        """
    )

    assert fixture[0]["readmes"]["en"] == "README.md"
    assert "order" not in fixture[0]
