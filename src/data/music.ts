export type Artist = {
  id: string;
  name: string;
  slug: string;
};

export type Album = {
  id: string;
  title: string;
  slug: string;
  artistId: string;
  year: number;
};

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // remove punctuation
    .replace(/\s+/g, "-"); // spaces to dashes
}

export type Track = {
  id: string;
  title: string;
  albumId: string;
  artistId: string;
  trackNumber: number;
  durationMs: number;
};

export type Playlist = {
  id: string;
  name: string;
  slug: string;
  trackIds: string[];
};

export const artists: Artist[] = [
  { id: "artist-1", name: "Radiohead", slug: "radiohead" },
  { id: "artist-2", name: "Boards of Canada", slug: "boards-of-canada" },
  { id: "artist-3", name: "Aphex Twin", slug: "aphex-twin" },
  { id: "artist-4", name: "Portishead", slug: "portishead" },
];

export const albums: Album[] = [
  { id: "album-1", title: "OK Computer", slug: "ok-computer", artistId: "artist-1", year: 1997 },
  { id: "album-2", title: "Kid A", slug: "kid-a", artistId: "artist-1", year: 2000 },
  { id: "album-3", title: "Music Has the Right to Children", slug: "music-has-the-right-to-children", artistId: "artist-2", year: 1998 },
  { id: "album-4", title: "Geogaddi", slug: "geogaddi", artistId: "artist-2", year: 2002 },
  { id: "album-5", title: "Selected Ambient Works 85-92", slug: "selected-ambient-works-85-92", artistId: "artist-3", year: 1992 },
  { id: "album-6", title: "Dummy", slug: "dummy", artistId: "artist-4", year: 1994 },
];

export const tracks: Track[] = [
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
];

export const playlists: Playlist[] = [
  { id: "playlist-1", name: "Late Night", slug: "late-night", trackIds: ["track-13", "track-14", "track-15", "track-18"] },
  { id: "playlist-2", name: "90s Favorites", slug: "90s-favorites", trackIds: ["track-1", "track-2", "track-11", "track-16"] },
];

// Helper functions
export function getArtist(id: string): Artist | undefined {
  return artists.find((a) => a.id === id);
}

export function getArtistByName(name: string): Artist | undefined {
  return artists.find((a) => a.name.toLowerCase() === name.toLowerCase());
}

export function getArtistBySlug(slug: string): Artist | undefined {
  return artists.find((a) => a.slug === slug);
}

export function getAlbum(id: string): Album | undefined {
  return albums.find((a) => a.id === id);
}

export function getAlbumByTitle(title: string): Album | undefined {
  return albums.find((a) => a.title.toLowerCase() === title.toLowerCase());
}

export function getAlbumBySlug(slug: string): Album | undefined {
  return albums.find((a) => a.slug === slug);
}

export function getAlbumsByArtist(artistId: string): Album[] {
  return albums.filter((a) => a.artistId === artistId);
}

export function getTracksByAlbum(albumId: string): Track[] {
  return tracks.filter((t) => t.albumId === albumId).sort((a, b) => a.trackNumber - b.trackNumber);
}

export function getTracksByArtist(artistId: string): Track[] {
  return tracks.filter((t) => t.artistId === artistId);
}

export function getPlaylist(id: string): Playlist | undefined {
  return playlists.find((p) => p.id === id);
}

export function getPlaylistByName(name: string): Playlist | undefined {
  return playlists.find((p) => p.name.toLowerCase() === name.toLowerCase());
}

export function getPlaylistBySlug(slug: string): Playlist | undefined {
  return playlists.find((p) => p.slug === slug);
}

export function getPlaylistTracks(playlist: Playlist): Track[] {
  return playlist.trackIds.map((id) => tracks.find((t) => t.id === id)).filter(Boolean) as Track[];
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
