#!/usr/bin/env npx tsx
/**
 * Extract 1990s music data from MusicBrainz JSON dumps.
 *
 * Streams through the dumps to avoid loading everything into memory.
 *
 * Usage: npx tsx scripts/extract-1990s-json.ts
 */

import { createReadStream, createWriteStream, writeFileSync } from 'fs';
import { createInterface } from 'readline';
import { createGunzip } from 'zlib';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

const DUMP_DIR = '/tmp/musicbrainz-json';
const OUTPUT_DIR = join(__dirname, '..', 'src', 'data');

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

  // Extract the tar.xz to stdout and pipe through
  // The JSON file inside is named like "release-group" (no extension)
  const baseName = filename.replace('.tar.xz', '');

  const proc = exec(`tar -xJf "${tarPath}" -O ${baseName}`, {
    maxBuffer: 1024 * 1024 * 100, // 100MB buffer
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
  console.log('=== MusicBrainz 1990s Data Extraction ===\n');

  // Step 1: Find all release groups from 1990-1999 (albums only)
  console.log('Step 1: Finding 1990s albums...');
  const ninetiesAlbums = new Map<string, {
    id: string;
    title: string;
    year: number;
    artistId: string;
    artistName: string;
  }>();
  const artistIds = new Set<string>();

  let rgCount = 0;
  for await (const rg of streamJsonDump<ReleaseGroup>('release-group.tar.xz')) {
    rgCount++;
    if (rgCount % 100000 === 0) {
      console.log(`  Processed ${rgCount} release groups, found ${ninetiesAlbums.size} 1990s albums...`);
    }

    // Check if it's from the 1990s
    const dateStr = rg['first-release-date'];
    if (!dateStr) continue;

    const year = parseInt(dateStr.substring(0, 4), 10);
    if (year < 1990 || year > 1999) continue;

    // Only albums (not singles, EPs, etc.)
    if (rg['primary-type'] !== 'Album') continue;

    // Get primary artist
    const artistCredit = rg['artist-credit']?.[0];
    if (!artistCredit?.artist) continue;

    ninetiesAlbums.set(rg.id, {
      id: rg.id,
      title: rg.title,
      year,
      artistId: artistCredit.artist.id,
      artistName: artistCredit.artist.name,
    });
    artistIds.add(artistCredit.artist.id);
  }

  console.log(`  Found ${ninetiesAlbums.size} albums from the 1990s`);
  console.log(`  From ${artistIds.size} unique artists\n`);

  // Step 2: Get artist details
  console.log('Step 2: Loading artist details...');
  const artists = new Map<string, { id: string; name: string; sortName: string }>();

  let artistCount = 0;
  for await (const artist of streamJsonDump<Artist>('artist.tar.xz')) {
    artistCount++;
    if (artistCount % 100000 === 0) {
      console.log(`  Processed ${artistCount} artists...`);
    }

    if (artistIds.has(artist.id)) {
      artists.set(artist.id, {
        id: artist.id,
        name: artist.name,
        sortName: artist['sort-name'],
      });
    }
  }

  console.log(`  Loaded ${artists.size} artists\n`);

  // Step 3: Get tracks from releases
  console.log('Step 3: Loading tracks from releases...');
  const albumReleaseIds = new Set<string>();
  const tracks: Array<{
    id: string;
    title: string;
    albumId: string;
    artistId: string;
    trackNumber: number;
    durationMs: number;
  }> = [];

  // We need to find one release per release-group to get tracks
  const albumsWithTracks = new Set<string>();

  let releaseCount = 0;
  for await (const release of streamJsonDump<Release>('release.tar.xz')) {
    releaseCount++;
    if (releaseCount % 100000 === 0) {
      console.log(`  Processed ${releaseCount} releases, found tracks for ${albumsWithTracks.size} albums...`);
    }

    const rgId = release['release-group']?.id;
    if (!rgId || !ninetiesAlbums.has(rgId)) continue;

    // Skip if we already have tracks for this album
    if (albumsWithTracks.has(rgId)) continue;

    const album = ninetiesAlbums.get(rgId)!;

    // Get tracks from first medium (disc)
    const medium = release.media?.[0];
    if (!medium?.tracks?.length) continue;

    for (const track of medium.tracks) {
      const trackArtistId = track['artist-credit']?.[0]?.artist?.id || album.artistId;

      tracks.push({
        id: track.id,
        title: track.title,
        albumId: rgId,
        artistId: trackArtistId,
        trackNumber: track.position,
        durationMs: track.length || 0,
      });

      // Make sure we have this artist
      if (!artistIds.has(trackArtistId)) {
        artistIds.add(trackArtistId);
      }
    }

    albumsWithTracks.add(rgId);
  }

  console.log(`  Found ${tracks.length} tracks from ${albumsWithTracks.size} albums\n`);

  // Step 4: Transform to our format
  console.log('Step 4: Transforming data...');

  // Create ID mappings
  const artistIdMap = new Map<string, string>();
  const albumIdMap = new Map<string, string>();

  // Transform artists
  const transformedArtists: Array<{ id: string; name: string; slug: string }> = [];
  const artistSlugCount = new Map<string, number>();

  let i = 1;
  for (const [mbid, artist] of artists) {
    const id = `artist-${i++}`;
    artistIdMap.set(mbid, id);

    let slug = slugify(artist.name);
    const count = artistSlugCount.get(slug) || 0;
    if (count > 0) slug = `${slug}-${count + 1}`;
    artistSlugCount.set(slug.replace(/-\d+$/, ''), count + 1);

    transformedArtists.push({ id, name: artist.name, slug });
  }

  // Transform albums (only those with tracks)
  const transformedAlbums: Array<{ id: string; title: string; slug: string; artistId: string; year: number }> = [];
  const albumSlugCount = new Map<string, number>();

  i = 1;
  for (const [mbid, album] of ninetiesAlbums) {
    if (!albumsWithTracks.has(mbid)) continue;

    const artistId = artistIdMap.get(album.artistId);
    if (!artistId) continue;

    const id = `album-${i++}`;
    albumIdMap.set(mbid, id);

    let slug = slugify(album.title);
    const key = `${artistId}:${slug}`;
    const count = albumSlugCount.get(key) || 0;
    if (count > 0) slug = `${slug}-${count + 1}`;
    albumSlugCount.set(key.replace(/-\d+$/, ''), count + 1);

    transformedAlbums.push({ id, title: album.title, slug, artistId, year: album.year });
  }

  // Transform tracks
  const transformedTracks = tracks
    .filter(t => albumIdMap.has(t.albumId) && artistIdMap.has(t.artistId))
    .map((t, idx) => ({
      id: `track-${idx + 1}`,
      title: t.title,
      albumId: albumIdMap.get(t.albumId)!,
      artistId: artistIdMap.get(t.artistId)!,
      trackNumber: t.trackNumber,
      durationMs: t.durationMs,
    }));

  console.log(`\nFinal counts:`);
  console.log(`  Artists: ${transformedArtists.length}`);
  console.log(`  Albums: ${transformedAlbums.length}`);
  console.log(`  Tracks: ${transformedTracks.length}`);

  // Write output
  const output = {
    artists: transformedArtists,
    albums: transformedAlbums,
    tracks: transformedTracks,
  };

  const outputPath = join(OUTPUT_DIR, 'music-1990s.json');
  console.log(`\nWriting to ${outputPath}...`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log('Done!');
}

main().catch(console.error);
