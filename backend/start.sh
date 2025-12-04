#!/bin/sh
set -e

echo "Starting application..."
exec node dist/src/index.js
