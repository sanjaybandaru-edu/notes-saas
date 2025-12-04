#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Seeding admin user..."
npx tsx prisma/seed-admin.ts || echo "Admin seed failed - check logs"

echo "Starting application..."
exec node dist/index.js
