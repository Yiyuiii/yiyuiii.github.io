#!/usr/bin/env python3
"""Generate deterministic WebP derivatives for declared article images."""

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
    path = root / POLICY_PATH
    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(document, dict) or document.get("version") != 1:
        raise ValueError(f"{path}: expected article derivative version 1")
    policy = document.get("policy")
    expected = {
        "format": "WEBP",
        "quality": 82,
        "method": 6,
        "resampling": "LANCZOS",
        "pillow": "12.0.0",
        "libwebp": "1.6.0",
        "strip_metadata": True,
        "sizes": "(max-width: 1200px) calc(100vw - 2rem), 1152px",
    }
    if policy != expected:
        raise ValueError(f"{path}: unsupported article derivative policy {policy!r}")
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
    return policy, images


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


def generate(root: Path, *, write: bool) -> dict:
    root = root.resolve()
    policy, images = load_policy(root)
    expected_outputs: set[Path] = set()
    seen_sources: set[Path] = set()
    source_bytes = 0
    derivative_bytes = 0
    mismatches: list[str] = []

    for record in images:
        source = repository_path(root, record.get("source"), must_exist=True)
        published = repository_path(root, record.get("published"), must_exist=False)
        if source in seen_sources:
            raise ValueError(f"duplicate article image source: {source.relative_to(root)}")
        seen_sources.add(source)
        source_bytes += source.stat().st_size

        outputs: list[tuple[Path, int | None]] = []
        if published != source:
            outputs.append((published, None))
        variants = record.get("variants")
        if not isinstance(variants, list):
            raise ValueError(f"{source.relative_to(root)}: variants must be a list")
        for variant in variants:
            outputs.append(
                (
                    repository_path(root, variant.get("asset"), must_exist=False),
                    variant.get("width"),
                )
            )

        for destination, width in outputs:
            if destination.suffix.lower() != ".webp" or destination == source:
                raise ValueError(f"invalid WebP destination: {destination.relative_to(root)}")
            if destination in expected_outputs:
                raise ValueError(f"duplicate derivative: {destination.relative_to(root)}")
            expected_outputs.add(destination)
            rendered = render(
                source,
                width=width,
                quality=policy["quality"],
                method=policy["method"],
            )
            derivative_bytes += len(rendered)
            if write:
                destination.parent.mkdir(parents=True, exist_ok=True)
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

    actual_outputs = set((root / "assets" / "posts").rglob("*-content-v1*.webp"))
    mismatches.extend(
        f"orphan: {path.relative_to(root)}"
        for path in sorted(actual_outputs - expected_outputs)
    )
    if mismatches:
        raise ValueError("\n".join(mismatches))
    return {
        "mode": "write" if write else "check",
        "sources": len(seen_sources),
        "derivatives": len(expected_outputs),
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
