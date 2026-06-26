# SMANTIVault

> Secure credential manager with TOTP 2FA codes and generic secrets vault, powered by ZITADEL SSO and AES-256-GCM encryption.

Built for internal use at **SMAN 3 Palu** — single sign-on with institutional ZITADEL account, no separate login needed.

---

## Features

- **TOTP 2FA Dashboard** — generate time-based codes from stored secrets with auto-refresh countdown timer
- **Secrets Vault** — store credentials, API keys, database passwords; category filters, field-level reveal/copy
- **ZITADEL SSO** — PKCE OIDC flow (no client secret), auto-provisions users on first login
- **AES-256-GCM Encryption** — all secrets encrypted at rest using `@oslojs/crypto`
- **API Key System** — create services with scoped access (`vk_*_` prefixed keys, SHA-256 hashed)
- **IP Whitelist** — CIDR-based restrictions per service
- **Rate Limiting** — PostgreSQL-based, per-service configurable
- **Audit Log** — full request logging with method, path, status, auth type, duration, IP
- **Import/Export** — bulk import/export via otpauth:// URIs (TOTP) or JSON (secrets)
- **Sharing** — share entries and secrets with other users

## Stack

| Layer | Technology |
|---|---|
| **Runtime** | Bun |
| **API** | Hono |
| **Frontend** | React + Vite + Tailwind CSS |
| **Database** | PostgreSQL 16 (Drizzle ORM) |
| **Auth** | ZITADEL OIDC (Arctic) |
| **Encryption** | AES-256-GCM (`@oslojs/crypto`) |
| **Infra** | Docker Compose + Nginx |

## Quick Start

### 1. Prerequisites

