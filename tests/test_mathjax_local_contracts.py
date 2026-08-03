from __future__ import annotations

import base64
import hashlib
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
VENDOR_ROOT = ROOT / "assets" / "vendor" / "mathjax" / "3.2.2"
RUNTIME_SHA256 = "300480069078b5892d2363a2b65e2dfbbf30fe5c80f83edbfecf4610fd093862"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def test_mathjax_runtime_and_all_chtml_fonts_are_vendored():
    runtime = VENDOR_ROOT / "tex-mml-chtml.min.js"
    fonts = sorted((VENDOR_ROOT / "output" / "chtml" / "fonts" / "woff-v2").glob("*.woff"))

    assert digest(runtime) == RUNTIME_SHA256
    assert len(fonts) == 23
    assert sum(path.stat().st_size for path in fonts) == 347_972
    assert (VENDOR_ROOT / "LICENSE").read_text(encoding="utf-8").startswith("\n                                 Apache License")


def test_mathjax_configuration_uses_only_same_origin_assets():
    config = yaml.safe_load((ROOT / "_config.yml").read_text(encoding="utf-8"))
    mathjax = config["third_party_libraries"]["mathjax"]
    runtime = VENDOR_ROOT / "tex-mml-chtml.min.js"
    sri = "sha256-" + base64.b64encode(hashlib.sha256(runtime.read_bytes()).digest()).decode("ascii")

    assert mathjax["version"] == "3.2.2"
    assert mathjax["url"] == {
        "fonts": "/assets/vendor/mathjax/3.2.2/output/chtml/fonts/woff-v2/",
        "js": "/assets/vendor/mathjax/3.2.2/tex-mml-chtml.min.js",
    }
    assert mathjax["integrity"]["js"] == sri
    assert "fallback" not in mathjax

    include = (ROOT / "_includes" / "plugins" / "al_math_scripts.liquid").read_text(encoding="utf-8")
    loader = (ROOT / "assets" / "js" / "mathjax-loader.js").read_text(encoding="utf-8")
    assert "data-runtime-src" in include
    assert "data-font-url" in include
    assert "data-primary-src" not in include
    assert "data-fallback-src" not in include
    assert 'mathRenderingSource = "local"' in loader
    assert "cdn.jsdelivr.net" not in loader
    assert "cdnjs.cloudflare.com" not in loader
