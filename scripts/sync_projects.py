#!/usr/bin/env python3
"""Verify the public project allowlist and build fresh Jekyll runtime data."""

from __future__ import annotations

import argparse
import base64
import json
import os
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable, Mapping
from zoneinfo import ZoneInfo

import yaml
from markdown_it import MarkdownIt


ROOT = Path(__file__).resolve().parents[1]
API_ROOT = "https://api.github.com"
ALLOWLIST_PATH = ROOT / "_data" / "project_repositories.yml"
CACHE_PATH = ROOT / "_data" / "project_cache.yml"
RUNTIME_PATH = ROOT / "_data" / "project_runtime.yml"
RETRYABLE_STATUS = {403, 429, 500, 502, 503, 504}
HONG_KONG = ZoneInfo("Asia/Hong_Kong")
FIRST_PUBLIC_KEYS = {"date", "precision", "source_url", "source_field"}
Transport = Callable[[str, Mapping[str, str]], "GitHubResponse"]


class PublicRepositoryError(RuntimeError):
    """The configured public repository cannot be safely rendered."""


class RateLimitError(PublicRepositoryError):
    """GitHub rejected the request because the current rate limit is exhausted."""


class StaleProjectCacheError(PublicRepositoryError):
    """The committed README-derived content no longer matches GitHub."""


@dataclass(frozen=True)
class GitHubResponse:
    status: int
    body: bytes
    headers: Mapping[str, str]


def _header(headers: Mapping[str, str], name: str) -> str | None:
    expected = name.lower()
    for key, value in headers.items():
        if key.lower() == expected:
            return str(value)
    return None


def default_transport(url: str, headers: Mapping[str, str]) -> GitHubResponse:
    request = urllib.request.Request(url, headers=dict(headers))
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return GitHubResponse(
                status=response.status,
                body=response.read(),
                headers=dict(response.headers.items()),
            )
    except urllib.error.HTTPError as error:
        return GitHubResponse(
            status=error.code,
            body=error.read(),
            headers=dict(error.headers.items()) if error.headers else {},
        )


def _request_headers(token: str | None = None) -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "yiyuiii.github.io-project-sync",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def request_json(
    url: str,
    *,
    token: str | None = None,
    transport: Transport = default_transport,
    retries: int = 3,
    sleep: Callable[[float], None] = time.sleep,
) -> dict:
    """Return JSON with bounded retries and an authenticated-public fallback."""

    last_problem = "unknown failure"
    rate_headers: tuple[str | None, str | None] | None = None

    for attempt in range(retries):
        try:
            response = transport(url, _request_headers(token))
            remaining = _header(response.headers, "X-RateLimit-Remaining")
            reset = _header(response.headers, "X-RateLimit-Reset")

            if (
                token
                and response.status in {401, 403}
                and remaining not in {"0", 0}
            ):
                response = transport(url, _request_headers())
                remaining = _header(response.headers, "X-RateLimit-Remaining")
                reset = _header(response.headers, "X-RateLimit-Reset")

            if 200 <= response.status < 300:
                try:
                    value = json.loads(response.body.decode("utf-8"))
                except (UnicodeDecodeError, json.JSONDecodeError) as error:
                    last_problem = f"invalid JSON: {error}"
                else:
                    if not isinstance(value, dict):
                        raise PublicRepositoryError(
                            f"GitHub returned non-object JSON for {url}"
                        )
                    return value
            elif response.status == 404:
                raise PublicRepositoryError(f"GitHub returned HTTP 404 for {url}")
            elif response.status in RETRYABLE_STATUS:
                last_problem = f"HTTP {response.status}"
                if remaining == "0":
                    rate_headers = (remaining, reset)
            else:
                detail = response.body.decode("utf-8", errors="replace")[:300]
                raise PublicRepositoryError(
                    f"GitHub returned HTTP {response.status} for {url}: {detail}"
                )
        except (TimeoutError, socket.timeout, urllib.error.URLError) as error:
            last_problem = f"network failure: {error}"

        if attempt + 1 < retries:
            sleep(min(2**attempt, 4))

    if rate_headers:
        remaining, reset = rate_headers
        raise RateLimitError(
            f"GitHub rate limit exhausted after {retries} attempts "
            f"(remaining={remaining}, reset={reset})"
        )
    raise PublicRepositoryError(
        f"GitHub request failed after {retries} attempts for {url}: {last_problem}"
    )


def _inline_text(token) -> tuple[str, int, int]:
    parts: list[str] = []
    link_count = 0
    image_count = 0
    for child in token.children or []:
        if child.type == "link_open":
            link_count += 1
        elif child.type == "image":
            image_count += 1
        elif child.type in {"text", "code_inline", "softbreak", "hardbreak"}:
            parts.append(" " if "break" in child.type else child.content)
    return " ".join("".join(parts).split()), link_count, image_count


