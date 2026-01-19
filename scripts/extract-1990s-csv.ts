#!/usr/bin/env npx tsx
/**
 * Extract 1990s music data from MusicBrainz JSON dumps to CSV files.
 *
 * Streams through the dumps to avoid loading everything into memory.
 * Outputs CSV files ready for Postgres COPY import.
 *
 * Usage: npx tsx scripts/extract-1990s-csv.ts
 */

import { createWriteStream, mkdirSync } from 'fs';
import { createInterface } from 'readline';
import { exec } from 'child_process';
import { join } from 'path';

const DUMP_DIR = process.env.DUMP_DIR || '/tmp/musicbrainz-json';
const OUTPUT_DIR = process.env.OUTPUT_DIR || join(__dirname, '..', 'data', 'musicbrainz-1990s');

interface Artist {
  id: string;
  name: string;
  'sort-name': string;
}

interface ReleaseGroup {
  id: string;
  title: string;
  'first-release-date': string;
  'primary-type': string;
  'artist-credit': Array<{
    artist: { id: string; name: string };
    name?: string;
    joinphrase?: string;
  }>;
}

interface Release {
  id: string;
  title: string;
  'release-group': { id: string };
  media: Array<{
    position: number;
    tracks: Array<{
      id: string;
      title: string;
      position: number;
      length: number;
      'artist-credit': Array<{
        artist: { id: string };
      }>;
    }>;
  }>;
}

function escapeCsv(value: string | number | undefined): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'unnamed';
}

