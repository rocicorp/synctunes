import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/playlist/$playlistName")({
  component: PlaylistPage,
});

function PlaylistPage() {
  const { playlistName } = Route.useParams();
  return <Layout selectedPlaylistName={playlistName} />;
}
