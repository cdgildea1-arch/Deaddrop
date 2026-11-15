#!/bin/sh
# Copy the site's own rule files next to the function so the server checks moves exactly like the phones do.
# Run from the repo root before deploying `your-move-games`.
set -e
cd "$(dirname "$0")"
for g in dots hearts uno guess-who scrabble duet; do cp "../$g/rules.mjs" "games/$g.mjs"; done
