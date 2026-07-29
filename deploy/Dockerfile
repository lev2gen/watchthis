# Multi-stage build for WatchThis (frontend prerender + API server)
FROM node:22-bookworm AS builder

# Chromium is required by prerender.mjs (SSG) at build time
RUN apt-get update && apt-get install -y --no-install-recommends chromium ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm i -g pnpm@10

WORKDIR /app
COPY . .

RUN pnpm install --frozen-lockfile

# Build static site (vite build + prerender to dist/public)
ENV NODE_ENV=production
RUN cd artifacts/watchthis && BASE_PATH=/ PORT=4999 pnpm run build

# Build API server bundle
RUN cd artifacts/api-server && pnpm run build

# ---------------------------------------------------------------------------
FROM node:22-bookworm AS api

# Chromium is required at runtime by the render checker and re-prerender
RUN apt-get update && apt-get install -y --no-install-recommends chromium ca-certificates fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

RUN npm i -g pnpm@10

WORKDIR /app
COPY --from=builder /app /app

ENV NODE_ENV=production

# On start: publish the prerendered static site into the shared volume, then run the API
CMD ["sh", "-c", "mkdir -p /static && cp -r /app/artifacts/watchthis/dist/public/. /static/ && node /app/artifacts/api-server/dist/index.mjs"]
