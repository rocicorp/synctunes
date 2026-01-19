# MusicBrainz 1990s Data Extraction Plan

## Goal
Extract all artists, albums, and tracks from the 1990s (1990-1999) from MusicBrainz and load them into SyncTunes.

## Approach
Use the `arey/musicbrainz-database` Docker image which provides a PostgreSQL database pre-loaded with MusicBrainz data. Query directly with SQL to filter for 1990s releases, then export to JSON.

## Prerequisites
- Docker installed and running
- ~30GB disk space for the database
- Node.js for the transform script

## Directory Structure
```
scripts/
  setup-musicbrainz-db.sh     # Start the Docker container
  extract-1990s.sql           # SQL query to extract data
  transform.ts                # Convert SQL output to app JSON format
  teardown-musicbrainz-db.sh  # Stop and clean up Docker container
```

## Step 1: Setup MusicBrainz Database

```bash
# scripts/setup-musicbrainz-db.sh
docker run -d \
  --name musicbrainz-db \
  -p 5432:5432 \
  -e POSTGRES_USER=musicbrainz \
  -e POSTGRES_PASSWORD=musicbrainz \
  arey/musicbrainz-database

# Wait for database to be ready (initial import takes a while on first run)
echo "Waiting for database to be ready..."
until docker exec musicbrainz-db pg_isready -U musicbrainz; do
  sleep 5
done
echo "Database ready!"
```

## Step 2: SQL Extraction Query

The MusicBrainz schema uses these key tables:
- `artist` - artist info (id, gid, name, sort_name)
- `artist_credit` - links artists to releases/recordings
- `artist_credit_name` - artist names within credits
- `release_group` - album-level grouping (type: album, single, EP)
- `release` - specific release of an album
- `release_country` - release dates by country
- `medium` - physical media within a release (disc 1, disc 2)
- `track` - tracks on a medium
- `recording` - the actual recorded work

```sql
-- scripts/extract-1990s.sql

-- Get releases from the 1990s with their artists and tracks
WITH nineties_releases AS (
  SELECT DISTINCT
    rg.id as release_group_id,
    rg.gid as release_group_mbid,
    rg.name as album_title,
    rg.type as release_type,
    MIN(rc.date_year) as release_year
  FROM release_group rg
  JOIN release r ON r.release_group = rg.id
  JOIN release_country rc ON rc.release = r.id
  WHERE rc.date_year BETWEEN 1990 AND 1999
    AND rg.type = 1  -- 1 = Album (exclude singles, EPs, etc.)
  GROUP BY rg.id, rg.gid, rg.name, rg.type
)

-- Export artists
SELECT DISTINCT
  a.gid as mbid,
  a.name,
  a.sort_name
FROM nineties_releases nr
JOIN release r ON r.release_group = nr.release_group_id
JOIN artist_credit_name acn ON acn.artist_credit = r.artist_credit
JOIN artist a ON a.id = acn.artist
ORDER BY a.sort_name;

-- Export albums
SELECT
  nr.release_group_mbid as mbid,
  nr.album_title as title,
  nr.release_year as year,
  a.gid as artist_mbid
FROM nineties_releases nr
JOIN release r ON r.release_group = nr.release_group_id
JOIN artist_credit_name acn ON acn.artist_credit = r.artist_credit
JOIN artist a ON a.id = acn.artist
ORDER BY a.sort_name, nr.release_year;

-- Export tracks
SELECT
  rec.gid as mbid,
  rec.name as title,
  rec.length as duration_ms,
  t.position as track_number,
  nr.release_group_mbid as album_mbid,
  a.gid as artist_mbid
FROM nineties_releases nr
JOIN release r ON r.release_group = nr.release_group_id
JOIN medium m ON m.release = r.id
JOIN track t ON t.medium = m.id
JOIN recording rec ON rec.id = t.recording
JOIN artist_credit_name acn ON acn.artist_credit = rec.artist_credit
JOIN artist a ON a.id = acn.artist
ORDER BY nr.album_title, t.position;
```

Note: The exact SQL will need refinement once we see the actual schema. MusicBrainz has complex relationships (multiple artists per track via artist_credit, multiple releases per release_group, etc.).

## Step 3: Transform Script

```typescript
// scripts/transform.ts
// Reads CSV/JSON output from psql and transforms to our app's format

import { writeFileSync } from 'fs';

// Read exported data
const artists = readArtistsExport();
const albums = readAlbumsExport();
const tracks = readTracksExport();

// Generate slugs and IDs
const transformedArtists = artists.map(a => ({
  id: `artist-${a.mbid}`,
  name: a.name,
  slug: slugify(a.name),
}));

// ... similar for albums and tracks

// Write to src/data/music.ts or a JSON file
writeFileSync('src/data/music-1990s.json', JSON.stringify({
  artists: transformedArtists,
  albums: transformedAlbums,
  tracks: transformedTracks,
}, null, 2));
```

## Step 4: Teardown

```bash
# scripts/teardown-musicbrainz-db.sh
docker stop musicbrainz-db
docker rm musicbrainz-db
# Optionally remove the image to reclaim ~30GB
# docker rmi arey/musicbrainz-database
```

## Data Size Estimates

Based on MusicBrainz stats, the 1990s likely contains:
- ~100,000+ artists
- ~200,000+ albums
- ~2,000,000+ tracks

This is a lot of data. We may want to filter further:
- Only "official" releases (exclude bootlegs, promos)
- Only albums with a minimum number of tracks
- Only artists with a minimum number of releases
- Specific genres (if tagged)

## Alternative: Incremental Approach

If the full dataset is too large, we could:
1. Start with a curated list of ~100 influential 90s artists
2. Extract only their discographies
3. Expand later as needed

## Open Questions

1. How to handle compilation albums (various artists)?
2. How to handle re-releases and deluxe editions (same album, different years)?
3. Do we want cover art URLs? (Would need separate API calls)
4. How to handle tracks with multiple artists (feat., collaborations)?

## Next Steps

1. [ ] Create scripts directory
2. [ ] Write setup-musicbrainz-db.sh
3. [ ] Test database connection
4. [ ] Explore actual schema and refine SQL
5. [ ] Write extraction queries
6. [ ] Write transform script
7. [ ] Test with small subset
8. [ ] Run full extraction
9. [ ] Update app to load from JSON file
