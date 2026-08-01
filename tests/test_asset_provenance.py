import hashlib
from pathlib import Path, PurePosixPath

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


def test_every_published_post_thumbnail_has_one_provenance_record():
    posts = published_posts()
    covers = records()
    by_post = {record["post"]: record for record in covers}

    assert len(posts) == 11
    assert len(covers) == len(posts)
    assert len(by_post) == len(covers)

    for post in posts:
        relative_post = post.relative_to(ROOT).as_posix()
        data = frontmatter(post)
        thumbnail = data.get("thumbnail")

        assert isinstance(thumbnail, str) and thumbnail.startswith(
            "/assets/posts/"
        ), relative_post
        assert relative_post in by_post
        assert by_post[relative_post]["asset"] == thumbnail.lstrip("/")
        assert (ROOT / thumbnail.lstrip("/")).is_file()


def test_provenance_schema_hashes_and_dimensions_match_production_assets():
    covers = records()
    assets = [record["asset"] for record in covers]

    assert len(set(assets)) == len(assets)
    for record in covers:
        assert REQUIRED_KEYS <= set(record), record
        assert record["origin_type"] in {
            "self-produced",
            "external",
            "generated",
        }
        assert PurePosixPath(record["asset"]).parts[:2] == ("assets", "posts")
        assert PurePosixPath(record["post"]).parts[0] == "_posts"
        assert isinstance(record["transform"], str) and record["transform"].strip()
        assert isinstance(record["attribution"], str) and record[
            "attribution"
        ].strip()
        assert isinstance(record["dimensions"], list)
        assert len(record["dimensions"]) == 2
        assert all(
            isinstance(value, int) and value > 0
            for value in record["dimensions"]
        )

        asset = ROOT / record["asset"]
        assert hashlib.sha256(asset.read_bytes()).hexdigest() == record["sha256"]
        with Image.open(asset) as image:
            assert image.format == "WEBP"
            assert list(image.size) == record["dimensions"]

        if record["origin_type"] == "external":
            for key in ("source_url", "author", "license", "license_url"):
                assert isinstance(record[key], str) and record[key].strip()
            assert record["source_url"].startswith("https://")
            assert record["license_url"].startswith("https://")
        elif record["origin_type"] == "self-produced":
            assert record["source_url"] is None
            assert record["license"] == "project-owned"
            assert record["license_url"] is None
        else:
            assert record["source_url"] is None
            assert record["license"] == "project-use-rights"
            assert record["license_url"] is None
            for key in (
                "generator",
                "generated_at",
                "source_description",
                "purpose",
                "prompt",
                "approval",
            ):
                assert isinstance(record.get(key), str)
                assert record[key].strip()
            assert isinstance(record.get("reference_inputs"), list)
            assert record["reference_inputs"]
            assert all(
                isinstance(value, str) and value.strip()
                for value in record["reference_inputs"]
            )


def test_external_cover_rights_are_visible_in_the_production_post():
    for record in records():
        if record["origin_type"] != "external":
            continue

        source = (ROOT / record["post"]).read_text(encoding="utf-8")
        assert record["source_url"] in source
        assert record["attribution"] in source
        assert record["license"] in source
        assert (
            record["license_url"] == record["source_url"]
            or record["license_url"] in source
        )
