# 🚀 InternHub — How to Run the Project

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript + TailwindCSS |
| GraphQL Client | Apollo Client |
| GraphQL Engine | Hasura v2.36 (Docker) |
| Database | PostgreSQL 15 (Docker) |
| Auth | JWT (jsonwebtoken + bcryptjs) |

---

## Prerequisites

You only need **two things** installed:

| Tool | Download |
|------|----------|
| **Node.js 18+** | https://nodejs.org |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop |

> ✅ No need to install PostgreSQL separately — it runs inside Docker!

---

## ⚡ Option A — Demo Mode (Fastest, No Docker Needed)

Run the app instantly with built-in mock data. No database or Docker required.

```bash
# 1. Clone & install
git clone https://github.com/KhushiRPatel/intern_hub.git
cd intern_hub
npm install

# 2. Set up environment
cp .env.example .env.local
# Make sure NEXT_PUBLIC_DEMO_MODE=true in .env.local

# 3. Start
npm run dev
```

Open **http://localhost:3000** and log in with:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@company.com` | `admin123` |
| Dept Person (AI) | `raj.ai@company.com` | `dept123` |
| Dept Person (PHP) | `priya.php@company.com` | `dept123` |
| Intern | `john.intern@student.com` | `intern123` |

---

## 🏗️ Option B — Full Setup with Docker (Real Database)

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

Edit `.env.local` and set:

```env
NEXT_PUBLIC_HASURA_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=myadminsecret
JWT_SECRET=change-me-to-a-long-random-string-min-32-chars
NEXT_PUBLIC_DEMO_MODE=false
```

### Step 3 — Start the Full Stack with Docker

Make sure **Docker Desktop is running**, then:

```bash
docker compose up -d
```

This single command:
- ✅ Starts **PostgreSQL 15** on port `5432`
- ✅ Automatically runs `init.sql` — creates all 7 tables + seeds data
- ✅ Starts **Hasura GraphQL Engine** on port `8080`
- ✅ Hasura waits for PostgreSQL to be ready before connecting

> **First time only:** Docker pulls the images (~500 MB). Takes 2–3 minutes on first run, then instant every time after.

Verify everything is running:
```bash
docker ps
```
You should see both `internhub_postgres` and `internhub_hasura` with status `Up`.

### Step 4 — Track Tables in Hasura Console

1. Open **http://localhost:8080**
2. Enter admin secret: **`myadminsecret`**
3. Go to **Data** tab → click **`public`** schema
4. Click **Track All** under *Untracked Tables*
5. Click **Track All** under *Untracked foreign-key relationships*

> ⚡ You only need to do this **once** after first setup.

### Step 5 — Run the Next.js App

```bash
npm run dev
```

Open **http://localhost:3000** and log in:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@company.com` | `admin123` |

---

## 🌐 Service URLs

| Service | URL |
|---------|-----|
| Next.js App | http://localhost:3000 |
| Hasura Console | http://localhost:8080 |
| GraphQL API | http://localhost:8080/v1/graphql |
| PostgreSQL | `localhost:5432` (user: `chatbot`, pass: `chatbot123`) |

---

## 🔑 Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_HASURA_ENDPOINT` | Hasura GraphQL endpoint URL |
| `HASURA_ADMIN_SECRET` | Secret to access Hasura (must match `docker-compose.yml`) |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars, must match `docker-compose.yml`) |
| `NEXT_PUBLIC_DEMO_MODE` | `true` = mock data, `false` = real PostgreSQL |

> ⚠️ Never commit `.env.local` — it is already in `.gitignore`.

---

## 🛠️ Useful Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start PostgreSQL + Hasura in background |
| `docker compose down` | Stop all containers |
| `docker compose down -v` | Stop and **delete all data** (fresh start) |
| `docker compose restart` | Restart containers |
| `docker logs internhub_hasura --tail 50` | View Hasura logs |
| `docker logs internhub_postgres --tail 50` | View PostgreSQL logs |
| `docker ps` | List running containers |
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build for production |

---

## 📁 Project Structure

```
intern_hub/
├── app/
│   ├── api/
│   │   ├── auth/login/route.ts     ← JWT login API
│   │   ├── departments/route.ts
│   │   ├── interns/route.ts
│   │   └── users/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── InternList/page.tsx     ← Intern table + filters
│   │   └── AddIntern/page.tsx      ← Add intern form
│   ├── context/AuthContext.tsx     ← Auth state (login/logout)
│   ├── dashboard/page.tsx          ← Stats overview
│   └── interns/page.tsx            ← Intern list page
├── graphql/
│   ├── queries.ts                  ← GraphQL queries
│   └── mutations.ts                ← GraphQL mutations
├── lib/
│   ├── apolloClient.ts             ← Apollo Client setup
│   └── demoStore.ts                ← Demo mode data
├── docker-compose.yml              ← PostgreSQL + Hasura config
├── init.sql                        ← Auto-runs on first Docker start
├── DATABASE_SCHEMA.md              ← Full schema documentation
├── HOW_TO_RUN.md                   ← This file
├── .env.example                    ← Copy this to .env.local
└── package.json
```

---

## 🐛 Troubleshooting

### ❌ `docker compose up` fails — port already in use
```bash
# Check what's using the port
netstat -ano | findstr :5432
netstat -ano | findstr :8080
# Stop the conflicting service or change ports in docker-compose.yml
```

### ❌ Hasura console shows `permission denied for table`
```bash
# Connect to the running PostgreSQL container and fix permissions
docker exec -it internhub_postgres psql -U chatbot -d intern_management -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chatbot;"
docker exec -it internhub_postgres psql -U chatbot -d intern_management -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chatbot;"
```

### ❌ Tables not appearing in Hasura after `Track All`
The `init.sql` may not have run. Force a fresh start:
```bash
docker compose down -v        # Deletes volume (all data)
docker compose up -d          # Recreates everything fresh
```

### ❌ `next` is not recognized
```bash
npm install
npm run dev
```

### ❌ Login fails with "Invalid email or password"
Make sure `NEXT_PUBLIC_DEMO_MODE=false` in `.env.local` and Hasura is running at `localhost:8080`.
