#!/bin/sh
set -e
mkdir -p "$(dirname "$DATABASE_PATH")"

if [ -n "$LITESTREAM_BUCKET" ]; then
  # Pull the latest replica on cold start (no-op on a brand-new bucket),
  # then serve while continuously replicating to GCS.
  litestream restore -if-db-not-exists -if-replica-exists \
    -config /etc/litestream.yml "$DATABASE_PATH" || echo "litestream restore skipped"
  exec litestream replicate -config /etc/litestream.yml -exec "node server.js"
else
  exec node server.js
fi
