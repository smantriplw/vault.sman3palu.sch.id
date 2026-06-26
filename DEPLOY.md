# SMANTIVault — Dokploy Deployment Guide

## Overview

Deploy on Dokploy using the pre-built Docker images with a single Docker Compose stack:

```
nginx :80/:443  →  web :8080  (frontend)
                →  api :3000  (API)
                            →  postgres :5432
```

---

## Step 1 — Create a Dokploy Project

1. In Dokploy dashboard, click **New Project** → name it (e.g. `smantivault`)
2. Go to the project → **Services** → **New Service** → **Docker Compose**
3. Paste the contents of [`docker-compose.prod.yml`](#docker-composeprodyml) (copied below)
4. Under **Environment Variables**, add all required variables (see [Step 3](#step-3--set-environment-variables))

---

## Step 2 — docker-compose.prod.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: totp_vault
      POSTGRES_USER: ${POSTGRES_USER:-vault}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD}
    healthcheck:
      test: pg_isready -U ${POSTGRES_USER:-vault}
      interval: 5s
      retries: 5

  api:
    image: g9sowwvidixuklw76m6zoncnnpf9x/vault-api:latest
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: ${DATABASE_URL:?Set DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET:?Set JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY:?Set ENCRYPTION_KEY}
      ZITADEL_CLIENT_ID: ${ZITADEL_CLIENT_ID:?Set ZITADEL_CLIENT_ID}
      ZITADEL_ISSUER: ${ZITADEL_ISSUER:?Set ZITADEL_ISSUER}
      ZITADEL_REDIRECT_URI: ${ZITADEL_REDIRECT_URI:-https://vault.example.com/api/auth/callback}
      APP_URL: ${APP_URL:-https://vault.example.com}
      API_DOMAIN_URL: ${API_DOMAIN_URL:-}
      COOKIE_DOMAIN: ${COOKIE_DOMAIN:-.example.com}
      ENVIRONMENT: ${ENVIRONMENT:-prod}
      PORT: "3000"

  web:
    image: g9sowwvidixuklw76m6zoncnnpf9x/vault-web:latest
    restart: unless-stopped
    depends_on:
      - api

  nginx:
    image: g9sowwvidixuklw76m6zoncnnpf9x/vault-nginx:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      MAIN_DOMAIN: ${MAIN_DOMAIN:-_}
      API_DOMAIN_URL: ${API_DOMAIN_URL:-}
    depends_on:
      - api
      - web

volumes:
  pgdata:
```

---

## Step 3 — Set Environment Variables

In Dokploy's **Environment** tab for the project, add these:

### Required

| Variable | Value | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | *(choose a strong password)* | Used by postgres container |
| `DATABASE_URL` | `postgres://vault:YOUR_PASSWORD@postgres:5432/totp_vault` | `postgres` = service name, not `localhost` |
| `JWT_SECRET` | `openssl rand -hex 32` output | 64 hex chars |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` output | 64 hex chars |
| `ZITADEL_CLIENT_ID` | from ZITADEL console | Your OIDC application client ID |
| `ZITADEL_ISSUER` | `https://XXXXX.zitadel.cloud` | Your ZITADEL instance URL |

### Optional

| Variable | Default | Notes |
|---|---|---|
| `ZITADEL_REDIRECT_URI` | `https://vault.example.com/api/auth/callback` | Change `vault.example.com` to your domain |
| `APP_URL` | `https://vault.example.com` | Change to your domain |
| `MAIN_DOMAIN` | `_` (catch-all) | Set to your domain if you only want one server_name |
| `COOKIE_DOMAIN` | `.example.com` | Must match your domain for session cookies |
| `API_DOMAIN_URL` | *(empty)* | Set to `api.yourdomain.com` for a separate API subdomain |
| `ENVIRONMENT` | `prod` | Controls secure cookies & other prod behavior |
| `POSTGRES_USER` | `vault` | Only if you changed the user |

### Tip: Generate secrets locally

```bash
openssl rand -hex 32   # for JWT_SECRET
openssl rand -hex 32   # for ENCRYPTION_KEY
```

---

## Step 4 — Configure ZITADEL

1. Go to your ZITADEL Console → **Applications**
2. Create a new **Web** application (type: **User Agent / Web**, not "API")
3. Under **Redirect URIs**, add:
   ```
   https://your-domain.com/api/auth/callback
   ```
4. Under **Post Logout URIs**, add:
   ```
   https://your-domain.com
   ```
5. **Auth Method**: PKCE with S256 (no client secret)
6. Copy the **Client ID** → set as `ZITADEL_CLIENT_ID` in Dokploy

> ⚠️ The redirect URI **must exactly match** what the server sends. If you access the site at `https://vault.example.com`, the redirect is `https://vault.example.com/api/auth/callback` (no trailing slash).

---

## Step 5 — Domain & SSL

### Option A: Dokploy built-in SSL

1. In Dokploy, go to **Network** → add your domain (e.g. `vault.example.com`)
2. Enable **SSL** → select **Let's Encrypt** (Dokploy handles certs automatically)
3. Set the port to `80` (nginx listens on port 80/443)
4. Make sure your DNS A record points to your server IP

### Option B: Manual SSL with Nginx

Mount your certs into the nginx container (edit compose or use Dokploy volume mounts):

```
/path/to/fullchain.pem:/etc/ssl/certs/yourdomain.pem
/path/to/privkey.pem:/etc/ssl/private/yourdomain.pem
```

> Nginx templates already include SSL config — just mount the certs and set `MAIN_DOMAIN`.

---

## Step 6 — Run DB Migrations

After deployment starts, run migrations once to create the schema:

```bash
# Exec into the api container
docker exec -it smantivault_api_1 sh

# Inside the container:
DATABASE_URL=$DATABASE_URL bun run apps/api/drizzle-kit migrate
# OR
DATABASE_URL=$DATABASE_URL npx drizzle-kit migrate
```

**Alternative**: Use Dokploy's **Console** feature on the api service to run:

```bash
DATABASE_URL="${DATABASE_URL}" npx drizzle-kit migrate
```

> The schema will be created automatically if the `DATABASE_URL` is correct. If you see "relation 'users' does not exist" on first login, migrations haven't run yet.

---

## Step 7 — Verify Deployment

1. Visit `https://your-domain.com` — you should see the login page
2. Click **Login with ZITADEL** — redirected to ZITADEL SSO
3. After login, you're redirected back and auto-provisioned as a user
4. The first user to log in becomes **admin** (set role in DB manually if needed):

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

---

## Troubleshooting

### "Failed to fetch user info: 404"
The ZITADEL userinfo endpoint was wrong. Make sure:
- `ZITADEL_ISSUER` is correct (full URL like `https://XXXXX.zitadel.cloud`)
- The API container has the latest image (`g9sowwvidixuklw76m6zoncnnpf9x/vault-api:latest`)

### "Cannot GET /login" or 404 on page routes
SPA fallback wasn't configured. Ensure you're using the latest images:
- `vault-web:latest` — serves `index.html` for client-side routes
- `vault-nginx:latest` — nginx has `try_files` for SPA routing
- If running without nginx, `vault-api:latest` also serves static files with SPA fallback

### "Missing or invalid authorization header"
You're hitting the API directly but not logged in. Use the web UI at your domain, not `localhost:3000`.

### "relation 'users' does not exist"
Run DB migrations (see [Step 6](#step-6--run-db-migrations)).

### Can't log in — "Invalid state parameter"
Your ZITADEL redirect URI doesn't match. The exact URL must match what the server sends. Check for trailing slashes.

---

## Updating

To update to the latest images:

```bash
# In Dokploy, go to your project → Services → select a service → Redeploy
# Or force pull:
docker pull g9sowwvidixuklw76m6zoncnnpf9x/vault-api:latest
docker pull g9sowwvidixuklw76m6zoncnnpf9x/vault-web:latest
docker pull g9sowwvidixuklw76m6zoncnnpf9x/vault-nginx:latest

# Then restart:
docker compose -f docker-compose.prod.yml up -d
```

Or simply click **Redeploy** in Dokploy — it pulls fresh images automatically.

---

## Separate API Subdomain (Optional)

If you want the API to also respond on `api.yourdomain.com`:

1. Set `API_DOMAIN_URL=api.yourdomain.com` in Dokploy env vars
2. Add `api.yourdomain.com` as an additional domain in Dokploy's Network settings
3. Point `api.yourdomain.com` DNS to your server
4. Set `COOKIE_DOMAIN=.yourdomain.com` so cookies work across subdomains
5. The API responds on both:
   - `https://yourdomain.com/api/*`
   - `https://api.yourdomain.com/*`
