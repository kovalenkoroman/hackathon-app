#!/bin/bash
# Seed test data into the database

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set. Using default: postgres://postgres:postgres@localhost:5432/chatapp"
  DATABASE_URL="postgres://postgres:postgres@localhost:5432/chatapp"
fi

echo "Loading seed data into database..."
psql "$DATABASE_URL" -f seed.sql

echo "✅ Seed data loaded successfully!"
echo ""
echo "Test users created (password: password123):"
echo "  - alice / alice@example.com"
echo "  - bob / bob@example.com"
echo "  - charlie / charlie@example.com"
echo "  - diana / diana@example.com"
echo "  - eve / eve@example.com"
