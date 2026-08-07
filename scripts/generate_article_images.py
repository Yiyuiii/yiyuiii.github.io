#!/usr/bin/env python3
"""Generate article WebP derivatives and verify committed asset manifests."""

from __future__ import annotations

import argparse
import hashlib
import json
from io import BytesIO
from pathlib import Path, PurePosixPath, PureWindowsPath

import yaml
from PIL import Image, ImageOps, features
from PIL import __version__ as pillow_version


POLICY_PATH = Path("_data/article_image_derivatives.yml")
EXPECTED_POLICY = {
    "format": "WEBP",
    "quality": 82,
    "method": 6,
    "resampling": "LANCZOS",
    "pillow": "12.0.0",
    "libwebp": "1.6.0",
    "strip_metadata": True,
    "hash": "SHA-256",
    "sizes": "(max-width: 1200px) calc(100vw - 2rem), 1152px",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="repository root (defaults to the script's repository)",
    )
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--write", action="store_true")
    action.add_argument("--check", action="store_true")
    return parser.parse_args()


def load_policy(root: Path, *, require_encoder: bool) -> tuple[dict, dict, list[dict]]:
    path = root / POLICY_PATH
    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or document.get("version") != 2:
        raise ValueError(f"{path}: expected article derivative version 2")
    policy = document.get("policy")
    if policy != EXPECTED_POLICY:
        raise ValueError(f"{path}: unsupported article derivative policy {policy!r}")
    if require_encoder:
        actual_encoder = {
            "pillow": pillow_version,
            "libwebp": features.version("webp"),
        }
        expected_encoder = {key: policy[key] for key in actual_encoder}
        if actual_encoder != expected_encoder:
            raise ValueError(
                f"{path}: image encoder drift; expected {expected_encoder!r}, "
                f"got {actual_encoder!r}"
            )
    images = document.get("images")
    if not isinstance(images, list) or not images:
        raise ValueError(f"{path}: images must be a non-empty list")
    return document, policy, images


def repository_path(root: Path, value: object, *, must_exist: bool) -> Path:
    if not isinstance(value, str) or not value.strip() or "\\" in value:
        raise ValueError(f"invalid article image path {value!r}")
    posix = PurePosixPath(value)
    if (
        posix.is_absolute()
        or PureWindowsPath(value).is_absolute()
        or posix.as_posix() != value
        or any(part in {"", ".", ".."} for part in value.split("/"))
        or posix.parts[:2] != ("assets", "posts")
    ):
        raise ValueError(f"invalid article image path {value!r}")
    resolved = root.joinpath(*posix.parts).resolve()
    allowed = (root / "assets" / "posts").resolve()
    if not resolved.is_relative_to(allowed):
        raise ValueError(f"article image escapes assets/posts: {value}")
    if must_exist and not resolved.is_file():
        raise ValueError(f"article image does not exist: {value}")
    return resolved


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalized_dimensions(path: Path, *, expected_format: str | None = None) -> tuple[int, int]:
    with Image.open(path) as opened:
        actual_format = opened.format
        image = ImageOps.exif_transpose(opened)
        dimensions = image.size
        image.verify()
    if expected_format is not None and actual_format != expected_format:
        raise ValueError(
            f"{path}: expected {expected_format} image, got {actual_format or 'unknown'}"
        )
    return dimensions


def declared_hash(record: dict, key: str, *, label: str) -> str:
    value = record.get(key)
    if (
        not isinstance(value, str)
        or len(value) != 64
        or value.lower() != value
        or any(character not in "0123456789abcdef" for character in value)
    ):
        raise ValueError(f"{label}: {key} must be a lowercase SHA-256")
    return value


def declared_dimensions(record: dict, key: str, *, label: str) -> tuple[int, int]:
    value = record.get(key)
    if (
        not isinstance(value, list)
        or len(value) != 2
        or any(not isinstance(number, int) or number <= 0 for number in value)
    ):
        raise ValueError(f"{label}: {key} must contain two positive integers")
    return value[0], value[1]


def render(source: Path, *, width: int | None, quality: int, method: int) -> bytes:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
    if width is not None:
        if not isinstance(width, int) or width <= 0 or width >= image.width:
            raise ValueError(f"invalid derivative width {width!r} for {source}")
        height = round(image.height * width / image.width)
        image = image.resize((width, height), Image.Resampling.LANCZOS)
    output = BytesIO()
    image.save(
        output,
        "WEBP",
        quality=quality,
        method=method,
        optimize=True,
        exif=b"",
        icc_profile=None,
    )
    return output.getvalue()


