#!/bin/sh

echo "Running Prisma db push..."
npx prisma db push --accept-data-loss || echo "WARNING: db push failed, continuing anyway"

echo "Starting application..."
node dist/index.js
