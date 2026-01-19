import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/artist/$artistSlug/")({
  component: ArtistIndexPage,
});

function ArtistIndexPage() {
  const { artistSlug } = Route.useParams();
  return <Layout selectedArtistSlug={artistSlug} />;
}
