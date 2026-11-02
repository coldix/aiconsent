#!/bin/sh
# make-og-detector.sh | Renders tools/og-detector.html to public/img/og-detector.png (1200x630) with headless Chrome.
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-google-chrome}"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
  --window-size=1200,630 --virtual-time-budget=3000 \
  --screenshot="$PWD/public/img/og-detector.png" "file://$PWD/tools/og-detector.html"
