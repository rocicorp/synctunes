import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/artist/$artistSlug")({
  component: ArtistLayout,
});

function ArtistLayout() {
  return <Outlet />;
}
