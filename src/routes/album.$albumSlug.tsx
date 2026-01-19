import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/album/$albumSlug")({
  component: AlbumPage,
});

function AlbumPage() {
  const { albumSlug } = Route.useParams();
  return <Layout selectedAlbumSlug={albumSlug} />;
}
