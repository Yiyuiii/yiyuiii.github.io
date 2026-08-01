#!/usr/bin/env python3
"""Generate deterministic responsive thumbnails from canonical post covers."""

from __future__ import annotations

import argparse
import hashlib
import json
from io import BytesIO
from pathlib import Path, PurePosixPath, PureWindowsPath

import yaml
from PIL import Image, ImageOps, features
from PIL import __version__ as pillow_version


PROVENANCE_PATH = Path("docs/asset-provenance.yml")


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


def load_policy(root: Path) -> tuple[dict, list[dict]]:
    path = root / PROVENANCE_PATH
    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or document.get("version") != 2:
        raise ValueError(f"{path}: expected provenance version 2")

    policy = document.get("index_derivatives")
    expected_policy = {
        "version": 1,
        "sizes": [160, 320],
        "format": "WEBP",
        "quality": 75,
        "method": 6,
        "resampling": "LANCZOS",
        "pillow": "12.0.0",
        "libwebp": "1.6.0",
        "strip_metadata": True,
    }
    if policy != expected_policy:
        raise ValueError(
            f"{path}: unsupported index_derivatives policy {policy!r}"
        )
    actual_encoder = {
        "pillow": pillow_version,
        "libwebp": features.version("webp"),
    }
    expected_encoder = {
        key: policy[key]
        for key in ("pillow", "libwebp")
    }
    if actual_encoder != expected_encoder:
        raise ValueError(
            f"{path}: thumbnail encoder drift; expected {expected_encoder!r}, "
            f"got {actual_encoder!r}"
        )
    covers = document.get("covers")
    if not isinstance(covers, list) or not covers:
        raise ValueError(f"{path}: covers must be a non-empty list")
    return policy, covers


def repository_asset(root: Path, value: object) -> Path:
    if not isinstance(value, str) or not value.strip() or "\\" in value:
        raise ValueError(f"invalid cover asset path {value!r}")
    posix = PurePosixPath(value)
    if (
        posix.is_absolute()
        or PureWindowsPath(value).is_absolute()
        or posix.as_posix() != value
        or any(part in {"", ".", ".."} for part in value.split("/"))
        or posix.parts[:2] != ("assets", "posts")
    ):
        raise ValueError(f"invalid cover asset path {value!r}")
    resolved = root.joinpath(*posix.parts).resolve()
    allowed = (root / "assets" / "posts").resolve()
    if not resolved.is_relative_to(allowed) or not resolved.is_file():
        raise ValueError(f"cover asset does not exist under assets/posts: {value}")
    if resolved.suffix.lower() != ".webp":
        raise ValueError(f"cover asset must be WebP: {value}")
    return resolved


def variant_path(source: Path, *, version: int, size: int) -> Path:
    return source.with_name(f"{source.stem}-index-v{version}-{size}.webp")


def render_variant(source: Path, *, size: int, quality: int, method: int) -> bytes:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened).convert("RGB")
    if image.width != image.height:
        raise ValueError(f"canonical cover must be square: {source}")
    if min(image.size) < size:
        raise ValueError(f"canonical cover is smaller than {size}px: {source}")

    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    output = BytesIO()
    resized.save(
        output,
        "WEBP",
        quality=quality,
        method=method,
        optimize=True,
        exif=b"",
        icc_profile=None,
    )
    return output.getvalue()


def generate(root: Path, *, write: bool) -> dict:
    root = root.resolve()
    policy, covers = load_policy(root)
    seen_sources: set[Path] = set()
    expected_variants: set[Path] = set()
    source_bytes = 0
    derivative_bytes = {size: 0 for size in policy["sizes"]}
    mismatches: list[str] = []

    for record in covers:
        source = repository_asset(root, record.get("asset"))
        if source in seen_sources:
            raise ValueError(f"duplicate canonical cover: {source.relative_to(root)}")
        seen_sources.add(source)
        source_bytes += source.stat().st_size

        for size in policy["sizes"]:
            destination = variant_path(
                source,
                version=policy["version"],
                size=size,
            )
            expected_variants.add(destination)
            rendered = render_variant(
                source,
                size=size,
                quality=policy["quality"],
                method=policy["method"],
            )
            derivative_bytes[size] += len(rendered)
            if write:
                destination.write_bytes(rendered)
            elif not destination.is_file():
                mismatches.append(f"missing: {destination.relative_to(root)}")
            elif destination.read_bytes() != rendered:
                actual_hash = hashlib.sha256(destination.read_bytes()).hexdigest()
                expected_hash = hashlib.sha256(rendered).hexdigest()
                mismatches.append(
                    f"stale: {destination.relative_to(root)} "
                    f"(expected {expected_hash}, got {actual_hash})"
                )

    actual_variants = set(
        (root / "assets" / "posts").rglob("*-index-v*-*.webp")
    )
    orphans = actual_variants - expected_variants
    mismatches.extend(
        f"orphan: {path.relative_to(root)}" for path in sorted(orphans)
    )
    if mismatches:
        raise ValueError("\n".join(mismatches))

    return {
        "mode": "write" if write else "check",
        "sources": len(seen_sources),
        "variants": len(expected_variants),
        "source_bytes": source_bytes,
        "derivative_bytes": derivative_bytes,
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
