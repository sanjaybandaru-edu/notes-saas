#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Seeding demo data..."
npx tsx prisma/seed.ts || echo "Seed skipped (may already exist)"

echo "Starting application..."
exec node dist/index.js
