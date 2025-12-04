#!/bin/sh
set -e

echo "Pushing database schema..."
npx prisma db push --accept-data-loss

echo "Seeding admin user..."
node prisma/seed-admin.js || echo "Admin seed failed - check logs"

echo "Starting application..."
exec node dist/index.js
