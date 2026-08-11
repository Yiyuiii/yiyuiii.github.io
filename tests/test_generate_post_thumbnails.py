import hashlib
import subprocess
import sys
from io import BytesIO
from pathlib import Path

import yaml
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "generate_post_thumbnails.py"
PROVENANCE = ROOT / "docs" / "asset-provenance.yml"
EXPECTED_SIZES = (160, 320)
MAX_BYTES_PER_COVER = {160: 6_250, 320: 15_625}


def variant_path(asset: Path, size: int) -> Path:
    return asset.with_name(f"{asset.stem}-index-v2-{size}.webp")


def test_generator_is_repeatable_and_checkable(tmp_path):
    source = tmp_path / "assets" / "posts" / "sample" / "cover.webp"
    source.parent.mkdir(parents=True)
    Image.new("RGB", (640, 640), color=(232, 228, 220)).save(
        source,
        "WEBP",
        quality=82,
    )
    provenance = {
        "version": 2,
        "index_derivatives": {
            "version": 2,
            "sizes": list(EXPECTED_SIZES),
            "format": "WEBP",
            "quality": 75,
            "method": 6,
            "resampling": "LANCZOS",
            "pillow": "12.3.0",
            "libwebp": "1.6.0",
            "strip_metadata": True,
        },
        "covers": [{"asset": source.relative_to(tmp_path).as_posix()}],
    }
    (tmp_path / "docs").mkdir()
    (tmp_path / "docs" / "asset-provenance.yml").write_text(
        yaml.safe_dump(provenance, sort_keys=False),
        encoding="utf-8",
    )

    command = [sys.executable, str(SCRIPT), "--root", str(tmp_path), "--write"]
    first = subprocess.run(command, capture_output=True, text=True, check=False)
    assert first.returncode == 0, first.stderr
    first_hashes = {
        size: hashlib.sha256(variant_path(source, size).read_bytes()).hexdigest()
        for size in EXPECTED_SIZES
    }

    second = subprocess.run(command, capture_output=True, text=True, check=False)
    assert second.returncode == 0, second.stderr
    second_hashes = {
        size: hashlib.sha256(variant_path(source, size).read_bytes()).hexdigest()
        for size in EXPECTED_SIZES
    }
    assert second_hashes == first_hashes

    check = subprocess.run(
        [sys.executable, str(SCRIPT), "--root", str(tmp_path), "--check"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert check.returncode == 0, check.stderr

    for size in EXPECTED_SIZES:
        with Image.open(BytesIO(variant_path(source, size).read_bytes())) as image:
            assert image.format == "WEBP"
            assert image.mode == "RGB"
            assert image.size == (size, size)


def test_committed_derivatives_match_sources_and_have_no_orphans():
    document = yaml.safe_load(PROVENANCE.read_text(encoding="utf-8"))
    assert document["version"] == 2
    assert document["index_derivatives"] == {
        "version": 2,
        "sizes": [160, 320],
        "format": "WEBP",
        "quality": 75,
        "method": 6,
        "resampling": "LANCZOS",
        "pillow": "12.3.0",
        "libwebp": "1.6.0",
        "strip_metadata": True,
    }

    expected = set()
    original_bytes = 0
    derivative_bytes = {160: 0, 320: 0}
    for record in document["covers"]:
        source = ROOT / record["asset"]
        original_bytes += source.stat().st_size
        for size in EXPECTED_SIZES:
            derivative = variant_path(source, size)
            expected.add(derivative.resolve())
            assert derivative.is_file(), derivative
            derivative_bytes[size] += derivative.stat().st_size

    actual = {
        path.resolve()
        for path in (ROOT / "assets" / "posts").rglob("*-index-v*-*.webp")
    }
    assert actual == expected
    cover_count = len(document["covers"])
    for size in EXPECTED_SIZES:
        assert derivative_bytes[size] < MAX_BYTES_PER_COVER[size] * cover_count
    assert derivative_bytes[320] < original_bytes * 0.20

    result = subprocess.run(
        [sys.executable, str(SCRIPT), "--root", str(ROOT), "--check"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
