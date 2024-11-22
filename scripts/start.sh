#!/bin/bash
set -e  # Exit on error

echo "Starting initialization..."

# Create data directory if it doesn't exist
mkdir -p /data

# Generate Prisma client
echo "Generating Prisma client..."
pnpm prisma generate

# Check if database exists and initialize if needed
if [ ! -f "/data/dev.db" ]; then
    echo "Database not found, initializing..."
    DATABASE_URL="file:/data/dev.db" pnpm prisma db push --accept-data-loss
    echo "Running initial seed..."
    DATABASE_URL="file:/data/dev.db" pnpm prisma db seed
else
    echo "Database exists, checking for schema changes..."
    DATABASE_URL="file:/data/dev.db" pnpm prisma db push
    
    # Check if database is empty and seed if needed
    CATS_COUNT=$(sqlite3 /data/dev.db "SELECT COUNT(*) FROM Cat;")
    if [ "$CATS_COUNT" -eq "0" ]; then
        echo "Database is empty, running seed..."
        DATABASE_URL="file:/data/dev.db" pnpm prisma db seed
    else
        echo "Database already contains data, skipping seed..."
        CATS_DATA=$(sqlite3 /data/dev.db "SELECT * FROM Cat;")
        echo "$CATS_DATA"
    fi
fi

echo "Initialization complete, starting application..."
node server.js 