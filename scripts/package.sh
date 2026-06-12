#!/usr/bin/env bash
# Build a Chrome-Web-Store-ready (and friend-shareable) zip into dist/.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./extension/manifest.json').version")
OUT="dist/spoiler-shield-v${VERSION}.zip"

mkdir -p dist
rm -f "$OUT"
(cd extension && zip -rq "../$OUT" . -x "*.DS_Store" -x ".*")

echo "built $OUT"
unzip -l "$OUT" | tail -n 2
