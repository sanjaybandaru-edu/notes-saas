#!/bin/sh
set -e

echo "=== EduDocs API Startup ==="
echo "DATABASE_URL is set: $([ -n \"$DATABASE_URL\" ] && echo 'yes' || echo 'NO!')"

echo "Running Prisma db push..."
npx prisma db push --accept-data-loss

echo "Starting application..."
exec node dist/index.js