def _is_language_switch(text: str, link_count: int) -> bool:
    if link_count == 0:
        return False
    simplified = text.lower()
    for separator in ("|", "·", "/", "•", "—", "-"):
        simplified = simplified.replace(separator, " ")
    words = set(simplified.split())
    language_words = {
        "english",
        "chinese",
        "简体中文",
        "繁體中文",
        "中文",
        "中文介绍",
        "英文介绍",
        "en",
        "zh",
        "readme",
    }
    return bool(words) and words <= language_words


def extract_description(markdown: str) -> str:
    """Extract the first meaningful top-level README paragraph as plain text."""

    tokens = MarkdownIt("commonmark").parse(markdown)
    blockquote_depth = 0
    top_level_candidates: list[str] = []
    fallback_candidates: list[str] = []
    for index, token in enumerate(tokens):
        if token.type == "blockquote_open":
            blockquote_depth += 1
        elif token.type == "blockquote_close":
            blockquote_depth -= 1
        elif token.type == "paragraph_open":
            inline = next(
                (
                    candidate
                    for candidate in tokens[index + 1 :]
                    if candidate.type in {"inline", "paragraph_close"}
                ),
                None,
            )
            if inline is None or inline.type != "inline":
                continue
            text, links, images = _inline_text(inline)
            if not text or (images and not text.strip()):
                continue
            if _is_language_switch(text, links):
                continue
            if text.lower() in {"table of contents", "contents", "目录"}:
                continue
            if text.lower().startswith("official code repository for"):
                continue
            if blockquote_depth:
                fallback_candidates.append(text)
            else:
                top_level_candidates.append(text)
    if top_level_candidates:
        return top_level_candidates[0]
    if fallback_candidates:
        return fallback_candidates[0]
    raise PublicRepositoryError("README has no meaningful description paragraph")


def validate_repository(metadata: Mapping) -> None:
    if metadata.get("private") or metadata.get("visibility") != "public":
        raise PublicRepositoryError("repository is not public")
    if metadata.get("disabled"):
        raise PublicRepositoryError("repository is disabled")


def _valid_translations(
    cache_item: Mapping, *, production: bool
) -> dict[str, str]:
    source = cache_item["source"]
    descriptions = {source["locale"]: source["description"]}
    for locale, translation in (cache_item.get("translations") or {}).items():
        if translation.get("status") != "current":
            if production:
                raise StaleProjectCacheError(
                    f"{cache_item['repository']} has stale translation {locale}"
                )
            continue
        if translation.get("source_object_id") != source["object_id"]:
            raise StaleProjectCacheError(
                f"{cache_item['repository']} translation {locale} references "
                f"{translation.get('source_object_id')}, expected {source['object_id']}"
            )
        descriptions[locale] = translation["description"]
    return descriptions


def _parse_github_timestamp(value, field: str) -> datetime:
    if not isinstance(value, str) or not value:
        raise PublicRepositoryError(f"repository {field} is missing")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise PublicRepositoryError(
            f"repository {field} is invalid: {value}"
        ) from error
    if parsed.tzinfo is None:
        raise PublicRepositoryError(
            f"repository {field} has no timezone: {value}"
        )
    return parsed


def _parse_updated_at(value) -> datetime:
    return _parse_github_timestamp(value, "updated_at")


def validate_first_public(config: Mapping, metadata: Mapping) -> None:
    """Verify a committed first-public marker against GitHub created_at."""

    record = config.get("first_public")
    if record is None:
        return
    if not isinstance(record, Mapping) or set(record) != FIRST_PUBLIC_KEYS:
        raise PublicRepositoryError(
            "repository first_public must contain exactly "
            + ", ".join(sorted(FIRST_PUBLIC_KEYS))
        )

    repository = config["repository"]
    expected_url = f"{API_ROOT}/repos/{repository}"
    if record.get("precision") != "day":
        raise PublicRepositoryError("GitHub repository first_public precision must be day")
    if record.get("source_url") != expected_url or record.get("source_field") != "created_at":
        raise PublicRepositoryError(
            "GitHub repository first_public source must be its API created_at"
        )

    created_at = _parse_github_timestamp(metadata.get("created_at"), "created_at")
    expected_date = created_at.astimezone(HONG_KONG).date().isoformat()
    if str(record.get("date")) != expected_date:
        raise PublicRepositoryError(
            f"{repository} first_public date {record.get('date')} does not match "
            f"created_at in Asia/Hong_Kong ({expected_date})"
        )


def sort_runtime_projects(items: list[dict]) -> list[dict]:
    return sorted(
        items,
        key=lambda item: (
            -int(item["stars"]),
            -_parse_updated_at(item["updated_at"]).timestamp(),
            item["repository"].casefold(),
        ),
    )


