#!/bin/sh
set -e

echo "Running Prisma db push..."
npx prisma db push --accept-data-loss

echo "Running database seed..."
npx prisma db seed || echo "Seeding skipped or failed (may already exist)"

echo "Starting application..."
node dist/index.js
