import hashlib
import re
from pathlib import Path, PurePosixPath, PureWindowsPath

import yaml
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PROVENANCE = ROOT / "docs" / "asset-provenance.yml"
REQUIRED_KEYS = {
    "asset",
    "post",
    "origin_type",
    "source_url",
    "author",
    "license",
    "license_url",
    "transform",
    "sha256",
    "dimensions",
    "attribution",
}
COMMON_STRING_KEYS = {
    "asset",
    "post",
    "origin_type",
    "author",
    "license",
    "transform",
    "sha256",
    "attribution",
}
GENERATED_ONLY_KEYS = {
    "generator",
    "generated_at",
    "source_description",
    "reference_inputs",
    "purpose",
    "prompt",
    "approval",
}
GENERATED_STRING_KEYS = GENERATED_ONLY_KEYS - {"reference_inputs"}


def frontmatter(path):
    source = path.read_text(encoding="utf-8")
    return yaml.safe_load(source.split("---", 2)[1])


def published_posts():
    return [
        path
        for path in sorted((ROOT / "_posts").glob("*.md"))
        if frontmatter(path).get("published") is not False
    ]


def records():
    document = yaml.safe_load(PROVENANCE.read_text(encoding="utf-8"))
    assert set(document) == {"version", "covers"}
    assert document["version"] == 1
    assert isinstance(document["covers"], list)
    return document["covers"]


def record_context(record):
    return f"post={record.get('post')!r}, asset={record.get('asset')!r}"


def assert_nonempty_string(record, key):
    value = record.get(key)
    assert isinstance(value, str) and value.strip(), (
        f"{record_context(record)}: {key} must be a non-empty string; "
        f"got {value!r}"
    )


def resolved_repository_file(record, key, allowed_root):
    value = record.get(key)
    context = f"{record_context(record)}: {key}={value!r}"

    assert isinstance(value, str) and value.strip(), (
        f"{context} must be a non-empty path string"
    )
    assert "\\" not in value, f"{context} must use POSIX separators"

    posix_path = PurePosixPath(value)
    assert not posix_path.is_absolute(), f"{context} must be relative"
    assert not PureWindowsPath(value).is_absolute(), (
        f"{context} must not be a Windows absolute path"
    )
    assert all(part not in {"", ".", ".."} for part in value.split("/")), (
        f"{context} must not contain empty, '.' or '..' path segments"
    )
    assert posix_path.as_posix() == value, f"{context} must be canonical POSIX"

    resolved = ROOT.joinpath(*value.split("/")).resolve()
    allowed = allowed_root.resolve()
    assert resolved.is_relative_to(allowed), (
        f"{context} resolves outside {allowed}: {resolved}"
    )
    assert resolved.is_file(), f"{context} does not resolve to a file: {resolved}"
    return resolved


def visible_post_body(path):
    source = path.read_text(encoding="utf-8")
    sections = source.split("---", 2)
    assert len(sections) == 3, f"{path}: expected YAML front matter"
    body = sections[2]
    body = re.sub(r"<!--.*?-->", "", body, flags=re.DOTALL)
    return re.sub(
        r"{%-?\s*comment\s*-?%}.*?{%-?\s*endcomment\s*-?%}",
        "",
        body,
        flags=re.DOTALL,
    )


def test_every_published_post_thumbnail_has_one_provenance_record():
    posts = published_posts()
    covers = records()
    by_post = {record["post"]: record for record in covers}

    assert len(posts) == 11, f"expected 11 published posts, found {len(posts)}"
    assert len(covers) == len(posts), (
        f"expected one cover per post: {len(covers)} covers for {len(posts)} posts"
    )
    assert len(by_post) == len(covers), "duplicate post paths in provenance records"

    for post in posts:
        relative_post = post.relative_to(ROOT).as_posix()
        data = frontmatter(post)
        thumbnail = data.get("thumbnail")

        assert isinstance(thumbnail, str) and thumbnail.startswith(
            "/assets/posts/"
        ), relative_post
        assert relative_post in by_post, f"{relative_post}: missing provenance record"
        record = by_post[relative_post]
        assert record["asset"] == thumbnail.lstrip("/"), (
            f"{record_context(record)}: thumbnail is {thumbnail!r}"
        )
        thumbnail_path = ROOT / thumbnail.lstrip("/")
        assert thumbnail_path.is_file(), (
            f"{relative_post}: thumbnail file does not exist: {thumbnail_path}"
        )


