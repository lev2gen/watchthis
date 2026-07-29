/**
 * Post-build prerender (SSG): renders every route of the built app with a
 * headless browser and writes complete static HTML files into dist/public,
 * plus sitemap.xml and robots.txt. This guarantees Googlebot (and curl) sees
 * full content — titles, meta, canonical, JSON-LD, text — without executing JS.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const SITE_ORIGIN = 'https://watchthis.dev';

const ROUTES = [
  '/',
  '/tools/javascript-seo-checker',
];

const dir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(dir, 'dist/public');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.json': 'application/json',
};

// Tiny static file server with SPA fallback for the built app
async function startServer() {
  const indexHtml = await readFile(path.join(outDir, 'index.html'));
  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const filePath = path.join(outDir, urlPath);
    if (filePath.startsWith(outDir) && existsSync(filePath) && path.extname(filePath)) {
      res.setHeader('content-type', MIME[path.extname(filePath)] ?? 'application/octet-stream');
      res.end(await readFile(filePath));
      return;
    }
    res.setHeader('content-type', 'text/html');
    res.end(indexHtml);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

function chromiumPath() {
  return execSync('command -v chromium || command -v chromium-browser', { encoding: 'utf8' })
    .trim().split('\n')[0];
}

const server = await startServer();
const { port } = server.address();
const browser = await chromium.launch({
  executablePath: chromiumPath(),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

try {
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.error('pageerror:', String(err)));
  // Block external requests (fonts, APIs) so prerender is fast and deterministic
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  // Content overrides: read the real values from the database when available
  // so edited texts are baked into the prerendered static HTML.
  let contentJson = '{}';
  if (process.env.DATABASE_URL) {
    try {
      const { default: pg } = await import('pg');
      const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
      await client.connect();
      const { rows } = await client.query('SELECT key, value FROM content_entries');
      await client.end();
      contentJson = JSON.stringify(Object.fromEntries(rows.map((r) => [r.key, r.value])));
      console.log(`prerender: loaded ${rows.length} content override(s) from DB`);
    } catch (err) {
      console.warn('prerender: could not load content from DB, using defaults:', String(err));
    }
  }
  await page.route('**/api/content', (route) =>
    route.fulfill({ contentType: 'application/json', body: contentJson }),
  );

  await page.route('**/api/checks/recent', (route) =>
    route.fulfill({ contentType: 'application/json', body: '[]' }),
  );
  await page.route('**/api/stats', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ totalChecks: 0, lowCount: 0, mediumCount: 0, highCount: 0 }),
    }),
  );

  for (const route of ROUTES) {
    await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(250);
    const html = '<!DOCTYPE html>\n' + (await page.content()).replace(/^<!DOCTYPE html>\s*/i, '');
    const target = route === '/'
      ? path.join(outDir, 'index.html')
      : path.join(outDir, route.slice(1), 'index.html');
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, html);
    console.log(`prerendered ${route} -> ${path.relative(outDir, target)} (${html.length} bytes)`);
  }
} finally {
  await browser.close();
  server.close();
}

// sitemap.xml
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${ROUTES.map((r) => {
  const loc = `${SITE_ORIGIN}${r === '/' ? '/' : `${r}/`}`;
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <xhtml:link rel="alternate" hreflang="en" href="${loc}"/>\n  </url>`;
}).join('\n')}
</urlset>
`;
await writeFile(path.join(outDir, 'sitemap.xml'), sitemap);

// robots.txt
await writeFile(
  path.join(outDir, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
);

console.log('sitemap.xml and robots.txt written');
