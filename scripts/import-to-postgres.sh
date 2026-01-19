#!/bin/bash
set -e

# Import MusicBrainz 1990s CSV data into Postgres
#
# Usage: POSTGRES_URL="postgresql://user:pass@host:5432/db" ./scripts/import-to-postgres.sh
#
# Or set individual vars: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="${DATA_DIR:-$SCRIPT_DIR/../data/musicbrainz-1990s}"

if [[ -z "$POSTGRES_URL" && -z "$PGDATABASE" ]]; then
  echo "Error: Set POSTGRES_URL or PGDATABASE environment variable"
  echo ""
  echo "Examples:"
  echo "  POSTGRES_URL='postgresql://user:pass@localhost:5432/synctunes' $0"
  echo "  PGHOST=localhost PGUSER=postgres PGDATABASE=synctunes $0"
  exit 1
fi

# If POSTGRES_URL is set, use it directly with psql
if [[ -n "$POSTGRES_URL" ]]; then
  PSQL="psql $POSTGRES_URL"
else
  PSQL="psql"
fi

echo "=== MusicBrainz 1990s Postgres Import ==="
echo "Data dir: $DATA_DIR"
echo ""

# Check CSV files exist
for file in artists.csv albums.csv album_artists.csv tracks.csv track_artists.csv; do
  if [[ ! -f "$DATA_DIR/$file" ]]; then
    echo "Error: Missing $DATA_DIR/$file"
    echo "Run extract-1990s-csv.ts first"
    exit 1
  fi
done

echo "Step 1: Creating schema..."
$PSQL <<'EOF'
-- Drop existing tables (in correct order for foreign keys)
DROP TABLE IF EXISTS track_artists CASCADE;
DROP TABLE IF EXISTS album_artists CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS albums CASCADE;
DROP TABLE IF EXISTS artists CASCADE;

-- Create tables
CREATE TABLE artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL
);

CREATE TABLE albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  year INTEGER NOT NULL
);

CREATE TABLE album_artists (
  album_id TEXT REFERENCES albums(id),
  artist_id TEXT REFERENCES artists(id),
  position INTEGER DEFAULT 0,
  PRIMARY KEY (album_id, artist_id)
);

CREATE TABLE tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  album_id TEXT REFERENCES albums(id),
  track_number INTEGER,
  duration_ms INTEGER
);

CREATE TABLE track_artists (
  track_id TEXT REFERENCES tracks(id),
  artist_id TEXT REFERENCES artists(id),
  position INTEGER DEFAULT 0,
  PRIMARY KEY (track_id, artist_id)
);
EOF

echo "Step 2: Importing data..."

echo "  Importing artists..."
$PSQL -c "\COPY artists FROM '$DATA_DIR/artists.csv' CSV HEADER"

echo "  Importing albums..."
$PSQL -c "\COPY albums FROM '$DATA_DIR/albums.csv' CSV HEADER"

echo "  Importing album_artists..."
$PSQL -c "\COPY album_artists FROM '$DATA_DIR/album_artists.csv' CSV HEADER"

echo "  Importing tracks..."
$PSQL -c "\COPY tracks FROM '$DATA_DIR/tracks.csv' CSV HEADER"

echo "  Importing track_artists (skipping missing artists)..."
# track_artists may reference artists not in our set, so we use a temp table
$PSQL <<EOF
CREATE TEMP TABLE track_artists_staging (
  track_id TEXT,
  artist_id TEXT,
  position INTEGER
);

\COPY track_artists_staging FROM '$DATA_DIR/track_artists.csv' CSV HEADER

INSERT INTO track_artists (track_id, artist_id, position)
SELECT s.track_id, s.artist_id, s.position
FROM track_artists_staging s
WHERE EXISTS (SELECT 1 FROM artists a WHERE a.id = s.artist_id)
  AND EXISTS (SELECT 1 FROM tracks t WHERE t.id = s.track_id);

DROP TABLE track_artists_staging;
EOF

echo ""
echo "Step 3: Creating indexes..."
$PSQL <<'EOF'
CREATE INDEX idx_artists_slug ON artists(slug);
CREATE INDEX idx_artists_name ON artists(name);
CREATE INDEX idx_albums_year ON albums(year);
CREATE INDEX idx_albums_slug ON albums(slug);
CREATE INDEX idx_albums_title ON albums(title);
CREATE INDEX idx_tracks_album ON tracks(album_id);
CREATE INDEX idx_album_artists_artist ON album_artists(artist_id);
CREATE INDEX idx_track_artists_artist ON track_artists(artist_id);
EOF

echo ""
echo "Step 4: Summary..."
$PSQL <<'EOF'
SELECT 'artists' as table_name, COUNT(*) as rows FROM artists
UNION ALL
SELECT 'albums', COUNT(*) FROM albums
UNION ALL
SELECT 'album_artists', COUNT(*) FROM album_artists
UNION ALL
SELECT 'tracks', COUNT(*) FROM tracks
UNION ALL
SELECT 'track_artists', COUNT(*) FROM track_artists;
EOF

echo ""
echo "Done!"
