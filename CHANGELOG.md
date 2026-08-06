# Changelog

All notable changes to WatchThis are documented here.

## [0.1.0] — 2026-08-06

Initial public release.

### Added
- URL checker: fetch raw HTML and render the page in headless Chromium, then diff the two versions
- Comparison of title, meta description, canonical, headings, links, word count, and structured data
- LOW / MEDIUM / HIGH risk verdict with concrete findings and recommendations
- SSRF protection, rate limiting, and result caching on the API server
- Check history and stats stored in PostgreSQL
- Fully prerendered static frontend with generated sitemap.xml and robots.txt
