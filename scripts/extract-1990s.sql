-- Extract all 1990s music data from MusicBrainz
-- Run with: psql -U musicbrainz -d musicbrainz -f extract-1990s.sql

\timing on

-- Create temp schema for our export tables
DROP SCHEMA IF EXISTS export CASCADE;
CREATE SCHEMA export;

-- Step 1: Find all release groups (albums) from the 1990s
-- A release_group is the abstract "album", release is a specific pressing/edition
CREATE TABLE export.albums AS
SELECT DISTINCT ON (rg.gid)
  rg.gid::text as mbid,
  rg.name as title,
  MIN(rc.date_year) as year,
  ac.id as artist_credit_id
FROM release_group rg
JOIN release r ON r.release_group = rg.id
JOIN release_country rc ON rc.release = r.id
JOIN artist_credit ac ON ac.id = rg.artist_credit
WHERE rc.date_year BETWEEN 1990 AND 1999
  AND rg.type = 1  -- Album type
GROUP BY rg.gid, rg.name, ac.id
ORDER BY rg.gid, MIN(rc.date_year);

CREATE INDEX ON export.albums(artist_credit_id);
CREATE INDEX ON export.albums(mbid);

\echo 'Albums extracted:'
SELECT COUNT(*) FROM export.albums;

-- Step 2: Get all artists from those albums
CREATE TABLE export.artists AS
SELECT DISTINCT
  a.gid::text as mbid,
  a.name,
  a.sort_name
FROM export.albums ea
JOIN artist_credit_name acn ON acn.artist_credit = ea.artist_credit_id
JOIN artist a ON a.id = acn.artist;

CREATE INDEX ON export.artists(mbid);

\echo 'Artists extracted:'
SELECT COUNT(*) FROM export.artists;

-- Step 3: Get tracks from those albums
-- We pick one representative release per release_group (the earliest)
CREATE TABLE export.tracks AS
WITH earliest_releases AS (
  SELECT DISTINCT ON (r.release_group)
    r.id as release_id,
    r.release_group,
    rc.date_year
  FROM release r
  JOIN release_country rc ON rc.release = r.id
  JOIN export.albums ea ON ea.mbid = (
    SELECT rg.gid::text FROM release_group rg WHERE rg.id = r.release_group
  )
  ORDER BY r.release_group, rc.date_year, r.id
)
SELECT DISTINCT
  rec.gid::text as mbid,
  rec.name as title,
  COALESCE(rec.length, 0) as duration_ms,
  t.position as track_number,
  rg.gid::text as album_mbid,
  (SELECT a.gid::text
   FROM artist_credit_name acn
   JOIN artist a ON a.id = acn.artist
   WHERE acn.artist_credit = rec.artist_credit
   ORDER BY acn.position
   LIMIT 1) as artist_mbid
FROM earliest_releases er
JOIN release_group rg ON rg.id = er.release_group
JOIN medium m ON m.release = er.release_id
JOIN track t ON t.medium = m.id
JOIN recording rec ON rec.id = t.recording
WHERE m.position = 1;  -- First disc only for multi-disc releases

CREATE INDEX ON export.tracks(album_mbid);
CREATE INDEX ON export.tracks(artist_mbid);

\echo 'Tracks extracted:'
SELECT COUNT(*) FROM export.tracks;

-- Step 4: Export to CSV files
\echo 'Exporting to CSV...'

\copy (SELECT mbid, name, sort_name FROM export.artists ORDER BY sort_name) TO '/tmp/artists.csv' WITH CSV HEADER;
\copy (SELECT a.mbid, a.title, a.year, (SELECT ar.gid::text FROM artist_credit_name acn JOIN artist ar ON ar.id = acn.artist WHERE acn.artist_credit = a.artist_credit_id ORDER BY acn.position LIMIT 1) as artist_mbid FROM export.albums a ORDER BY a.year, a.title) TO '/tmp/albums.csv' WITH CSV HEADER;
\copy (SELECT mbid, title, duration_ms, track_number, album_mbid, artist_mbid FROM export.tracks ORDER BY album_mbid, track_number) TO '/tmp/tracks.csv' WITH CSV HEADER;

\echo 'Export complete!'
\echo 'Files written to /tmp/artists.csv, /tmp/albums.csv, /tmp/tracks.csv'

-- Cleanup
DROP SCHEMA export CASCADE;