def verify_file(
    path: Path,
    metadata: dict,
    *,
    hash_key: str,
    dimensions_key: str,
    expected_dimensions: tuple[int, int],
    label: str,
) -> int:
    if not path.is_file():
        raise ValueError(f"missing: {path}")
    expected_hash = declared_hash(metadata, hash_key, label=label)
    actual_hash = sha256(path)
    if actual_hash != expected_hash:
        raise ValueError(f"stale: {path} (expected {expected_hash}, got {actual_hash})")
    declared = declared_dimensions(metadata, dimensions_key, label=label)
    if declared != expected_dimensions:
        raise ValueError(
            f"{label}: declared dimensions {declared} do not match expected "
            f"{expected_dimensions}"
        )
    actual = normalized_dimensions(path, expected_format="WEBP")
    if actual != declared:
        raise ValueError(f"{label}: actual dimensions {actual} do not match {declared}")
    return path.stat().st_size


def generate(root: Path, *, write: bool) -> dict:
    root = root.resolve()
    document, policy, images = load_policy(root, require_encoder=write)
    expected_outputs: set[Path] = set()
    seen_sources: set[Path] = set()
    source_bytes = 0
    derivative_bytes = 0

    for record in images:
        if not isinstance(record, dict):
            raise ValueError("article image entries must be mappings")
        source = repository_path(root, record.get("source"), must_exist=True)
        source_label = source.relative_to(root).as_posix()
        published = repository_path(root, record.get("published"), must_exist=False)
        if source in seen_sources:
            raise ValueError(f"duplicate article image source: {source_label}")
        seen_sources.add(source)
        source_bytes += source.stat().st_size
        source_dimensions = normalized_dimensions(source)

        if write:
            record["source_sha256"] = sha256(source)
            record["source_dimensions"] = list(source_dimensions)
        else:
            expected_source_hash = declared_hash(
                record, "source_sha256", label=source_label
            )
            actual_source_hash = sha256(source)
            if actual_source_hash != expected_source_hash:
                raise ValueError(
                    f"source changed: {source_label} "
                    f"(expected {expected_source_hash}, got {actual_source_hash})"
                )
            if declared_dimensions(
                record, "source_dimensions", label=source_label
            ) != source_dimensions:
                raise ValueError(f"source dimensions changed: {source_label}")

        outputs: list[tuple[Path, int | None, dict, str, str]] = []
        if published != source:
            outputs.append(
                (published, None, record, "published_sha256", "published_dimensions")
            )
        variants = record.get("variants")
        if not isinstance(variants, list):
            raise ValueError(f"{source_label}: variants must be a list")
        for variant in variants:
            if not isinstance(variant, dict):
                raise ValueError(f"{source_label}: variants must be mappings")
            outputs.append(
                (
                    repository_path(root, variant.get("asset"), must_exist=False),
                    variant.get("width"),
                    variant,
                    "sha256",
                    "dimensions",
                )
            )

        for destination, width, metadata, hash_key, dimensions_key in outputs:
            relative_destination = destination.relative_to(root).as_posix()
            if destination.suffix.lower() != ".webp" or destination == source:
                raise ValueError(f"invalid WebP destination: {relative_destination}")
            if destination in expected_outputs:
                raise ValueError(f"duplicate derivative: {relative_destination}")
            expected_outputs.add(destination)
            expected_width = source_dimensions[0] if width is None else width
            if (
                not isinstance(expected_width, int)
                or expected_width <= 0
                or (width is not None and expected_width >= source_dimensions[0])
            ):
                raise ValueError(f"invalid derivative width {width!r} for {source_label}")
            expected_height = round(
                source_dimensions[1] * expected_width / source_dimensions[0]
            )
            expected_dimensions = (expected_width, expected_height)

            if write:
                rendered = render(
                    source,
                    width=width,
                    quality=policy["quality"],
                    method=policy["method"],
                )
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(rendered)
                metadata[hash_key] = sha256(destination)
                metadata[dimensions_key] = list(expected_dimensions)
                derivative_bytes += len(rendered)
            else:
                derivative_bytes += verify_file(
                    destination,
                    metadata,
                    hash_key=hash_key,
                    dimensions_key=dimensions_key,
                    expected_dimensions=expected_dimensions,
                    label=relative_destination,
                )

    actual_outputs = set((root / "assets" / "posts").rglob("*-content-v1*.webp"))
    orphans = sorted(actual_outputs - expected_outputs)
    if orphans:
        raise ValueError(
            "\n".join(f"orphan: {path.relative_to(root)}" for path in orphans)
        )
    if write:
        policy_path = root / POLICY_PATH
        policy_path.write_text(
            yaml.safe_dump(
                document,
                allow_unicode=True,
                sort_keys=False,
                width=1000,
            ),
            encoding="utf-8",
        )
    return {
        "mode": "write" if write else "check",
        "sources": len(seen_sources),
        "derivatives": len(expected_outputs),
        "source_bytes": source_bytes,
        "derivative_bytes": derivative_bytes,
        "verification": "committed-manifest",
    }


def main() -> int:
    args = parse_args()
    try:
        report = generate(args.root, write=args.write)
    except (OSError, ValueError, yaml.YAMLError) as error:
        raise SystemExit(str(error)) from error
    print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
