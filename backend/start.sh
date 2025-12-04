#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Starting application..."
exec node dist/index.js
