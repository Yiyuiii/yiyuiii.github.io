#!/usr/bin/env bash
set -euo pipefail

BUNDLER_VERSION="2.5.22"
MODE="${1:-serve}"

if ! command -v ruby >/dev/null 2>&1 || ! command -v gem >/dev/null 2>&1; then
  echo "Ruby is required. Reload the Replit environment so replit.nix can be applied." >&2
  exit 2
fi

RUBY_USER_BIN="$(ruby -e 'print File.join(Gem.user_dir, "bin")')"
export PATH="$RUBY_USER_BIN:$PATH"

if ! gem list --installed --exact bundler --version "$BUNDLER_VERSION" >/dev/null 2>&1; then
  gem install --user-install bundler --version "$BUNDLER_VERSION" --no-document
fi

BUNDLE=(bundle "_${BUNDLER_VERSION}_")
"${BUNDLE[@]}" config set --local path vendor/bundle >/dev/null
"${BUNDLE[@]}" check || "${BUNDLE[@]}" install --jobs 4 --retry 3

case "$MODE" in
  build)
    exec env JEKYLL_ENV=production "${BUNDLE[@]}" exec jekyll build --trace
    ;;
  serve)
    exec env JEKYLL_ENV=production "${BUNDLE[@]}" exec jekyll serve \
      --host 0.0.0.0 \
      --port 3000 \
      --no-watch \
      --trace
    ;;
  *)
    echo "Usage: $0 [build|serve]" >&2
    exit 2
    ;;
esac
