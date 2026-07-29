# Deploying WatchThis to your own server (Docker)

Everything runs in isolated Docker containers (postgres + API + nginx for static),
exposed only on `127.0.0.1:8090`. The host nginx proxies the `watchthis.dev`
domain to that port, so existing projects on the server are not affected.

Quick reference (full step-by-step commands are in the chat / below):

1. Install Docker (if not present) — existing projects are untouched.
2. `git clone https://github.com/lev2gen/watchthis.git /opt/watchthis`
3. `cd /opt/watchthis/deploy && cp .env.example .env` — fill in secrets.
4. `docker compose build && docker compose up -d`
5. Create DB schema once: `docker compose exec api pnpm --filter @workspace/db push-force`
6. Add host nginx vhost from `nginx-host.conf.example`, then `certbot --nginx -d watchthis.dev -d www.watchthis.dev`.

Maintenance:

- Update to latest code: `git pull && docker compose build && docker compose up -d`
- Logs: `docker compose logs -f api`
