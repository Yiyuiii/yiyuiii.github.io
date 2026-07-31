#!/usr/bin/env python3
"""Create a deterministic square WebP cover from a licensed source image."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps


def file_sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--size", type=int, default=1024)
    parser.add_argument("--focus-x", type=float, default=0.5)
    parser.add_argument("--focus-y", type=float, default=0.5)
    parser.add_argument(
        "--crop-box",
        type=int,
        nargs=4,
        metavar=("LEFT", "TOP", "RIGHT", "BOTTOM"),
    )
    parser.add_argument("--quality", type=int, default=82)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.input.resolve() == args.output.resolve():
        raise SystemExit("input and output must be different files")
    if args.size < 256:
        raise SystemExit("size must be at least 256 pixels")
    if not 0 <= args.focus_x <= 1 or not 0 <= args.focus_y <= 1:
        raise SystemExit("focus coordinates must be between 0 and 1")
    if not 1 <= args.quality <= 100:
        raise SystemExit("quality must be between 1 and 100")

    with Image.open(args.input) as opened:
        source = ImageOps.exif_transpose(opened).convert("RGB")

    width, height = source.size
    if args.crop_box is None:
        side = min(width, height)
        left = round((width - side) * args.focus_x)
        top = round((height - side) * args.focus_y)
        crop_box = (left, top, left + side, top + side)
    else:
        left, top, right, bottom = args.crop_box
        if not (0 <= left < right <= width and 0 <= top < bottom <= height):
            raise SystemExit("crop box must stay within the source image")
        if right - left != bottom - top:
            raise SystemExit("crop box must be square")
        crop_box = (left, top, right, bottom)
    cover = source.crop(crop_box)

    if cover.size != (args.size, args.size):
        cover = cover.resize((args.size, args.size), Image.Resampling.LANCZOS)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    cover.save(
        args.output,
        "WEBP",
        quality=args.quality,
        method=6,
        optimize=True,
        exif=b"",
        icc_profile=None,
    )

    with Image.open(args.output) as written:
        if written.format != "WEBP" or written.size != (args.size, args.size):
            raise SystemExit("generated cover failed format or dimension validation")

    print(
        json.dumps(
            {
                "input": str(args.input),
                "input_dimensions": [width, height],
                "input_sha256": file_sha256(args.input),
                "crop_box": list(crop_box),
                "focus": [args.focus_x, args.focus_y],
                "output": str(args.output),
                "output_dimensions": [args.size, args.size],
                "output_bytes": args.output.stat().st_size,
                "output_sha256": file_sha256(args.output),
                "quality": args.quality,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
