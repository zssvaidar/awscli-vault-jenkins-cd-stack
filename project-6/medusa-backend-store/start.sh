#!/bin/sh
set -e

cd apps/backend

echo "Running Medusa migrations..."
npx medusa db:migrate

echo "Starting Medusa develop server..."
npx medusa develop
