import { Link } from "@tanstack/react-router";
import {
  artists,
  albums,
  playlists,
  tracks,
  playlistEntries,
  formatDuration,
  type Track,
} from "../data/music";
import { eq, InitialQueryBuilder, useLiveQuery } from "@tanstack/react-db";

type LayoutProps = {
  selectedArtistSlug?: string;
  selectedAlbumSlug?: string;
  selectedPlaylistSlug?: string;
};

export function Layout({
  selectedArtistSlug,
  selectedAlbumSlug,
  selectedPlaylistSlug,
}: LayoutProps) {
  const {data: selectedArtist} = useLiveQuery(
    q => q.from({artist: artists}).where(({artist}) => eq(artist.slug, selectedArtistSlug)).findOne()
    , [selectedArtistSlug]
  )

  const {data: selectedAlbum} = useLiveQuery(
    q => q.from({album: albums}).where(({album}) => eq(album.slug, selectedAlbumSlug)).findOne()
    , [selectedAlbumSlug]
  )

  const {data: selectedPlaylist} = useLiveQuery(
    q => q.from({playlist: playlists}).where(({playlist}) => eq(playlist.slug, selectedPlaylistSlug)).findOne()
    , [selectedPlaylistSlug]
  )

  // Artists pane always shows all artists
  const displayedArtists = artists;

  // Albums: if artist selected, show that artist's albums; otherwise show all
  const {data: displayedAlbums} = useLiveQuery(
    q => selectedArtist ? q.from({album: albums}).where(({album}) => eq(album.artistId, selectedArtist.id)) : q.from({album: albums}),
    [selectedArtist]
  )

  const getPlaylistTracks = (iq: InitialQueryBuilder, playlistId: string) => {
    return iq.from({entry: playlistEntries})
      .where(({entry}) => eq(entry.playlistId, playlistId))
      .innerJoin({track:tracks}, ({entry, track}) => eq(entry.trackId, track.id))
      .orderBy(({entry}) => entry.trackNumber)
      .select(({track}) => ({...track}))
  }

  const getNonPlaylistTracks = (iq: InitialQueryBuilder, artistId: string|undefined, albumId: string|undefined) => {
    let q = iq.from({artist: artists})
      .innerJoin({album:albums}, ({artist, album}) => eq(artist.id, album.artistId))
      .innerJoin({track:tracks}, ({album, track}) => eq(album.id, track.albumId))
      .orderBy(({artist}) => artist.name)
      .orderBy(({album}) => album.title)
      .orderBy(({track}) => track.trackNumber)
      .select(({track}) => ({...track}))

    if (artistId) {
      q = q.where(({artist}) => eq(artist.id, artistId));
    }

    if (albumId) {
      q = q.where(({album}) => eq(album.id, albumId));
    }

    return q;
  }

  const isPlaylistMode = !!selectedPlaylist;

  const {data: playlistTracks} = useLiveQuery(
    q => isPlaylistMode ? getPlaylistTracks(q, selectedPlaylist.id) : undefined,
    [selectedPlaylist]
  )

  const {data: nonPlaylistTracks} = useLiveQuery(
    q => !isPlaylistMode ? getNonPlaylistTracks(q, selectedArtist?.id, selectedAlbum?.id) : undefined,
    [selectedArtist, selectedAlbum]
  )

  const displayedTracks = playlistTracks || nonPlaylistTracks;

  return (
    <div className={`layout ${isPlaylistMode ? "layout-playlist" : ""}`}>
      {/* Playlists pane */}
      <div className="pane pane-playlists">
        <div className="pane-header">Playlists</div>
        <Link
          to="/"
          className={`list-item ${!selectedPlaylistSlug && !selectedArtistSlug && !selectedAlbumSlug ? "selected" : ""}`}
        >
          All Music
        </Link>
        {playlists.map((playlist) => (
          <Link
            key={playlist.id}
            to="/playlist/$playlistSlug"
            params={{ playlistSlug: playlist.slug }}
            className={`list-item ${selectedPlaylist?.id === playlist.id ? "selected" : ""}`}
          >
            {playlist.name}
          </Link>
        ))}
      </div>

      {/* Artists pane - hidden in playlist mode */}
      {!isPlaylistMode && (
        <div className="pane pane-artists">
          <div className="pane-header">Artists</div>
          {displayedArtists.map((artist) => (
            <Link
              key={artist.id}
              to="/artist/$artistSlug"
              params={{ artistSlug: artist.slug }}
              className={`list-item ${selectedArtist?.id === artist.id ? "selected" : ""}`}
            >
              {artist.name}
            </Link>
          ))}
        </div>
      )}

      {/* Albums pane - hidden in playlist mode */}
      {!isPlaylistMode && (
        <div className="pane pane-albums">
          <div className="pane-header">Albums</div>
          {displayedAlbums.map((album) => {
            // Context-aware links: if artist selected, nest under artist; otherwise use /album/
            const linkProps = selectedArtist
              ? {
                  to: "/artist/$artistSlug/album/$albumSlug" as const,
                  params: { artistSlug: selectedArtist.slug, albumSlug: album.slug },
                }
              : {
                  to: "/album/$albumSlug" as const,
                  params: { albumSlug: album.slug },
                };

            return (
              <Link
                key={album.id}
                {...linkProps}
                className={`list-item ${selectedAlbum?.id === album.id ? "selected" : ""}`}
              >
                <div>{album.title}</div>
                {selectedArtist && (
                  <div style={{ color: "#999", fontSize: "11px" }}>
                    {selectedArtist?.slug}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Tracks pane */}
      <div className="pane pane-tracks">
        <div className="pane-header">
          {selectedPlaylist
            ? selectedPlaylist.name
            : selectedAlbum
              ? selectedAlbum.title
              : selectedArtist
                ? selectedArtist.name
                : "All Tracks"}
        </div>
        {displayedTracks?.length === 0 ? (
          <div className="empty-state">No tracks</div>
        ) : (
          displayedTracks?.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              showMeta={!!selectedPlaylist || !selectedAlbum}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TrackRow({ track, showMeta = false }: { track: Track; showMeta?: boolean }) {
  const { data: album } = useLiveQuery(
    (q) => showMeta ? q.from({ album: albums }).where(({ album }) => eq(album.id, track.albumId)).findOne() : undefined,
    [track.albumId]
  );

  const { data: artist } = useLiveQuery(
    (q) => showMeta ? q.from({ artist: artists }).where(({ artist }) => eq(artist.id, track.artistId)).findOne() : undefined,
    [track.artistId]
  );

  return (
    <div className="track-row">
      <span>
        {track.title}
        {showMeta && (
          <span style={{ color: "#999", marginLeft: 8 }}>
            {artist?.name} — {album?.title}
          </span>
        )}
      </span>
      <span className="track-duration">{formatDuration(track.durationMs)}</span>
    </div>
  );
}
