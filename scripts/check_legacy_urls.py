#!/usr/bin/env python3
"""Verify retained and intentionally changed public URLs in a built site."""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from urllib.parse import unquote, urlparse

import yaml
from bs4 import BeautifulSoup


ROOT = Path(__file__).resolve().parents[1]
INVENTORY_PATH = ROOT / "_data" / "legacy_urls.yml"


class LegacyUrlError(RuntimeError):
    """A legacy public URL does not satisfy its declared policy."""


def route_path(site: Path, route: str) -> Path:
    parsed = urlparse(route)
    path = unquote(parsed.path)
    if path == "/":
        return site / "index.html"
    relative = path.lstrip("/")
    if path.endswith("/"):
        return site / relative / "index.html"
    return site / relative


def _redirect_target(path: Path) -> str | None:
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    meta = soup.find("meta", attrs={"http-equiv": re.compile("^refresh$", re.I)})
    if not meta:
        return None
    match = re.search(r"url\s*=\s*([^;]+)", meta.get("content", ""), re.I)
    if not match:
        return None
    target = match.group(1).strip().strip("\"'")
    parsed = urlparse(target)
    if parsed.scheme or parsed.netloc:
        return parsed.path or "/"
    return unquote(parsed.path or "/")


def _canonical_url(soup: BeautifulSoup) -> str | None:
    link = soup.find("link", rel="canonical")
    value = link.get("href") if link else None
    return value.strip() if isinstance(value, str) and value.strip() else None


def _open_graph_url(soup: BeautifulSoup) -> str | None:
    meta = soup.find("meta", attrs={"property": "og:url"})
    value = meta.get("content") if meta else None
    return value.strip() if isinstance(value, str) and value.strip() else None


def verify_inventory(site: Path, inventory: list[dict]) -> None:
    site = site.resolve()
    seen: set[str] = set()
    errors: list[str] = []

    for item in inventory:
        route = item["path"]
        policy = item["policy"]
        if route in seen:
            errors.append(f"{route}: duplicate inventory record")
            continue
        seen.add(route)
        output = route_path(site, route)

        if policy in {"retained", "asset"}:
            if not output.is_file():
                errors.append(f"{route}: retained output missing at {output}")
        elif policy == "redirected":
            if not output.is_file():
                errors.append(f"{route}: redirect output missing at {output}")
                continue
            actual = _redirect_target(output)
            expected = item["target"]
            if actual != expected:
                errors.append(
                    f"{route}: redirect target {actual!r}, expected {expected}"
                )
                continue
            target_output = route_path(site, expected)
            if not target_output.is_file():
                errors.append(
                    f"{route}: redirect target {expected} is missing at {target_output}"
                )
                continue

            redirect_soup = BeautifulSoup(
                output.read_text(encoding="utf-8"), "html.parser"
            )
            target_soup = BeautifulSoup(
                target_output.read_text(encoding="utf-8"), "html.parser"
            )
            expected_canonical = _canonical_url(target_soup)
            if expected_canonical is None:
                errors.append(
                    f"{route}: redirect target {expected} has no canonical URL"
                )
                continue

            for label, value in (
                ("canonical", _canonical_url(redirect_soup)),
                ("og:url", _open_graph_url(redirect_soup)),
            ):
                if value != expected_canonical:
                    errors.append(
                        f"{route}: {label} {value!r}, expected {expected_canonical!r}"
                    )
        elif policy == "retirement":
            if not output.is_file():
                errors.append(f"{route}: retirement worker missing")
                continue
            source = output.read_text(encoding="utf-8")
            if "caches.delete" not in source or "registration.unregister" not in source:
                errors.append(
                    f"{route}: retirement worker must clear caches and unregister"
                )
        elif policy == "retired":
            if output.exists():
                errors.append(f"{route}: retired route was unexpectedly built")
        else:
            errors.append(f"{route}: unknown policy {policy!r}")

    if errors:
        raise LegacyUrlError("\n".join(errors))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", type=Path, required=True)
    parser.add_argument("--inventory", type=Path, default=INVENTORY_PATH)
    args = parser.parse_args(argv)

    inventory = yaml.safe_load(args.inventory.read_text(encoding="utf-8")) or []
    verify_inventory(args.site, inventory)
    print(f"Verified {len(inventory)} legacy URL policies.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
