#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_NAME="musicbrainz-db"

echo "=== MusicBrainz 1990s Data Extraction ==="
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Error: MusicBrainz database container is not running."
  echo "Run ./scripts/setup-musicbrainz-db.sh first."
  exit 1
fi

echo "Step 1: Running SQL extraction..."
echo "This may take a while for large datasets..."
echo ""

# Copy SQL file into container and run it
docker cp "${SCRIPT_DIR}/extract-1990s.sql" ${CONTAINER_NAME}:/tmp/extract-1990s.sql
docker exec ${CONTAINER_NAME} psql -U musicbrainz -d musicbrainz -f /tmp/extract-1990s.sql

echo ""
echo "Step 2: Copying CSV files from container..."
docker cp ${CONTAINER_NAME}:/tmp/artists.csv /tmp/artists.csv
docker cp ${CONTAINER_NAME}:/tmp/albums.csv /tmp/albums.csv
docker cp ${CONTAINER_NAME}:/tmp/tracks.csv /tmp/tracks.csv

echo ""
echo "Step 3: Transforming data..."
cd "${SCRIPT_DIR}/.."
npx tsx scripts/transform.ts

echo ""
echo "=== Extraction complete! ==="
echo "Data written to src/data/music-1990s.json"
