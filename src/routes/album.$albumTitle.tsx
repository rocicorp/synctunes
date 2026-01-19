import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/album/$albumTitle")({
  component: AlbumPage,
});

function AlbumPage() {
  const { albumTitle } = Route.useParams();
  return <Layout selectedAlbumTitle={albumTitle} />;
}
