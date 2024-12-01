FROM node:22-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable && \
    apt-get update && \
    apt-get install -y --no-install-recommends sqlite3 openssl ca-certificates && \
    pnpm install --prod && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
RUN pnpm install

# Then copy the rest
COPY . .
ENV DATABASE_URL=file:/data/dev.db
RUN pnpm prisma generate
RUN pnpm build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
# ENV DATABASE_URL="file:/data/dev.db"

# Only copy production necessities
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./pnpm-lock.yaml* ./
COPY scripts/start.sh ./

# Install only production deps
RUN corepack enable && \
    apt-get update && \
    apt-get install -y --no-install-recommends sqlite3 openssl ca-certificates && \
    pnpm install --prod && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

RUN mkdir -p /data && chmod 777 /data
RUN chmod +x ./start.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["./start.sh"] 