async function* streamJsonDump<T>(filename: string): AsyncGenerator<T> {
  const tarPath = join(DUMP_DIR, filename);

  console.log(`Extracting and streaming ${filename}...`);

  const baseName = filename.replace('.tar.xz', '');

  const proc = exec(`tar -xJf "${tarPath}" -O ${baseName}`, {
    maxBuffer: 1024 * 1024 * 100,
  });

  if (!proc.stdout) throw new Error('No stdout');

  const rl = createInterface({
    input: proc.stdout,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    if (line.trim()) {
      try {
        yield JSON.parse(line) as T;
      } catch (e) {
        // Skip malformed lines
      }
    }
  }
}

async function main() {
  console.log('=== MusicBrainz 1990s Data Extraction (CSV) ===\n');
  console.log(`Input: ${DUMP_DIR}`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Open CSV writers
  const artistsFile = createWriteStream(join(OUTPUT_DIR, 'artists.csv'));
  const albumsFile = createWriteStream(join(OUTPUT_DIR, 'albums.csv'));
  const albumArtistsFile = createWriteStream(join(OUTPUT_DIR, 'album_artists.csv'));
  const tracksFile = createWriteStream(join(OUTPUT_DIR, 'tracks.csv'));
  const trackArtistsFile = createWriteStream(join(OUTPUT_DIR, 'track_artists.csv'));

  // Write headers
  artistsFile.write('id,name,slug\n');
  albumsFile.write('id,title,slug,year\n');
  albumArtistsFile.write('album_id,artist_id,position\n');
  tracksFile.write('id,title,album_id,track_number,duration_ms\n');
  trackArtistsFile.write('track_id,artist_id,position\n');

  // Step 1: Find all release groups from 1990-1999 (albums only)
  console.log('Step 1: Finding 1990s albums...');
  const ninetiesAlbums = new Map<string, {
    id: string;
    title: string;
    year: number;
    artistCredits: Array<{ artistId: string; artistName: string; position: number }>;
  }>();
  const artistIds = new Set<string>();

  let rgCount = 0;
  for await (const rg of streamJsonDump<ReleaseGroup>('release-group.tar.xz')) {
    rgCount++;
    if (rgCount % 100000 === 0) {
      console.log(`  Processed ${rgCount} release groups, found ${ninetiesAlbums.size} 1990s albums...`);
    }

    const dateStr = rg['first-release-date'];
    if (!dateStr) continue;

    const year = parseInt(dateStr.substring(0, 4), 10);
    if (year < 1990 || year > 1999) continue;

    if (rg['primary-type'] !== 'Album') continue;

    const artistCredits = (rg['artist-credit'] || [])
      .filter(ac => ac.artist?.id)
      .map((ac, idx) => ({
        artistId: ac.artist.id,
        artistName: ac.artist.name,
        position: idx,
      }));

    if (artistCredits.length === 0) continue;

    ninetiesAlbums.set(rg.id, {
      id: rg.id,
      title: rg.title,
      year,
      artistCredits,
    });

    for (const ac of artistCredits) {
      artistIds.add(ac.artistId);
    }
  }

  console.log(`  Found ${ninetiesAlbums.size} albums from the 1990s`);
  console.log(`  From ${artistIds.size} unique artists\n`);

  // Step 2: Get artist details and write to CSV
  console.log('Step 2: Loading artist details...');
  const artistSlugs = new Map<string, number>();
  let artistsWritten = 0;

  let artistCount = 0;
  for await (const artist of streamJsonDump<Artist>('artist.tar.xz')) {
    artistCount++;
    if (artistCount % 100000 === 0) {
      console.log(`  Processed ${artistCount} artists, written ${artistsWritten}...`);
    }

    if (artistIds.has(artist.id)) {
      let slug = slugify(artist.name);
      const count = artistSlugs.get(slug) || 0;
      if (count > 0) slug = `${slug}-${count + 1}`;
      artistSlugs.set(slug.replace(/-\d+$/, ''), count + 1);

      artistsFile.write(`${escapeCsv(artist.id)},${escapeCsv(artist.name)},${escapeCsv(slug)}\n`);
      artistsWritten++;
    }
  }

  console.log(`  Written ${artistsWritten} artists\n`);

  // Write albums and album_artists
  console.log('Step 3: Writing albums...');
  const albumSlugs = new Map<string, number>();

  for (const [id, album] of ninetiesAlbums) {
    let slug = slugify(album.title);
    const count = albumSlugs.get(slug) || 0;
    if (count > 0) slug = `${slug}-${count + 1}`;
    albumSlugs.set(slug.replace(/-\d+$/, ''), count + 1);

    albumsFile.write(`${escapeCsv(id)},${escapeCsv(album.title)},${escapeCsv(slug)},${album.year}\n`);

    for (const ac of album.artistCredits) {
      albumArtistsFile.write(`${escapeCsv(id)},${escapeCsv(ac.artistId)},${ac.position}\n`);
    }
  }

  console.log(`  Written ${ninetiesAlbums.size} albums\n`);

  // Step 4: Get tracks from releases
  console.log('Step 4: Loading tracks from releases...');
  const albumsWithTracks = new Set<string>();
  let tracksWritten = 0;
  let trackArtistsWritten = 0;

  let releaseCount = 0;
  for await (const release of streamJsonDump<Release>('release.tar.xz')) {
    releaseCount++;
    if (releaseCount % 100000 === 0) {
      console.log(`  Processed ${releaseCount} releases, found tracks for ${albumsWithTracks.size} albums, ${tracksWritten} tracks...`);
    }

    const rgId = release['release-group']?.id;
    if (!rgId || !ninetiesAlbums.has(rgId)) continue;

    if (albumsWithTracks.has(rgId)) continue;

    const album = ninetiesAlbums.get(rgId)!;

    const medium = release.media?.[0];
    if (!medium?.tracks?.length) continue;

    for (const track of medium.tracks) {
      tracksFile.write(`${escapeCsv(track.id)},${escapeCsv(track.title)},${escapeCsv(rgId)},${track.position},${track.length || 0}\n`);
      tracksWritten++;

      // Track artists - use album artists if no specific track artists
      const trackArtistCredits = track['artist-credit']?.filter(ac => ac.artist?.id) || [];

      if (trackArtistCredits.length > 0) {
        for (let i = 0; i < trackArtistCredits.length; i++) {
          const artistId = trackArtistCredits[i].artist.id;
          trackArtistsFile.write(`${escapeCsv(track.id)},${escapeCsv(artistId)},${i}\n`);
          trackArtistsWritten++;

          // Track artist might not be in our artist set yet
          if (!artistIds.has(artistId)) {
            artistIds.add(artistId);
          }
        }
      } else {
        // Fall back to album artists
        for (const ac of album.artistCredits) {
          trackArtistsFile.write(`${escapeCsv(track.id)},${escapeCsv(ac.artistId)},${ac.position}\n`);
          trackArtistsWritten++;
        }
      }
    }

    albumsWithTracks.add(rgId);
  }

  console.log(`  Written ${tracksWritten} tracks from ${albumsWithTracks.size} albums`);
  console.log(`  Written ${trackArtistsWritten} track-artist relationships\n`);

  // Close files
  artistsFile.end();
  albumsFile.end();
  albumArtistsFile.end();
  tracksFile.end();
  trackArtistsFile.end();

  // Note about missing track artists
  console.log('Note: Some track artists may not be in artists.csv if they only appear on');
  console.log('individual tracks but not on any 1990s album. A second pass through');
  console.log('artist.tar.xz would be needed to capture them all.\n');

  console.log('=== Summary ===');
  console.log(`Artists: ${artistsWritten}`);
  console.log(`Albums: ${ninetiesAlbums.size}`);
  console.log(`Albums with tracks: ${albumsWithTracks.size}`);
  console.log(`Tracks: ${tracksWritten}`);
  console.log(`\nOutput written to: ${OUTPUT_DIR}`);
}

main().catch(console.error);
