# WatchThis — JavaScript SEO Render Checker

**Watch what Google sees.** Free developer tool that compares the raw HTML your server sends with the DOM after JavaScript rendering — and tells you whether your content is at risk of being invisible to search engines.

**Live:** [watchthis.dev](https://watchthis.dev)

![WatchThis — compare raw HTML with the rendered DOM](docs/screenshot.png)

## What it does

Paste a URL and WatchThis will:

1. Fetch the **raw HTML** (what crawlers get on the first request).
2. Render the page in **headless Chromium** (what Googlebot sees after JS execution).
3. Compare both versions — title, meta description, canonical, headings, links, word count, structured data.
4. Give a **LOW / MEDIUM / HIGH** risk verdict with concrete findings and recommendations.

The site itself is fully prerendered to static HTML (curl-verifiable — practice what we preach). Built by **Lev Gen**, technical SEO specialist with 21 years in the industry.

## Tech stack

- **Frontend:** React 18 + Vite + Tailwind CSS + shadcn/ui (`artifacts/watchthis`), dark-first theme, static prerendering with sitemap/robots generation
- **Backend:** Node.js + Express (`artifacts/api-server`), Playwright-core + system Chromium for rendering, SSRF protection, rate limiting, result caching
- **Database:** PostgreSQL + Drizzle ORM (`lib/db`) — check history and stats
- **API contract:** OpenAPI spec (`lib/api-spec`) with generated Zod schemas and typed React Query client
- **Monorepo:** pnpm workspaces + TypeScript project references

## Repository layout

```
artifacts/
  watchthis/      # frontend (React + Vite) + prerender script
  api-server/     # Express API: /api/check, /api/checks/recent, /api/stats
lib/
  api-spec/       # OpenAPI source of truth
  api-zod/        # generated Zod schemas
  api-client-react/ # generated typed React Query client
  db/             # Drizzle schema + client
```

## Running locally

Requirements: Node.js 20+, pnpm 10+, PostgreSQL, Chromium.

```bash
pnpm install

# environment
export DATABASE_URL=postgres://user:pass@localhost:5432/watchthis
# chromium (or chromium-browser) must be available on PATH — used for rendering

# create tables
pnpm run db:push

# dev servers
PORT=3001 pnpm --filter @workspace/api-server run dev
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/watchthis run dev
```

### Production build

```bash
pnpm --filter @workspace/api-server run build
PORT=3000 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/watchthis run build
```

The frontend build prerenders every route to static HTML in `artifacts/watchthis/dist/public` and writes `sitemap.xml` and `robots.txt`. Serve that directory with any static server and proxy `/api/*` to the API server.

## Roadmap & changelog

- [ROADMAP.md](ROADMAP.md) — what's planned next
- [CHANGELOG.md](CHANGELOG.md) — release history

## License

[MIT](LICENSE) © Lev Gen
