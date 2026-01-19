#!/bin/bash
set -e

CONTAINER_NAME="musicbrainz-db"

echo "Stopping MusicBrainz database container..."
docker stop ${CONTAINER_NAME} 2>/dev/null || echo "Container not running"

echo "Removing container..."
docker rm ${CONTAINER_NAME} 2>/dev/null || echo "Container not found"

echo "Done!"
echo ""
echo "Note: The Docker image is still cached (~30GB)."
echo "To remove it and free disk space, run:"
echo "  docker rmi arey/musicbrainz-database"
