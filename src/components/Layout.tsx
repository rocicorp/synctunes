import { Link } from "@tanstack/react-router";
import {
  artists,
  albums,
  playlists,
  tracks,
  getAlbumsByArtist,
  getTracksByAlbum,
  getTracksByArtist,
  getArtist,
  getAlbum,
  getPlaylistByName,
  getPlaylistTracks,
  formatDuration,
  type Track,
  type Album,
} from "../data/music";

type LayoutProps = {
  selectedArtistName?: string;
  selectedAlbumTitle?: string;
  selectedPlaylistName?: string;
};

export function Layout({
  selectedArtistName,
  selectedAlbumTitle,
  selectedPlaylistName,
}: LayoutProps) {
  const selectedArtist = selectedArtistName
    ? artists.find(
        (a) => a.name.toLowerCase() === selectedArtistName.toLowerCase()
      )
    : undefined;

  const selectedAlbum = selectedAlbumTitle
    ? albums.find(
        (a) => a.title.toLowerCase() === selectedAlbumTitle.toLowerCase()
      )
    : undefined;

  const selectedPlaylist = selectedPlaylistName
    ? getPlaylistByName(selectedPlaylistName)
    : undefined;

  // Artists pane always shows all artists
  const displayedArtists = artists;

  // Albums: if artist selected, show that artist's albums; otherwise show all
  let displayedAlbums: Album[] = [];
  if (selectedArtist) {
    displayedAlbums = getAlbumsByArtist(selectedArtist.id);
  } else {
    displayedAlbums = albums;
  }

  // Tracks: prioritize album > artist > all
  let displayedTracks: Track[] = [];
  if (selectedPlaylist) {
    displayedTracks = getPlaylistTracks(selectedPlaylist);
  } else if (selectedAlbum) {
    displayedTracks = getTracksByAlbum(selectedAlbum.id);
  } else if (selectedArtist) {
    displayedTracks = getTracksByArtist(selectedArtist.id);
  } else {
    displayedTracks = tracks;
  }

  const isPlaylistMode = !!selectedPlaylist;

  return (
    <div className={`layout ${isPlaylistMode ? "layout-playlist" : ""}`}>
      {/* Playlists pane */}
      <div className="pane pane-playlists">
        <div className="pane-header">Playlists</div>
        <Link
          to="/"
          className={`list-item ${!selectedPlaylistName && !selectedArtistName && !selectedAlbumTitle ? "selected" : ""}`}
        >
          All Music
        </Link>
        {playlists.map((playlist) => (
          <Link
            key={playlist.id}
            to="/playlist/$playlistName"
            params={{ playlistName: playlist.name }}
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
              to="/artist/$artistName"
              params={{ artistName: artist.name }}
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
            const artist = getArtist(album.artistId);
            // Context-aware links: if artist selected, nest under artist; otherwise use /album/
            const linkProps = selectedArtist
              ? {
                  to: "/artist/$artistName/album/$albumSlug" as const,
                  params: { artistName: selectedArtist.name, albumSlug: album.title },
                }
              : {
                  to: "/album/$albumTitle" as const,
                  params: { albumTitle: album.title },
                };

            return (
              <Link
                key={album.id}
                {...linkProps}
                className={`list-item ${selectedAlbum?.id === album.id ? "selected" : ""}`}
              >
                <div>{album.title}</div>
                {!selectedArtist && (
                  <div style={{ color: "#999", fontSize: "11px" }}>
                    {artist?.name}
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
        {displayedTracks.length === 0 ? (
          <div className="empty-state">No tracks</div>
        ) : (
          displayedTracks.map((track) => {
            const album = getAlbum(track.albumId);
            const artist = getArtist(track.artistId);
            return (
              <div key={track.id} className="track-row">
                <span className="track-number">{track.trackNumber}</span>
                <span>
                  {track.title}
                  {!selectedAlbum && !selectedPlaylist && (
                    <span style={{ color: "#999", marginLeft: 8 }}>
                      {artist?.name} — {album?.title}
                    </span>
                  )}
                  {selectedPlaylist && (
                    <span style={{ color: "#999", marginLeft: 8 }}>
                      {artist?.name} — {album?.title}
                    </span>
                  )}
                </span>
                <span className="track-duration">
                  {formatDuration(track.durationMs)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
