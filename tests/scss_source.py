import re
from pathlib import Path, PurePosixPath


USE_DIRECTIVE = re.compile(
    r'^\s*@use\s+["\'](?P<target>[^"\']+)["\'][^;]*;\s*$'
)


def _local_module(
    current: Path,
    target: str,
    load_paths: tuple[Path, ...],
) -> Path | None:
    if target.startswith(("sass:", "http://", "https://")):
        return None

    relative = PurePosixPath(target)
    filename = relative.name
    parent = Path(*relative.parts[:-1])
    candidates = []
    for base in (current.parent, *load_paths):
        candidates.extend(
            (
                base / parent / f"_{filename}.scss",
                base / parent / f"{filename}.scss",
                base / Path(*relative.parts) / "_index.scss",
            )
        )

    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    return None


def aggregate_scss_source(entry: Path, *, load_paths: tuple[Path, ...]) -> str:
    """Expand local Sass modules in emission order for source-level contracts."""

    loaded: set[Path] = set()
    active: set[Path] = set()

    def expand(path: Path) -> str:
        resolved = path.resolve()
        if resolved in active:
            raise ValueError(f"circular local Sass module: {resolved}")
        if resolved in loaded:
            return ""

        loaded.add(resolved)
        active.add(resolved)
        output = []
        try:
            for line in resolved.read_text(encoding="utf-8").splitlines(keepends=True):
                match = USE_DIRECTIVE.match(line)
                module = (
                    _local_module(resolved, match.group("target"), load_paths)
                    if match
                    else None
                )
                output.append(expand(module) if module else line)
        finally:
            active.remove(resolved)
        return "".join(output)

    return expand(entry)
