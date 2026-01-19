# MusicBrainz 1990s Data Extraction Plan

## Overview

Extract all 1990s music data (artists, albums, tracks) from MusicBrainz JSON dumps and output as CSV files for fast Postgres import.

## Prerequisites

- Node.js 18+
- ~25GB disk space (21GB downloads + 4GB output)
- `wget` installed
- `psql` for import step

## Quick Start (Cloud)

```bash
# Clone the repo
git clone <repo-url>
cd synctunes

# Install dependencies (only tsx needed)
npm install

# 1. Download dumps (~21GB, takes 30-60 min)
./scripts/download-json-dumps.sh

# 2. Extract 1990s data to CSV (takes 1-2 hours)
npx tsx scripts/extract-1990s-csv.ts

# 3. Import to Postgres (takes ~30 seconds)
POSTGRES_URL="postgresql://user:pass@host:5432/db" ./scripts/import-to-postgres.sh
```

## Scripts

### 1. `scripts/download-json-dumps.sh`

Downloads MusicBrainz JSON dumps (~21GB total):
- `artist.tar.xz` (1.5GB) - all artists
- `release-group.tar.xz` (1.0GB) - all albums/EPs/singles
- `release.tar.xz` (19GB) - all releases with track listings

Downloads to `/tmp/musicbrainz-json/` by default.

Supports resume - if interrupted, run again and it will continue where it left off.

### 2. `scripts/extract-1990s-csv.ts`

Streams through the JSON dumps, filters to 1990-1999 albums only, outputs CSV files.

**Environment variables:**
- `DUMP_DIR` - where to find the .tar.xz files (default: `/tmp/musicbrainz-json`)
- `OUTPUT_DIR` - where to write CSVs (default: `data/musicbrainz-1990s/`)

**Output files:**
```
data/musicbrainz-1990s/
├── artists.csv        (id, name, slug)
├── albums.csv         (id, title, slug, year)
├── album_artists.csv  (album_id, artist_id, position)
├── tracks.csv         (id, title, album_id, track_number, duration_ms)
└── track_artists.csv  (track_id, artist_id, position)
```

**What it does:**
1. Scans release-group.tar.xz for albums with `first-release-date` in 1990-1999
2. Collects artist IDs from those albums
3. Scans artist.tar.xz for those artists
4. Scans release.tar.xz for track listings (takes first release per album)
5. Writes CSV files with proper escaping

### 3. `scripts/import-to-postgres.sh`

Creates the schema and imports CSV files using Postgres COPY (very fast).

**Environment variables:**
- `POSTGRES_URL` - full connection string, OR
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` - individual vars
- `DATA_DIR` - where to find CSVs (default: `data/musicbrainz-1990s/`)

**What it does:**
1. Drops existing tables if present
2. Creates fresh schema
3. Imports CSVs with COPY
4. Creates indexes
5. Prints row counts

## Schema

```sql
CREATE TABLE artists (
  id TEXT PRIMARY KEY,      -- MusicBrainz UUID
  name TEXT NOT NULL,
  slug TEXT NOT NULL
);

CREATE TABLE albums (
  id TEXT PRIMARY KEY,      -- MusicBrainz UUID
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  year INTEGER NOT NULL
);

CREATE TABLE album_artists (
  album_id TEXT REFERENCES albums(id),
  artist_id TEXT REFERENCES artists(id),
  position INTEGER DEFAULT 0,  -- for ordering multi-artist credits
  PRIMARY KEY (album_id, artist_id)
);

CREATE TABLE tracks (
  id TEXT PRIMARY KEY,      -- MusicBrainz UUID
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

-- Indexes
CREATE INDEX idx_artists_slug ON artists(slug);
CREATE INDEX idx_artists_name ON artists(name);
CREATE INDEX idx_albums_year ON albums(year);
CREATE INDEX idx_albums_slug ON albums(slug);
CREATE INDEX idx_albums_title ON albums(title);
CREATE INDEX idx_tracks_album ON tracks(album_id);
CREATE INDEX idx_album_artists_artist ON album_artists(artist_id);
CREATE INDEX idx_track_artists_artist ON track_artists(artist_id);
```

## Expected Output Size

- ~100-200K artists
- ~300-500K albums
- ~3-5M tracks
- CSV files: ~500MB-1GB total
- Postgres DB: ~2-5GB with indexes

## ID Format

Using MusicBrainz UUIDs as primary keys (e.g., `a74b1b7f-71a5-4011-9441-d0b5e4122711`). This preserves the ability to link back to MusicBrainz for additional metadata if needed.

## Estimated Timings

| Step | Time | Notes |
|------|------|-------|
| Download | 30-60 min | Depends on connection speed |
| Extract | 1-2 hours | CPU-bound (xz decompression) |
| Import | 30-60 sec | Very fast with COPY |

## Running on a Cloud VM

For faster extraction, use a cloud VM with good CPU:

```bash
# Example: spin up a VM with Docker and Postgres

# On the VM:
git clone <repo-url>
cd synctunes
npm install

# Run Postgres in Docker
docker run -d --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=synctunes \
  -p 5432:5432 \
  postgres:15

# Run the pipeline
./scripts/download-json-dumps.sh
npx tsx scripts/extract-1990s-csv.ts
POSTGRES_URL="postgresql://postgres:postgres@localhost:5432/synctunes" ./scripts/import-to-postgres.sh

# Export the data or connect remotely
pg_dump synctunes > synctunes-1990s.sql
```

## Troubleshooting

**"No space left on device"**
- Need ~25GB free disk space
- On cloud VMs, you may need to resize the disk

**Extract script is slow**
- The xz decompression is CPU-bound
- release.tar.xz (19GB) takes the longest
- Using a VM with more CPU cores won't help much (single-threaded decompression)

**Missing track artists**
- Some tracks feature artists who don't have any 1990s albums
- The import script handles this by skipping references to missing artists
