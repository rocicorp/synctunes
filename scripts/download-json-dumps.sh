#!/bin/bash
set -e

# Download MusicBrainz JSON dumps for processing
# These are much smaller than the full Postgres dump

DUMP_DIR="/tmp/musicbrainz-json"
BASE_URL="https://data.metabrainz.org/pub/musicbrainz/data/json-dumps/20260117-001001"

mkdir -p "$DUMP_DIR"
cd "$DUMP_DIR"

echo "Downloading MusicBrainz JSON dumps to $DUMP_DIR"
echo "This will download ~5GB total"
echo ""

# We need:
# - release-group.tar.xz (~800MB) - albums with release dates
# - artist.tar.xz (~400MB) - artist info
# - release.tar.xz (~3GB) - releases with track listings

FILES=(
  "artist.tar.xz"
  "release-group.tar.xz"
  "release.tar.xz"
)

for file in "${FILES[@]}"; do
  if [[ -f "$file" ]]; then
    echo "$file already exists, skipping download"
  else
    echo "Downloading $file..."
    wget -c "${BASE_URL}/${file}"
  fi
done

echo ""
echo "Downloads complete!"
echo "Files in $DUMP_DIR:"
ls -lh "$DUMP_DIR"
