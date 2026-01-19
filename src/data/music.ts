import {createCollection, localOnlyCollectionOptions} from "@tanstack/react-db"
import * as z from "zod"

const artistSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
})

export type Artist = z.infer<typeof artistSchema>;

const albumSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  artistId: z.string(),
  year: z.number(),
})

export type Album = z.infer<typeof albumSchema>;

const trackSchema = z.object({
  id: z.string(),
  title: z.string(),
  albumId: z.string(),
  artistId: z.string(),
  trackNumber: z.number(),
  durationMs: z.number(),
})
export type Track = z.infer<typeof trackSchema>;

const playlistSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
})
export type Playlist = z.infer<typeof playlistSchema>;

const playlistEntrySchema = z.object({
  id: z.string(),
  playlistId: z.string(),
  trackId: z.string(),
  trackNumber: z.string(),
})
export type PlaylistEntry = z.infer<typeof playlistEntrySchema>;

export const artists = createCollection(
  localOnlyCollectionOptions({
    id: 'artists',
    schema: artistSchema,
    getKey: (artist) => artist.id,
    initialData: [
      { id: "artist-1", name: "Radiohead", slug: "radiohead" },
      { id: "artist-2", name: "Boards of Canada", slug: "boards-of-canada" },
      { id: "artist-3", name: "Aphex Twin", slug: "aphex-twin" },
      { id: "artist-4", name: "Portishead", slug: "portishead" },
    ],
  })
)

export const albums = createCollection(
  localOnlyCollectionOptions({
    id: 'albums',
    schema: albumSchema,
    getKey: (album) => album.id,
    initialData: [
      { id: "album-1", title: "OK Computer", slug: "ok-computer", artistId: "artist-1", year: 1997 },
      { id: "album-2", title: "Kid A", slug: "kid-a", artistId: "artist-1", year: 2000 },
      { id: "album-3", title: "Music Has the Right to Children", slug: "music-has-the-right-to-children", artistId: "artist-2", year: 1998 },
      { id: "album-4", title: "Geogaddi", slug: "geogaddi", artistId: "artist-2", year: 2002 },
      { id: "album-5", title: "Selected Ambient Works 85-92", slug: "selected-ambient-works-85-92", artistId: "artist-3", year: 1992 },
      { id: "album-6", title: "Dummy", slug: "dummy", artistId: "artist-4", year: 1994 },
    ],
  })
)

export const tracks = createCollection(
  localOnlyCollectionOptions({
    id: 'tracks',
    schema: trackSchema,
    getKey: (track) => track.id,
    initialData: [
      { id: "track-1", title: "Airbag", albumId: "album-1", artistId: "artist-1", trackNumber: 1, durationMs: 284000 },
      { id: "track-2", title: "Paranoid Android", albumId: "album-1", artistId: "artist-1", trackNumber: 2, durationMs: 383000 },
      { id: "track-3", title: "Subterranean Homesick Alien", albumId: "album-1", artistId: "artist-1", trackNumber: 3, durationMs: 257000 },
      { id: "track-4", title: "Exit Music (For a Film)", albumId: "album-1", artistId: "artist-1", trackNumber: 4, durationMs: 262000 },
      { id: "track-5", title: "Let Down", albumId: "album-1", artistId: "artist-1", trackNumber: 5, durationMs: 298000 },
      { id: "track-6", title: "Everything In Its Right Place", albumId: "album-2", artistId: "artist-1", trackNumber: 1, durationMs: 250000 },
      { id: "track-7", title: "Kid A", albumId: "album-2", artistId: "artist-1", trackNumber: 2, durationMs: 273000 },
      { id: "track-8", title: "The National Anthem", albumId: "album-2", artistId: "artist-1", trackNumber: 3, durationMs: 351000 },
      { id: "track-9", title: "Wildlife Analysis", albumId: "album-3", artistId: "artist-2", trackNumber: 1, durationMs: 298000 },
      { id: "track-10", title: "An Eagle in Your Mind", albumId: "album-3", artistId: "artist-2", trackNumber: 2, durationMs: 393000 },
      { id: "track-11", title: "Roygbiv", albumId: "album-3", artistId: "artist-2", trackNumber: 5, durationMs: 142000 },
      { id: "track-12", title: "Music Is Math", albumId: "album-4", artistId: "artist-2", trackNumber: 1, durationMs: 290000 },
      { id: "track-13", title: "Xtal", albumId: "album-5", artistId: "artist-3", trackNumber: 1, durationMs: 293000 },
      { id: "track-14", title: "Tha", albumId: "album-5", artistId: "artist-3", trackNumber: 2, durationMs: 540000 },
      { id: "track-15", title: "Mysterons", albumId: "album-6", artistId: "artist-4", trackNumber: 1, durationMs: 305000 },
      { id: "track-16", title: "Sour Times", albumId: "album-6", artistId: "artist-4", trackNumber: 2, durationMs: 254000 },
      { id: "track-17", title: "Strangers", albumId: "album-6", artistId: "artist-4", trackNumber: 3, durationMs: 227000 },
      { id: "track-18", title: "Glory Box", albumId: "album-6", artistId: "artist-4", trackNumber: 10, durationMs: 305000 },
    ],
  })
)

export const playlistEntries = createCollection(
  localOnlyCollectionOptions({
    id: 'playlistEntries',
    schema: playlistEntrySchema,
    getKey: (playlistEntry) => playlistEntry.id,
    initialData: [
      { id: "playlistEntry-1", playlistId: "playlist-1", trackId: "track-13", trackNumber: "a" },
      { id: "playlistEntry-2", playlistId: "playlist-1", trackId: "track-14", trackNumber: "b" },
      { id: "playlistEntry-3", playlistId: "playlist-1", trackId: "track-15", trackNumber: "c" },
      { id: "playlistEntry-4", playlistId: "playlist-1", trackId: "track-18", trackNumber: "d" },
      { id: "playlistEntry-5", playlistId: "playlist-2", trackId: "track-1", trackNumber: "a" },
      { id: "playlistEntry-6", playlistId: "playlist-2", trackId: "track-2", trackNumber: "b" },
      { id: "playlistEntry-7", playlistId: "playlist-2", trackId: "track-11", trackNumber: "c" },
      { id: "playlistEntry-8", playlistId: "playlist-2", trackId: "track-16", trackNumber: "d" },
    ],
  })
)

export const playlists = createCollection(
  localOnlyCollectionOptions({
    id: 'playlists',
    schema: playlistSchema,
    getKey: (playlist) => playlist.id,
    initialData: [
      { id: "playlist-1", name: "Late Night", slug: "late-night" },
      { id: "playlist-2", name: "90s Favorites", slug: "90s-favorites" },
    ],
  })
)

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
