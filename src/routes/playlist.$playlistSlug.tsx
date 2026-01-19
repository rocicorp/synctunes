import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/playlist/$playlistSlug")({
  component: PlaylistPage,
});

function PlaylistPage() {
  const { playlistSlug } = Route.useParams();
  return <Layout selectedPlaylistSlug={playlistSlug} />;
}
