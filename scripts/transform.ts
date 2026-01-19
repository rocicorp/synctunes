#!/usr/bin/env npx tsx
/**
 * Transform MusicBrainz CSV exports into the app's data format.
 *
 * Usage: npx tsx scripts/transform.ts
 *
 * Expects CSV files in /tmp from the SQL extraction:
 *   - /tmp/artists.csv
 *   - /tmp/albums.csv
 *   - /tmp/tracks.csv
 *
 * Outputs: src/data/music-1990s.json
 */

import { createReadStream, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { join } from 'path';

interface ArtistRow {
  mbid: string;
  name: string;
  sort_name: string;
}

interface AlbumRow {
  mbid: string;
  title: string;
  year: string;
  artist_mbid: string;
}

interface TrackRow {
  mbid: string;
  title: string;
  duration_ms: string;
  track_number: string;
  album_mbid: string;
  artist_mbid: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')    // Remove special chars
    .replace(/\s+/g, '-')            // Spaces to hyphens
    .replace(/-+/g, '-')             // Collapse multiple hyphens
    .replace(/^-|-$/g, '');          // Trim hyphens
}

async function parseCSV<T>(filePath: string): Promise<T[]> {
  const results: T[] = [];
  const fileStream = createReadStream(filePath);
  const rl = createInterface({ input: fileStream, crlfDelay: Infinity });

  let headers: string[] = [];
  let isFirst = true;

  for await (const line of rl) {
    if (isFirst) {
      headers = parseCSVLine(line);
      isFirst = false;
      continue;
    }

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || '';
    });
    results.push(row as T);
  }

  return results;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

async function main() {
  console.log('Reading CSV files...');

  const artistRows = await parseCSV<ArtistRow>('/tmp/artists.csv');
  const albumRows = await parseCSV<AlbumRow>('/tmp/albums.csv');
  const trackRows = await parseCSV<TrackRow>('/tmp/tracks.csv');

  console.log(`  Artists: ${artistRows.length}`);
  console.log(`  Albums: ${albumRows.length}`);
  console.log(`  Tracks: ${trackRows.length}`);

  // Build lookup maps: mbid -> our id
  const artistIdMap = new Map<string, string>();
  const albumIdMap = new Map<string, string>();

  // Transform artists
  console.log('Transforming artists...');
  const artists = artistRows.map((row, i) => {
    const id = `artist-${i + 1}`;
    artistIdMap.set(row.mbid, id);
    return {
      id,
      name: row.name,
      slug: slugify(row.name),
    };
  });

  // Handle duplicate slugs for artists
  const artistSlugCount = new Map<string, number>();
  for (const artist of artists) {
    const count = artistSlugCount.get(artist.slug) || 0;
    if (count > 0) {
      artist.slug = `${artist.slug}-${count + 1}`;
    }
    artistSlugCount.set(artist.slug.replace(/-\d+$/, ''), count + 1);
  }

  // Transform albums
  console.log('Transforming albums...');
  const albums = albumRows
    .filter(row => artistIdMap.has(row.artist_mbid)) // Only include if we have the artist
    .map((row, i) => {
      const id = `album-${i + 1}`;
      albumIdMap.set(row.mbid, id);
      return {
        id,
        title: row.title,
        slug: slugify(row.title),
        artistId: artistIdMap.get(row.artist_mbid)!,
        year: parseInt(row.year, 10),
      };
    });

  // Handle duplicate slugs for albums (per artist)
  const albumSlugCount = new Map<string, number>();
  for (const album of albums) {
    const key = `${album.artistId}:${album.slug}`;
    const count = albumSlugCount.get(key) || 0;
    if (count > 0) {
      album.slug = `${album.slug}-${count + 1}`;
    }
    albumSlugCount.set(key.replace(/-\d+$/, ''), count + 1);
  }

  // Transform tracks
  console.log('Transforming tracks...');
  const tracks = trackRows
    .filter(row => albumIdMap.has(row.album_mbid) && artistIdMap.has(row.artist_mbid))
    .map((row, i) => ({
      id: `track-${i + 1}`,
      title: row.title,
      albumId: albumIdMap.get(row.album_mbid)!,
      artistId: artistIdMap.get(row.artist_mbid)!,
      trackNumber: parseInt(row.track_number, 10),
      durationMs: parseInt(row.duration_ms, 10) || 0,
    }));

  console.log('Final counts:');
  console.log(`  Artists: ${artists.length}`);
  console.log(`  Albums: ${albums.length}`);
  console.log(`  Tracks: ${tracks.length}`);

  // Write output
  const outputPath = join(__dirname, '..', 'src', 'data', 'music-1990s.json');
  const output = {
    artists,
    albums,
    tracks,
  };

  console.log(`Writing to ${outputPath}...`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log('Done!');
}

main().catch(console.error);