- [Bun](https://bun.sh) 1.1+
- [Docker](https://docker.com) + Docker Compose
- A ZITADEL instance (cloud or self-hosted) with a public OIDC application:
  - **Application Type**: User Agent / Web
  - **Auth Method**: PKCE with S256 (no client secret)
  - **Redirect URI**: `http://localhost:3000/api/auth/callback`

### 2. Setup

```bash
git clone https://github.com/smantriplw/vault.sman3palu.sch.id.git
cd vault.sman3palu.sch.id
cp .env.example .env
```

Edit `.env`:

```env
ZITADEL_CLIENT_ID=your-client-id
ZITADEL_ISSUER=https://your-instance.zitadel.cloud
ZITADEL_REDIRECT_URI=http://localhost:3000/api/auth/callback

JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -hex 32)

DATABASE_URL=postgres://vault:vaultpass@localhost:5433/totp_vault

APP_URL=http://localhost:5173
COOKIE_DOMAIN=localhost
ENVIRONMENT=dev
```

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 4. Push schema & seed

```bash
bun install
bun run db:push
```

### 5. Run

```bash
bun run dev
```

- **API**: http://localhost:3000
- **Web**: http://localhost:5173

### 6. Production (Docker Compose)

```bash
docker compose up -d
```

Nginx serves both API (`/api/`) and static frontend on port 80.

## Architecture

```
                    ┌──────────────┐
                    │   Nginx :80  │
                    │  (SSL proxy) │
                    └──┬───────┬───┘
                   /api/     /
               ┌────▼──┐ ┌──▼─────┐
               │  API  │ │  Web   │
               │ :3000 │ │ :8080  │
               └──┬────┘ └────────┘
                  │
             ┌────▼────┐
             │Postgres │
             │  :5432  │
             └─────────┘
```

### Project Structure

```
├── apps/
│   ├── api/                  # Hono API server
│   │   ├── src/
│   │   │   ├── auth/         # ZITADEL OIDC, JWT middleware
│   │   │   ├── db/           # Schema, relations, client
│   │   │   ├── lib/          # Encryption, TOTP, API keys, rate limiter
│   │   │   ├── middleware/   # Request logger
│   │   │   └── routes/       # Auth, entries, secrets, shares, admin
│   │   └── ...
│   └── web/                  # React + Vite frontend
│       └── src/
│           ├── app/          # Router & providers
│           ├── components/   # Layout
│           ├── hooks/        # Auth context
│           ├── lib/          # API client
│           └── pages/        # Dashboard, secrets, admin pages
├── packages/
│   └── shared/               # Zod schemas & shared types
├── docker-compose.yml
├── Dockerfile.api
├── Dockerfile.web
└── nginx.conf
```

## API Overview

| Endpoint | Auth | Description |
|---|---|---|
| `GET /health` | — | Health check |
| `GET /api/auth/login` | — | Initiate ZITADEL OIDC login |
| `GET /api/auth/callback` | — | OIDC callback handler |
| `GET /api/auth/me` | JWT | Current user info |
| `POST /api/auth/logout` | JWT | Clear session |
| | | |
| `GET /api/entries` | JWT/AK | List TOTP entries (with codes) |
| `POST /api/entries` | JWT | Create TOTP entry |
| `GET /api/entries/:id` | JWT | Get entry metadata |
| `PUT /api/entries/:id` | JWT | Update entry |
| `DELETE /api/entries/:id` | JWT | Delete entry |
| `POST /api/entries/import` | JWT | Bulk import otpauth URIs |
| `GET /api/entries/export` | JWT/AK | Export all as URIs |
| | | |
| `GET /api/secrets` | JWT/AK | List secrets |
| `POST /api/secrets` | JWT | Create secret |
| `GET /api/secrets/:id` | JWT | Get secret (decrypted) |
| `PUT /api/secrets/:id` | JWT | Update metadata |
| `PUT /api/secrets/:id/data` | JWT | Update encrypted data |
| `DELETE /api/secrets/:id` | JWT | Delete secret |
| `POST /api/secrets/import` | JWT | Bulk import JSON |
| `GET /api/secrets/export` | JWT/AK | Export all (decrypted) |
| | | |
| `GET /api/shares` | JWT | List incoming shares |
| `POST /api/entries/:id/share` | JWT | Share TOTP entry |
| `DELETE /api/shares/:id` | JWT | Revoke share |
| | | |
| `GET /api/admin/services` | JWT(A) | List API services |
| `POST /api/admin/services` | JWT(A) | Create service (+ key) |
| `DELETE /api/admin/services/:id` | JWT(A) | Revoke service |
| `POST /api/admin/services/:id/rotate` | JWT(A) | Rotate key (1h grace) |
| `GET /api/admin/requests` | JWT(A) | Request audit logs |
| `GET /api/admin/requests/stats` | JWT(A) | Aggregate stats |

> **Auth legend**: JWT = user session, AK = API key, (A) = admin only

## API Key Management

Keys are prefixed with `vk_{env}_` (e.g., `vk_dev_abc123...`). On rotation, the old key remains valid for 1 hour (grace period). Keys are hashed with SHA-256 before storage — only the prefix and hash are stored.

### Scopes

| Scope | Permission |
|---|---|
| `entries:read` | Read TOTP entries & generate codes |
| `entries:write` | Create/update/delete entries |
| `entries:share` | Share entries with other users |
| `secrets:read` | Read secrets (decrypted) |
| `secrets:write` | Create/update/delete secrets |
| `secrets:share` | Share secrets |
| `vault:export` | Bulk export all data |
| `audit:read` | Read request logs |

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `ZITADEL_CLIENT_ID` | Yes | — | OIDC client ID |
| `ZITADEL_ISSUER` | Yes | — | ZITADEL instance URL |
| `ZITADEL_REDIRECT_URI` | No | `http://localhost:3000/api/auth/callback` | OIDC callback |
| `JWT_SECRET` | Yes | — | 64 hex chars (32 bytes) |
| `ENCRYPTION_KEY` | Yes | — | 64 hex chars (32 bytes) |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `APP_URL` | No | `http://localhost:5173` | Frontend origin (CORS) |
| `COOKIE_DOMAIN` | No | `localhost` | Session cookie domain |
| `ENVIRONMENT` | No | `dev` | `dev` or `prod` |

## Development

```bash
# Install all dependencies
bun install

# Run both API and web
bun run dev

# Database — push schema changes
bun run db:push

# Migrate (if using migration files)
bun run db:migrate

# Typecheck all workspaces
bun run typecheck
```

## License

Internal use — SMAN 3 Palu
