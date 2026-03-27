# 🚀 InternHub — How to Run

## Prerequisites

| Tool | Download |
|------|----------|
| **Node.js 18+** | https://nodejs.org |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop |

> ✅ No need to install PostgreSQL separately — it runs inside Docker.

---

## ⚡ Option A — Demo Mode (No Docker Needed)

Run instantly with built-in mock data. No database required.

```bash
git clone https://github.com/KhushiRPatel/intern_hub.git
cd intern_hub
npm install
cp .env.example .env.local
# Ensure NEXT_PUBLIC_DEMO_MODE=true in .env.local
npm run dev
```

Log in at **http://localhost:3000**:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@company.com` | `admin123` |
| Dept Person (AI) | `raj.ai@company.com` | `dept123` |
| Dept Person (PHP) | `priya.php@company.com` | `dept123` |
| Intern | `john.intern@student.com` | `intern123` |

---

## 🏗️ Option B — Full Setup with Docker

### Step 1 — Clone & Install

```bash
git clone https://github.com/KhushiRPatel/intern_hub.git
cd intern_hub
npm install
```

### Step 2 — Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_HASURA_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=myadminsecret
JWT_SECRET=change-me-to-a-long-random-string-min-32-chars
NEXT_PUBLIC_DEMO_MODE=false
```

> The `HASURA_ADMIN_SECRET` and `JWT_SECRET` must match the values in `docker-compose.yml`.

### Step 3 — Start Docker

Make sure **Docker Desktop is running**, then:

```bash
docker compose up -d
```

This starts:
- ✅ **PostgreSQL 15** on port `5432` — auto-runs `init.sql` on first start (creates all tables + seeds departments + admin user)
- ✅ **Hasura GraphQL Engine** on port `8080` — auto-loads permissions from `hasura/metadata/metadata.json`

Verify:
```bash
docker ps
# Should show internhub_postgres and internhub_hasura both Up
```

### Step 4 — Track Tables in Hasura Console

1. Open **http://localhost:8080**
2. Enter admin secret: `myadminsecret`
3. Go to **Data** tab → click **`public`** schema
4. Click **Track All** under *Untracked Tables*
5. Click **Track All** under *Untracked foreign-key relationships*

> ✅ Only needed **once** on first setup. Permissions are already applied via metadata.

### Step 5 — Apply Hasura Permissions (First Time Only)

```bash
node apply-permissions.mjs
```

This sets row-level permissions for all roles on all tables. Run once after first `docker compose up`. All `already exists` messages are fine.

### Step 6 — Start the App

```bash
npm run dev
```

Open **http://localhost:3000** and log in with `admin@company.com` / `admin123`.

---

## 🌐 Service URLs

| Service | URL |
|---------|-----|
| Next.js App | http://localhost:3000 |
| Hasura Console | http://localhost:8080 |
| GraphQL API | http://localhost:8080/v1/graphql |
| PostgreSQL | `localhost:5432` (user: `chatbot`, pass: `chatbot123`) |

---

## 🛠️ Useful Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start PostgreSQL + Hasura in background |
| `docker compose down` | Stop all containers |
| `docker compose down -v` | Stop and **delete all data** (fresh start) |
| `docker compose logs -f hasura` | Stream Hasura logs |
| `docker ps` | List running containers |
| `node apply-permissions.mjs` | Re-apply all Hasura permissions |
| `node export-metadata.mjs` | Export current Hasura metadata to file |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |

---

## 🐛 Troubleshooting

### ❌ Port already in use
```bash
# Windows — find what's using the port
netstat -ano | findstr :5432
netstat -ano | findstr :8080
```
Stop the conflicting service or change ports in `docker-compose.yml`.

### ❌ Tables not appearing in Hasura after Track All
`init.sql` may not have run. Force a fresh start:
```bash
docker compose down -v   # deletes volume — all data will be lost
docker compose up -d
```

### ❌ `field 'interns' not found in type: 'query_root'`
Hasura permissions aren't applied. Run:
```bash
node apply-permissions.mjs
```

### ❌ `Unauthorized - no token` on API calls
Your token may be stale. Log out and log back in — the new token will have correct Hasura claims.

### ❌ Foreign key violation when creating tasks
Log out and log back in. The login route upserts your user into the DB — this ensures the `assigned_by` FK always resolves.

### ❌ `npm run dev` — `next` not found
```bash
npm install
npm run dev
```

---

## 🔑 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_HASURA_ENDPOINT` | Yes | Hasura GraphQL URL |
| `HASURA_ADMIN_SECRET` | Yes | Server-side Hasura secret (never exposed to browser) |
| `JWT_SECRET` | Yes | JWT signing secret — min 32 chars, must match `docker-compose.yml` |
| `NEXT_PUBLIC_DEMO_MODE` | Yes | `true` = mock data, `false` = real DB |
| `NEXT_PUBLIC_APP_URL` | No | App base URL for password reset links (default: `http://localhost:3000`) |
| `SMTP_HOST` | No | Email host for password setup emails |
| `SMTP_USER` | No | Email username |
| `SMTP_PASS` | No | Email password |
| `SMTP_PORT` | No | Email port (default: `587`) |
| `SMTP_FROM` | No | From address for emails |

> ⚠️ Never commit `.env.local` to git.