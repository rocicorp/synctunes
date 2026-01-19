import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/artist/$artistSlug/album/$albumSlug")({
  component: ArtistAlbumPage,
});

function ArtistAlbumPage() {
  const { artistSlug, albumSlug } = Route.useParams();
  return (
    <Layout
      selectedArtistSlug={artistSlug}
      selectedAlbumSlug={albumSlug}
    />
  );
}
