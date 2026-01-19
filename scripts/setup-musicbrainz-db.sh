#!/bin/bash
set -e

CONTAINER_NAME="musicbrainz-db"

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Container ${CONTAINER_NAME} already exists."
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Container is already running."
  else
    echo "Starting existing container..."
    docker start ${CONTAINER_NAME}
  fi
else
  echo "Creating and starting MusicBrainz database container..."
  echo "This will download ~30GB of data on first run."
  docker run -d \
    --name ${CONTAINER_NAME} \
    -p 5432:5432 \
    -e POSTGRES_USER=musicbrainz \
    -e POSTGRES_PASSWORD=musicbrainz \
    arey/musicbrainz-database
fi

echo "Waiting for database to be ready..."
until docker exec ${CONTAINER_NAME} pg_isready -U musicbrainz -q 2>/dev/null; do
  echo "  Database not ready yet, waiting..."
  sleep 5
done

echo "Database is ready!"
echo ""
echo "Connection info:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: musicbrainz"
echo "  User: musicbrainz"
echo "  Password: musicbrainz"
echo ""
echo "To connect with psql:"
echo "  docker exec -it ${CONTAINER_NAME} psql -U musicbrainz -d musicbrainz"
