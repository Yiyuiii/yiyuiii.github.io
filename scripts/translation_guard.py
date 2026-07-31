#!/usr/bin/env python3
"""Track deterministic source hashes for independently stored translations."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterable, Mapping
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

import yaml


ROOT = Path(__file__).resolve().parents[1]
TRACKED_KEYS = (
    "title",
    "description",
    "excerpt",
    "tags",
    "categories",
    "body",
)
FRONTMATTER = re.compile(r"\A---\r?\n(.*?)\r?\n---(?:\r?\n)?", re.DOTALL)
HAN = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff]")
REVISION_DATE = re.compile(r"\d{4}-\d{2}-\d{2}\Z")
SITE_TIMEZONE = ZoneInfo("Asia/Hong_Kong")
ABOUT_SHARED_KEYS = {"id", "type", "style", "icon", "url", "relative", "new_tab"}
ABOUT_BLOCK_TYPES = {"greeting", "prose", "education", "details", "links"}
ABOUT_ICONS = {"github", "email", "rss", "paypal"}
ABOUT_PLACEHOLDER = re.compile(r"\b(?:TODO|TBD)\b|待翻译", re.IGNORECASE)
ABOUT_LINK = re.compile(r"(?<!!)\[[^\]\r\n]+\]\(([^)\s]+)([^)]*)\)")


class TranslationError(RuntimeError):
    """The bilingual source/translation contract is invalid."""


@dataclass(frozen=True)
class Document:
    path: Path
    frontmatter: dict[str, Any]
    body: str
    frontmatter_text: str

    def hash_input(self) -> dict[str, Any]:
        return {**self.frontmatter, "body": self.body}


def parse_document(path: Path) -> Document:
    text = path.read_text(encoding="utf-8")
    match = FRONTMATTER.match(text)
    if not match:
        raise TranslationError(f"{path} has no YAML front matter")
    frontmatter_text = match.group(1)
    frontmatter = yaml.safe_load(frontmatter_text) or {}
    if not isinstance(frontmatter, dict):
        raise TranslationError(f"{path} front matter is not a mapping")
    return Document(
        path=path,
        frontmatter=frontmatter,
        body=text[match.end() :],
        frontmatter_text=frontmatter_text,
    )


def _publication_calendar_date(value: Any, *, path: Path) -> str:
    if isinstance(value, datetime):
        timestamp = value
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=SITE_TIMEZONE)
        return timestamp.astimezone(SITE_TIMEZONE).date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, str):
        try:
            timestamp = datetime.fromisoformat(value)
        except ValueError as error:
            raise TranslationError(f"{path}: date is not an ISO timestamp") from error
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=SITE_TIMEZONE)
        return timestamp.astimezone(SITE_TIMEZONE).date().isoformat()
    raise TranslationError(f"{path}: date is missing or invalid")


def _revision_dates(document: Document) -> tuple[str, ...] | None:
    frontmatter = document.frontmatter
    revisions = frontmatter.get("revisions")
    if "date" not in frontmatter and revisions is None:
        return None

    published_date = _publication_calendar_date(
        frontmatter.get("date"),
        path=document.path,
    )
    if revisions is None:
        return (published_date,)
    if not isinstance(revisions, list) or not revisions:
        raise TranslationError(
            f"{document.path}: revisions must be a non-empty list when present"
        )

    dates: list[str] = []
    for index, revision in enumerate(revisions):
        item_path = f"{document.path}: revisions[{index}]"
        if not isinstance(revision, dict) or set(revision) != {"date", "note"}:
            raise TranslationError(
                f"{item_path} must contain exactly date and note"
            )
        revision_date = revision["date"]
        note = revision["note"]
        if not isinstance(revision_date, str) or not REVISION_DATE.fullmatch(
            revision_date
        ):
            raise TranslationError(
                f"{item_path}.date must be a quoted YYYY-MM-DD string"
            )
        try:
            date.fromisoformat(revision_date)
        except ValueError as error:
            raise TranslationError(
                f"{item_path}.date is not a real calendar date"
            ) from error
        if not isinstance(note, str) or not note.strip():
            raise TranslationError(f"{item_path}.note must be a non-empty string")
        dates.append(revision_date)

    if dates != sorted(set(dates)):
        raise TranslationError(
            f"{document.path}: revisions must use unique ascending dates"
        )
    if dates[0] != published_date:
        raise TranslationError(
            f"{document.path}: revisions first date {dates[0]} "
            f"does not match publication date {published_date}"
        )
    return tuple(dates)


def _normalize_string(value: str) -> str:
    value = unicodedata.normalize("NFC", value.replace("\r\n", "\n").replace("\r", "\n"))
    lines = [line.rstrip() for line in value.split("\n")]
    return "\n".join(lines).strip()


def _normalize(value: Any) -> Any:
    if isinstance(value, str):
        return _normalize_string(value)
    if isinstance(value, list):
        return [_normalize(item) for item in value]
    if isinstance(value, tuple):
        return [_normalize(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _normalize(value[key]) for key in sorted(value, key=str)}
    return value


def source_hash(content: Mapping[str, Any]) -> str:
    payload = {key: _normalize(content.get(key)) for key in TRACKED_KEYS}
    if content.get("revisions") is not None:
        payload["revisions"] = _normalize(content["revisions"])
    serialized = json.dumps(
        payload,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(serialized).hexdigest()


def load_about_data(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise TranslationError(f"{path}: root must be a mapping")
    return data


def about_source_hash(path: Path) -> str:
    data = load_about_data(path)
    source = data.get("zh")
    if not isinstance(source, dict):
        raise TranslationError(f"{path}: zh must be a mapping")
    canonical = json.dumps(
        source,
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def _validate_about_markdown(value: str, path: str) -> None:
    forbidden = (
        re.search(r"<[^>\r\n]+>", value),
        re.search(r"!\[[^\]]*\]\(", value),
        re.search(r"(?m)^\s{0,3}#{1,6}\s", value),
        re.search(r"(?m)^\s*(?:[-+*]|\d+[.)])\s+", value),
        "`" in value,
    )
    if any(forbidden):
        raise TranslationError(f"{path}: Markdown is outside the safe inline subset")
    for match in ABOUT_LINK.finditer(value):
        destination, suffix = match.groups()
        if not destination.startswith(("https://", "mailto:")) or suffix.strip():
            raise TranslationError(
                f"{path}: Markdown links require https/mailto without a title"
            )


def _validate_about_node(value: Any, path: str, *, language: str) -> None:
    if isinstance(value, dict):
        node_id = value.get("id")
        if "id" in value and (not isinstance(node_id, str) or not node_id.strip()):
            raise TranslationError(f"{path}.id must be a non-empty string")
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key in {"inline_markdown", "description"}:
                if not isinstance(child, str):
                    raise TranslationError(f"{child_path} must be a string")
                _validate_about_markdown(child, child_path)
            _validate_about_node(child, child_path, language=language)
        return
    if isinstance(value, list):
        for index, child in enumerate(value):
            _validate_about_node(child, f"{path}[{index}]", language=language)
        return
    if language == "en" and isinstance(value, str):
        if not value.strip() or ABOUT_PLACEHOLDER.search(value):
            raise TranslationError(f"{path}: English content is incomplete")


def _validate_about_records(
    records: Any,
    path: str,
    *,
    required_keys: set[str],
) -> list[dict[str, Any]]:
    if not isinstance(records, list) or not records:
        raise TranslationError(f"{path} must be a non-empty list")
    seen_ids: set[str] = set()
    for index, record in enumerate(records):
        record_path = f"{path}[{index}]"
        if not isinstance(record, dict) or set(record) != required_keys:
            actual = sorted(record) if isinstance(record, dict) else type(record).__name__
            raise TranslationError(
                f"{record_path}: keys are {actual!r}, "
                f"expected {sorted(required_keys)!r}"
            )
        record_id = record["id"]
        if not isinstance(record_id, str) or not record_id.strip():
            raise TranslationError(f"{record_path}.id must be a non-empty string")
        if record_id in seen_ids:
            raise TranslationError(f"{record_path}.id duplicates {record_id!r}")
        seen_ids.add(record_id)
    return records


def _validate_about_link(item: Mapping[str, Any], path: str) -> None:
    icon = item["icon"]
    if icon not in ABOUT_ICONS:
        raise TranslationError(f"{path}.icon is unsupported: {icon!r}")
    if type(item["relative"]) is not bool or type(item["new_tab"]) is not bool:
        raise TranslationError(
            f"{path}: relative and new_tab must be boolean values"
        )

    url = item["url"]
    if not isinstance(url, str) or not url.strip() or url != url.strip():
        raise TranslationError(f"{path}.url: URL must be a non-empty trimmed string")
    if any(character in url for character in "\r\n\t\\"):
        raise TranslationError(f"{path}.url: URL contains unsafe characters")

    if item["relative"]:
        if not url.startswith("/") or url.startswith("//"):
            raise TranslationError(
                f"{path}.url: URL must be root-relative when relative is true"
            )
        return

    parsed = urlsplit(url)
    valid_https = (
        parsed.scheme == "https"
        and bool(parsed.netloc)
        and not parsed.username
        and not parsed.password
    )
    valid_mailto = (
        parsed.scheme == "mailto"
        and bool(parsed.path)
        and "@" in parsed.path
        and not parsed.netloc
    )
    if not (valid_https or valid_mailto):
        raise TranslationError(
            f"{path}.url: URL must use https or mailto when relative is false"
        )


def _compare_about_structure(zh: Any, en: Any, path: str, key: str = "") -> None:
    if type(zh) is not type(en):
        raise TranslationError(
            f"{path}: bilingual value types differ "
            f"({type(zh).__name__} != {type(en).__name__})"
        )
    if isinstance(zh, dict):
        if set(zh) != set(en):
            missing_zh = sorted(set(en) - set(zh))
            missing_en = sorted(set(zh) - set(en))
            raise TranslationError(
                f"{path}: bilingual keys differ "
                f"(missing zh={missing_zh}, missing en={missing_en})"
            )
        for child_key in zh:
            _compare_about_structure(
                zh[child_key],
                en[child_key],
                f"{path}.{child_key}",
                child_key,
            )
        return
    if isinstance(zh, list):
        if len(zh) != len(en):
            raise TranslationError(
                f"{path}: bilingual list length differs ({len(zh)} != {len(en)})"
            )
        if all(isinstance(item, dict) and "id" in item for item in zh + en):
            zh_ids = [item["id"] for item in zh]
            en_ids = [item["id"] for item in en]
            if zh_ids != en_ids:
                raise TranslationError(
                    f"{path}: bilingual id order differs ({zh_ids!r} != {en_ids!r})"
                )
        for index, (zh_item, en_item) in enumerate(zip(zh, en)):
            _compare_about_structure(
                zh_item,
                en_item,
                f"{path}[{index}]",
            )
        return
    if key in ABOUT_SHARED_KEYS and zh != en:
        raise TranslationError(
            f"{path}: shared value differs ({zh!r} != {en!r})"
        )


def _validate_about_language(profile: Any, language: str) -> None:
    if not isinstance(profile, dict) or set(profile) != {"blocks"}:
        raise TranslationError(f"about.{language} must contain exactly blocks")
    blocks = profile["blocks"]
    if not isinstance(blocks, list) or not blocks:
        raise TranslationError(f"about.{language}.blocks must be a non-empty list")

    greeting_count = 0
    seen_block_ids: set[str] = set()
    for index, block in enumerate(blocks):
        path = f"about.{language}.blocks[{index}]"
        if not isinstance(block, dict):
            raise TranslationError(f"{path} must be a mapping")
        block_id = block.get("id")
        block_type = block.get("type")
        if not isinstance(block_id, str) or not block_id.strip():
            raise TranslationError(f"{path}.id must be a non-empty string")
        if block_id in seen_block_ids:
            raise TranslationError(f"{path}.id duplicates {block_id!r}")
        seen_block_ids.add(block_id)
        if block_type not in ABOUT_BLOCK_TYPES:
            raise TranslationError(f"{path}.type is unsupported: {block_type!r}")

        if block_type == "greeting":
            required = {"id", "type", "text", "aria_label"}
            greeting_count += 1
        elif block_type == "prose":
            required = {"id", "type", "paragraphs"}
            allowed = required | {"heading"}
            if set(block) - allowed:
                raise TranslationError(f"{path}: prose has unsupported keys")
            required = set(block)
            paragraphs = _validate_about_records(
                block.get("paragraphs"),
                f"{path}.paragraphs",
                required_keys={"id", "style", "inline_markdown"},
            )
            for paragraph_index, paragraph in enumerate(paragraphs):
                if paragraph["style"] not in {"normal", "italic"}:
                    raise TranslationError(
                        f"{path}.paragraphs[{paragraph_index}].style is unsupported"
                    )
        elif block_type == "education":
            required = {"id", "type", "heading", "items"}
            items = _validate_about_records(
                block.get("items"),
                f"{path}.items",
                required_keys={"id", "fields"},
            )
            for item_index, item in enumerate(items):
                fields = _validate_about_records(
                    item["fields"],
                    f"{path}.items[{item_index}].fields",
                    required_keys={"id", "label", "value"},
                )
                field_ids = (
                    [field.get("id") for field in fields]
                    if isinstance(fields, list)
                    and all(isinstance(field, dict) for field in fields)
                    else []
                )
                if field_ids != ["time", "institution", "affiliation", "stage"]:
                    raise TranslationError(
                        f"{path}.items[{item_index}].fields must use "
                        "time/institution/affiliation/stage"
                    )
        elif block_type == "details":
            required = {"id", "type", "heading", "items"}
            _validate_about_records(
                block.get("items"),
                f"{path}.items",
                required_keys={"id", "name", "description"},
            )
        else:
            required = {"id", "type", "heading", "items"}
            links = _validate_about_records(
                block.get("items"),
                f"{path}.items",
                required_keys={
                    "id",
                    "icon",
                    "label",
                    "url",
                    "relative",
                    "new_tab",
                },
            )
            for item_index, item in enumerate(links):
                _validate_about_link(item, f"{path}.items[{item_index}]")
        if set(block) != required:
            raise TranslationError(
                f"{path}: {block_type} keys are {sorted(block)}, "
                f"expected {sorted(required)}"
            )

    if greeting_count != 1:
        raise TranslationError(
            f"about.{language} requires exactly one greeting block"
        )
    _validate_about_node(profile, f"about.{language}", language=language)


def _validate_about_display(
    display: Any,
    zh_profile: Mapping[str, Any],
    en_profile: Mapping[str, Any],
) -> None:
    if not isinstance(display, dict) or set(display) != {"hidden_blocks"}:
        raise TranslationError("about.display must contain exactly hidden_blocks")
    hidden = display["hidden_blocks"]
    if (
        not isinstance(hidden, list)
        or any(not isinstance(item, str) or not item.strip() for item in hidden)
        or len(hidden) != len(set(hidden))
    ):
        raise TranslationError(
            "about.display.hidden_blocks must contain unique non-empty strings"
        )
    zh_ids = {block["id"] for block in zh_profile["blocks"]}
    en_ids = {block["id"] for block in en_profile["blocks"]}
    unknown = sorted(set(hidden) - (zh_ids & en_ids))
    if unknown:
        raise TranslationError(
            f"about.display contains unknown hidden block ids: {unknown!r}"
        )


def validate_about_profile(path: Path, *, check_hash: bool = True) -> None:
    data = load_about_data(path)
    if set(data) != {"display", "translation", "zh", "en"}:
        raise TranslationError(
            f"{path}: root must contain exactly display, translation, zh, and en"
        )
    translation = data["translation"]
    if not isinstance(translation, dict) or set(translation) != {"source_hash"}:
        raise TranslationError(
            f"{path}: translation must contain exactly source_hash"
        )
    _compare_about_structure(data["zh"], data["en"], "about")
    _validate_about_language(data["zh"], "zh")
    _validate_about_language(data["en"], "en")
    _validate_about_display(data["display"], data["zh"], data["en"])
    if check_hash:
        expected = about_source_hash(path)
        actual = translation["source_hash"]
        if actual != expected:
            raise TranslationError(
                f"{path}: stale About source_hash {actual!r}; expected {expected}"
            )


def update_about_profile_hash(path: Path) -> str:
    validate_about_profile(path, check_hash=False)
    data = load_about_data(path)
    digest = about_source_hash(path)
    data["translation"]["source_hash"] = digest
    path.write_text(
        yaml.safe_dump(
            data,
            allow_unicode=True,
            sort_keys=False,
            width=1000,
        ),
        encoding="utf-8",
        newline="\n",
    )
    return digest


def _resolve_source(reference: str, *, root: Path) -> Path:
    root = root.resolve()
    candidate = (root / reference).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as error:
        raise TranslationError(
            f"translation_source escapes repository root: {reference}"
        ) from error
    return candidate


def update_translation_hash(path: Path, *, root: Path = ROOT) -> str:
    document = parse_document(path)
    reference = document.frontmatter.get("translation_source")
    if not reference:
        raise TranslationError(f"{path} has no translation_source")
    source_path = _resolve_source(str(reference), root=root)
    source = parse_document(source_path)
    if source.frontmatter.get("translation_key") != document.frontmatter.get(
        "translation_key"
    ):
        raise TranslationError(
            f"{path} translation_key does not match {source_path}"
        )

    digest = source_hash(source.hash_input())
    updated = dict(document.frontmatter)
    updated["translation_status"] = "current"
    updated["source_hash"] = digest
    frontmatter = yaml.safe_dump(
        updated,
        allow_unicode=True,
        sort_keys=False,
        width=1000,
    ).rstrip()
    path.write_text(
        f"---\n{frontmatter}\n---\n{document.body}",
        encoding="utf-8",
        newline="\n",
    )
    return digest


def check_documents(
    paths: Iterable[Path], *, root: Path = ROOT, production: bool = False
) -> None:
    root = root.resolve()
    documents = [parse_document(Path(path)) for path in paths]
    by_path = {document.path.resolve(): document for document in documents}
    revision_dates = {
        document.path.resolve(): _revision_dates(document)
        for document in documents
    }
    identities: dict[tuple[str, str], Path] = {}

    for document in documents:
        key = document.frontmatter.get("translation_key")
        lang = document.frontmatter.get("lang")
        if not key:
            continue
        if not lang:
            raise TranslationError(f"{document.path} has translation_key but no lang")
        identity = (str(key), str(lang))
        if identity in identities:
            raise TranslationError(
                f"duplicate translation mapping {identity}: "
                f"{identities[identity]} and {document.path}"
            )
        identities[identity] = document.path

    for translation in documents:
        reference = translation.frontmatter.get("translation_source")
        if not reference:
            continue
        source_path = _resolve_source(str(reference), root=root)
        source = by_path.get(source_path)
        if source is None:
            if not source_path.exists():
                raise TranslationError(
                    f"{translation.path} references missing source {source_path}"
                )
            source = parse_document(source_path)

        source_key = source.frontmatter.get("translation_key")
        translation_key = translation.frontmatter.get("translation_key")
        if not source_key or translation_key != source_key:
            raise TranslationError(
                f"{translation.path} translation_key {translation_key!r} "
                f"does not match source {source_key!r}"
            )
        if source.frontmatter.get("lang") == translation.frontmatter.get("lang"):
            raise TranslationError(
                f"{translation.path} and source use the same language"
            )
        if (
            revision_dates.get(translation.path.resolve())
            != revision_dates.get(source.path.resolve())
        ):
            raise TranslationError(
                f"{translation.path} revision dates do not match {source.path}"
            )
        status = translation.frontmatter.get("translation_status")
        if production and status != "current":
            raise TranslationError(
                f"{translation.path} has stale translation status {status!r}"
            )
        expected = source_hash(source.hash_input())
        actual = translation.frontmatter.get("source_hash")
        if actual != expected:
            raise TranslationError(
                f"{translation.path} has stale source_hash {actual!r}; "
                f"expected {expected}"
            )


def _flatten(mapping: Mapping[str, Any], prefix: str = "") -> dict[str, Any]:
    flattened: dict[str, Any] = {}
    for key, value in mapping.items():
        path = f"{prefix}.{key}" if prefix else str(key)
        if isinstance(value, dict):
            flattened.update(_flatten(value, path))
        else:
            flattened[path] = value
    return flattened


def _iter_strings(value: Any):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from _iter_strings(item)


def validate_site_text(data: Mapping[str, Any]) -> None:
    if set(data) != {"zh", "en"}:
        raise TranslationError("site_text must contain exactly zh and en maps")
    zh = _flatten(data["zh"])
    en = _flatten(data["en"])
    if set(zh) != set(en):
        missing_zh = sorted(set(en) - set(zh))
        missing_en = sorted(set(zh) - set(en))
        raise TranslationError(
            f"site_text does not have parallel keys "
            f"(missing zh={missing_zh}, missing en={missing_en})"
        )
    for key, value in en.items():
        for text in _iter_strings(value):
            if HAN.search(text):
                raise TranslationError(
                    f"English site_text {key} contains Chinese characters"
                )


def _document_paths(root: Path) -> list[Path]:
    paths: list[Path] = []
    for directory in ("_pages", "_posts"):
        paths.extend(sorted((root / directory).glob("*.md")))
    return paths


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", type=Path)
    parser.add_argument("--write-about", type=Path, metavar="PATH")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--production", action="store_true")
    args = parser.parse_args(argv)

    if not args.write and not args.write_about and not args.check:
        parser.error("choose --write, --write-about, or --check")

    if args.write:
        digest = update_translation_hash(args.write, root=ROOT)
        print(f"Updated {args.write}: {digest}")

    if args.write_about:
        digest = update_about_profile_hash(args.write_about)
        print(f"Updated {args.write_about}: {digest}")

    if args.check:
        check_documents(
            _document_paths(ROOT),
            root=ROOT,
            production=args.production,
        )
        site_text_path = ROOT / "_data" / "site_text.yml"
        if site_text_path.exists():
            validate_site_text(
                yaml.safe_load(site_text_path.read_text(encoding="utf-8")) or {}
            )
        about_path = ROOT / "_data" / "about.yml"
        if about_path.exists():
            validate_about_profile(about_path)
        print("Translation sources are current.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
