FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN apt-get update && apt-get install -y curl sqlite3

FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install
RUN pnpm prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY scripts/start.sh ./start.sh

# Install production dependencies and development dependencies needed for seeding
RUN pnpm install
RUN pnpm add -g typescript ts-node @types/node

# Create data directory
RUN mkdir -p /data && chmod 777 /data

# Make the startup script executable
RUN chmod +x ./start.sh
FROM runner as pre-production
# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma/schema.prisma ./prisma/
COPY --from=builder /app/prisma/seed.ts ./prisma/
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV DATABASE_URL="file:/data/dev.db"

HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["./start.sh"] 