def merge_runtime(
    cache_item: Mapping, metadata: Mapping, *, production: bool = False
) -> dict:
    validate_repository(metadata)
    updated_at = metadata.get("updated_at")
    _parse_updated_at(updated_at)
    license_data = metadata.get("license") or {}
    license_id = license_data.get("spdx_id")
    if license_id == "NOASSERTION":
        license_id = None
    return {
        "repository": cache_item["repository"],
        "name": metadata["name"],
        "url": metadata["html_url"],
        "language": metadata.get("language"),
        "stars": int(metadata.get("stargazers_count") or 0),
        "forks": int(metadata.get("forks_count") or 0),
        "updated_at": updated_at,
        "license": license_id,
        "descriptions": _valid_translations(cache_item, production=production),
    }


def _readme_url(repository: str, path: str) -> str:
    encoded_path = "/".join(
        urllib.parse.quote(segment, safe="") for segment in path.split("/")
    )
    return f"{API_ROOT}/repos/{repository}/contents/{encoded_path}"


def _decode_readme(payload: Mapping) -> str:
    if payload.get("type") != "file":
        raise PublicRepositoryError("configured README path is not a file")
    if payload.get("encoding") != "base64":
        raise PublicRepositoryError("GitHub README content is not base64 encoded")
    try:
        return base64.b64decode(payload["content"], validate=False).decode("utf-8")
    except (KeyError, ValueError, UnicodeDecodeError) as error:
        raise PublicRepositoryError(f"cannot decode README: {error}") from error


def sync_records(
    allowlist: list[Mapping],
    cache: list[Mapping] | None,
    *,
    token: str | None = None,
    transport: Transport = default_transport,
    update_cache: bool = False,
    production: bool = True,
) -> tuple[list[dict], list[dict]]:
    cache_by_repository = {
        item["repository"]: dict(item) for item in (cache or [])
    }
    runtime: list[dict] = []
    updated_cache: list[dict] = []

    for config in sorted(allowlist, key=lambda item: item["repository"].casefold()):
        repository = config["repository"]
        primary_locale = config["primary_locale"]
        readme_path = config["readmes"][primary_locale]
        metadata = request_json(
            f"{API_ROOT}/repos/{repository}",
            token=token,
            transport=transport,
        )
        validate_repository(metadata)
        validate_first_public(config, metadata)
        readme_payload = request_json(
            _readme_url(repository, readme_path),
            token=token,
            transport=transport,
        )
        object_id = readme_payload.get("sha")
        if not object_id:
            raise PublicRepositoryError(f"{repository} README has no Git object ID")
        description = extract_description(_decode_readme(readme_payload))

        old = cache_by_repository.get(repository)
        if old is None and not update_cache:
            raise StaleProjectCacheError(f"{repository} has no committed cache record")

        if old:
            old_source = old["source"]
            if old_source.get("path") != readme_path:
                raise StaleProjectCacheError(
                    f"{repository} cache path {old_source.get('path')} "
                    f"does not match {readme_path}"
                )
            if old_source.get("object_id") != object_id and not update_cache:
                raise StaleProjectCacheError(
                    f"{repository} README changed from "
                    f"{old_source.get('object_id')} to {object_id}"
                )

        if update_cache:
            translations = dict((old or {}).get("translations") or {})
            old_object_id = (old or {}).get("source", {}).get("object_id")
            if old_object_id and old_object_id != object_id:
                for translation in translations.values():
                    translation["status"] = "stale"
            cache_item = {
                "repository": repository,
                "source": {
                    "locale": primary_locale,
                    "path": readme_path,
                    "object_id": object_id,
                    "description": description,
                },
            }
            if translations:
                cache_item["translations"] = translations
        else:
            cache_item = old

        item = merge_runtime(
            cache_item,
            metadata,
            production=production and not update_cache,
        )
        runtime.append(item)
        updated_cache.append(cache_item)

    configured = {item["repository"] for item in allowlist}
    extras = set(cache_by_repository) - configured
    if extras:
        raise StaleProjectCacheError(
            "cache contains repositories outside allowlist: " + ", ".join(sorted(extras))
        )

    return sort_runtime_projects(runtime), updated_cache


def _load_yaml(path: Path, *, default):
    if not path.exists():
        return default
    value = yaml.safe_load(path.read_text(encoding="utf-8"))
    return default if value is None else value


def _write_yaml(path: Path, value) -> None:
    path.write_text(
        yaml.safe_dump(value, allow_unicode=True, sort_keys=False, width=1000),
        encoding="utf-8",
        newline="\n",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--update-cache",
        action="store_true",
        help="refresh README-derived cache and mark translations stale when needed",
    )
    parser.add_argument(
        "--no-production",
        action="store_true",
        help="allow stale translations in local diagnostic output",
    )
    args = parser.parse_args(argv)

    allowlist = _load_yaml(ALLOWLIST_PATH, default=[])
    cache = _load_yaml(CACHE_PATH, default=[])
    token = os.environ.get("GITHUB_TOKEN") or None
    runtime, updated = sync_records(
        allowlist,
        cache,
        token=token,
        update_cache=args.update_cache,
        production=not args.no_production,
    )
    if args.update_cache:
        _write_yaml(CACHE_PATH, updated)
    _write_yaml(RUNTIME_PATH, runtime)
    print(f"Verified {len(runtime)} public repositories.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
