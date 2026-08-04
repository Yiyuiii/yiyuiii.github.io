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
    extract_repository_description,
    merge_runtime,
    repository_description_hash,
    request_json,
    sync_records,
    validate_created_marker,
    validate_repository,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "tests" / "fixtures" / "github"


def load_json(name):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def response(status, payload, headers=None):
    body = payload if isinstance(payload, str) else json.dumps(payload)
    return GitHubResponse(status=status, body=body.encode(), headers=headers or {})


def description_source(description="Source description.", locale="en"):
    return {
        "locale": locale,
        "field": "description",
        "source_url": "https://api.github.com/repos/Yiyuiii/example",
        "content_hash": repository_description_hash(description),
        "description": description,
    }


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


def test_extracts_authored_github_description_and_normalizes_whitespace():
    metadata = {"description": "  A focused project\n description.  "}

    assert extract_repository_description(metadata) == "A focused project description."


@pytest.mark.parametrize("description", [None, "", "   "])
def test_repository_description_is_required(description):
    with pytest.raises(PublicRepositoryError, match="description is missing"):
        extract_repository_description({"description": description})


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


def test_project_created_marker_is_verified_from_created_at_in_hong_kong():
    config = {
        "repository": "Yiyuiii/example",
        "created": {
            "date": "2024-06-04",
            "precision": "day",
            "source_url": "https://api.github.com/repos/Yiyuiii/example",
            "source_field": "created_at",
        },
    }
    metadata = load_json("repo-public.json")

    validate_created_marker(config, metadata)

    with pytest.raises(PublicRepositoryError, match="does not match created_at"):
        validate_created_marker(
            config | {"created": config["created"] | {"date": "2024-06-03"}},
            metadata,
        )


def test_project_created_marker_rejects_unverifiable_source_or_precision():
    metadata = load_json("repo-public.json")
    base = {
        "repository": "Yiyuiii/example",
        "created": {
            "date": "2024-06-04",
            "precision": "day",
            "source_url": "https://api.github.com/repos/Yiyuiii/example",
            "source_field": "created_at",
        },
    }

    with pytest.raises(PublicRepositoryError, match="precision must be day"):
        validate_created_marker(
            base | {"created": base["created"] | {"precision": "year"}},
            metadata,
        )
    with pytest.raises(PublicRepositoryError, match="API created_at"):
        validate_created_marker(
            base
            | {
                "created": base["created"]
                | {"source_field": "updated_at"}
            },
            metadata,
        )


def test_runtime_uses_api_stats_not_cache():
    cache_item = {
        "repository": "Yiyuiii/example",
        "source": description_source(),
        "translations": {
            "zh": {
                "source_hash": repository_description_hash("Source description."),
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
        "source": description_source(),
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


def test_sync_rejects_description_hash_mismatch_and_stale_translation():
    allowlist = [
        {
            "repository": "Yiyuiii/example",
            "primary_locale": "en",
        }
    ]
    old_hash = repository_description_hash("Old description.")
    new_hash = repository_description_hash("New description.")
    cache = [
        {
            "repository": "Yiyuiii/example",
            "source": description_source("Old description."),
            "translations": {
                "zh": {
                    "source_hash": old_hash,
                    "status": "current",
                    "description": "旧描述。",
                }
            },
        }
    ]
    metadata = load_json("repo-public.json") | {"description": "New description."}
    transport = SequenceTransport([response(200, metadata)])

    with pytest.raises(StaleProjectCacheError, match=f"{old_hash}.*{new_hash}"):
        sync_records(allowlist, cache, transport=transport)


def test_update_cache_records_new_object_and_marks_translation_stale():
    allowlist = [
        {
            "repository": "Yiyuiii/example",
            "primary_locale": "en",
        }
    ]
    old_hash = repository_description_hash("Old description.")
    new_hash = repository_description_hash("New description.")
    cache = [
        {
            "repository": "Yiyuiii/example",
            "source": description_source("Old description."),
            "translations": {
                "zh": {
                    "source_hash": old_hash,
                    "status": "current",
                    "description": "旧描述。",
                }
            },
        }
    ]
    metadata = load_json("repo-public.json") | {"description": "New description."}
    transport = SequenceTransport([response(200, metadata)])

    runtime, updated = sync_records(
        allowlist, cache, transport=transport, update_cache=True
    )

    assert runtime[0]["descriptions"] == {"en": "New description."}
    assert updated[0]["source"]["content_hash"] == new_hash
    assert updated[0]["translations"]["zh"]["status"] == "stale"
    assert updated[0]["translations"]["zh"]["source_hash"] == old_hash


def test_production_mode_fails_on_stale_cache(tmp_path):
    cache = [
        {
            "repository": "Yiyuiii/example",
            "source": description_source(),
            "translations": {
                "zh": {
                    "source_hash": repository_description_hash("Source description."),
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
        """
    )

    assert fixture[0]["primary_locale"] == "en"
    assert "readmes" not in fixture[0]
    assert "order" not in fixture[0]
