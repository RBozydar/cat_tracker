#!/bin/bash
# Wait for a moment to ensure everything is ready
sleep 2

# Create data directory if it doesn't exist
mkdir -p /data

# Generate Prisma client
npx prisma generate

# Push schema changes and seed the database
DATABASE_URL="file:/data/dev.db" npx prisma db push
DATABASE_URL="file:/data/dev.db" npx prisma db seed

# Start the application
node server.js 