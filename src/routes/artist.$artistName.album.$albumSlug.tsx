import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/artist/$artistName/album/$albumSlug")({
  component: ArtistAlbumPage,
});

function ArtistAlbumPage() {
  const { artistName, albumSlug } = Route.useParams();
  return (
    <Layout
      selectedArtistName={artistName}
      selectedAlbumTitle={albumSlug}
    />
  );
}
