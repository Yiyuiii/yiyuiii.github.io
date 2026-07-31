import json
import subprocess
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "prepare_post_cover.py"


def test_prepare_post_cover_accepts_an_explicit_square_crop_box(tmp_path):
    source = tmp_path / "source.png"
    output = tmp_path / "cover.webp"
    Image.new("RGB", (12, 10), color=(232, 228, 220)).save(source)

    result = subprocess.run(
        [
            sys.executable,
            str(SCRIPT),
            "--input",
            str(source),
            "--output",
            str(output),
            "--size",
            "256",
            "--crop-box",
            "2",
            "1",
            "10",
            "9",
        ],
        cwd=ROOT,
        capture_output=True,
        check=False,
        text=True,
        encoding="utf-8",
    )

    assert result.returncode == 0, result.stderr
    assert json.loads(result.stdout)["crop_box"] == [2, 1, 10, 9]
    with Image.open(output) as cover:
        assert cover.format == "WEBP"
        assert cover.size == (256, 256)