def test_provenance_schema_hashes_and_dimensions_match_production_assets():
    covers = records()
    assets = [record.get("asset") for record in covers]

    assert len(set(assets)) == len(assets), "duplicate asset paths in provenance records"
    for record in covers:
        context = record_context(record)
        missing_keys = REQUIRED_KEYS - set(record)
        assert not missing_keys, f"{context}: missing required keys {missing_keys}"
        for key in COMMON_STRING_KEYS:
            assert_nonempty_string(record, key)

        origin_type = record["origin_type"]
        assert origin_type in {
            "self-produced",
            "external",
            "generated",
        }, f"{context}: invalid origin_type {origin_type!r}"

        assert PurePosixPath(record["asset"]).parts[:2] == ("assets", "posts"), (
            f"{context}: asset must be under assets/posts"
        )
        asset = resolved_repository_file(
            record, "asset", ROOT / "assets" / "posts"
        )
        assert PurePosixPath(record["post"]).parts[:1] == ("_posts",), (
            f"{context}: post must be under _posts"
        )
        resolved_repository_file(record, "post", ROOT / "_posts")

        dimensions = record["dimensions"]
        assert isinstance(dimensions, list), (
            f"{context}: dimensions must be a list; got {dimensions!r}"
        )
        assert len(dimensions) == 2, (
            f"{context}: dimensions must contain width and height; got {dimensions!r}"
        )
        assert all(
            isinstance(value, int) and value > 0
            for value in dimensions
        ), f"{context}: dimensions must be positive integers; got {dimensions!r}"

        actual_sha256 = hashlib.sha256(asset.read_bytes()).hexdigest()
        assert actual_sha256 == record["sha256"], (
            f"{context}: sha256 mismatch; expected {record['sha256']!r}, "
            f"got {actual_sha256!r}"
        )
        with Image.open(asset) as image:
            assert image.format == "WEBP", (
                f"{context}: expected WEBP format, got {image.format!r}"
            )
            assert list(image.size) == dimensions, (
                f"{context}: dimensions mismatch; expected {dimensions!r}, "
                f"got {list(image.size)!r}"
            )

        if origin_type != "generated":
            unexpected = GENERATED_ONLY_KEYS & set(record)
            assert not unexpected, (
                f"{context}: generated-only keys are not allowed for "
                f"{origin_type}: {unexpected}"
            )

        if origin_type != "self-produced":
            assert "source_asset" not in record, (
                f"{context}: source_asset is only allowed for self-produced covers"
            )
        elif "source_asset" in record:
            resolved_repository_file(record, "source_asset", ROOT / "assets")

        if origin_type == "external":
            for key in ("source_url", "license_url"):
                assert_nonempty_string(record, key)
                assert record[key].startswith("https://"), (
                    f"{context}: {key} must start with https://; got {record[key]!r}"
                )
        elif origin_type == "self-produced":
            assert record["source_url"] is None, (
                f"{context}: self-produced source_url must be null"
            )
            assert record["license"] == "project-owned", (
                f"{context}: self-produced license must be 'project-owned'; "
                f"got {record['license']!r}"
            )
            assert record["license_url"] is None, (
                f"{context}: self-produced license_url must be null"
            )
        else:
            assert record["source_url"] is None, (
                f"{context}: generated source_url must be null"
            )
            assert record["license"] == "project-use-rights", (
                f"{context}: generated license must be 'project-use-rights'; "
                f"got {record['license']!r}"
            )
            assert record["license_url"] is None, (
                f"{context}: generated license_url must be null"
            )
            for key in GENERATED_STRING_KEYS:
                assert_nonempty_string(record, key)
            assert isinstance(record.get("reference_inputs"), list)
            assert record["reference_inputs"], (
                f"{context}: reference_inputs must not be empty"
            )
            assert all(
                isinstance(value, str) and value.strip()
                for value in record["reference_inputs"]
            ), f"{context}: reference_inputs entries must be non-empty strings"


def assert_cover_usage_and_external_rights(record, body):
    context = record_context(record)
    asset_url = "/" + record["asset"]
    if asset_url not in body:
        purpose = record.get("purpose")
        assert (
            record["origin_type"] == "generated"
            and isinstance(purpose, str)
            and purpose.strip()
            and "writing-index cover" in purpose
        ), f"{context}: visible post body is missing cover asset URL {asset_url!r}"

    if record["origin_type"] == "external":
        for key in ("source_url", "attribution", "license"):
            assert record[key] in body, (
                f"{context}: visible post body is missing {key}={record[key]!r}"
            )
        if record["license_url"] != record["source_url"]:
            assert record["license_url"] in body, (
                f"{context}: visible post body is missing independent "
                f"license_url={record['license_url']!r}"
            )


def test_cover_usage_and_external_rights_are_visible_in_the_production_post():
    for record in records():
        body = visible_post_body(ROOT / record["post"])
        assert_cover_usage_and_external_rights(record, body)
