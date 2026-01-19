import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "../components/Layout";

export const Route = createFileRoute("/artist/$artistName/")({
  component: ArtistIndexPage,
});

function ArtistIndexPage() {
  const { artistName } = Route.useParams();
  return <Layout selectedArtistName={artistName} />;
}
