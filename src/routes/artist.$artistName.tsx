import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/artist/$artistName")({
  component: ArtistLayout,
});

function ArtistLayout() {
  return <Outlet />;
}
