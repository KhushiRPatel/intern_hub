# Intern Management System — Setup Guide
## How to Connect pgAdmin (PostgreSQL) + Hasura GraphQL

---

## Overview

```
┌───────────────────┐         ┌───────────────────┐        ┌──────────────────────┐
│   Next.js App     │ ──JWT── │  Hasura GraphQL   │ ──SQL──│  PostgreSQL (pgAdmin)│
│  (port 3000)      │◄──────► │  Engine (8080)    │        │  (port 5432)         │
└───────────────────┘         └───────────────────┘        └──────────────────────┘
```

---

## Step 1 — Install PostgreSQL & pgAdmin
 
1. Download and install **PostgreSQL 15+** from https://www.postgresql.org/download/
2. During installation, set a password for the `postgres` superuser (remember this).
3. **pgAdmin 4** is bundled with the PostgreSQL installer. Open it after installation.

---

## Step 2 — Create the Database in pgAdmin

1. Open pgAdmin → right-click **Servers** → Register → Server  
   - Name: `Local`  
   - Host: `localhost`, Port: `5432`, Username: `postgres`, Password: your password
2. Expand the server → right-click **Databases** → Create → Database  
   - Name: `intern_management`
3. Open the **Query Tool** (Tools menu) for the `intern_management` database and run:

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Departments table (8 fixed types)
CREATE TABLE departments (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- Seed the 8 departments
INSERT INTO departments (name) VALUES
  ('.NET'), ('SAP'), ('AI'), ('MOBILE'), ('ODDO'), ('RPA'), ('PHP'), ('QC');

-- Users table (admin / department_person / intern)
CREATE TABLE users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL CHECK (role IN ('admin','department_person','intern')),
  department_id UUID        REFERENCES departments(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Interns table
CREATE TABLE interns (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  phone         TEXT,
  college       TEXT        NOT NULL,
  department_id UUID        NOT NULL REFERENCES departments(id),
  start_date    DATE        NOT NULL,
  end_date      DATE,
  status        TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','completed','terminated')),
  user_id       UUID        REFERENCES users(id),
  created_by    UUID        REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on interns
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER interns_updated_at
  BEFORE UPDATE ON interns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

4. Seed a test admin user (password = `admin123`):
```sql
INSERT INTO users (name, email, password_hash, role) VALUES (
  'System Admin',
  'admin@company.com',
  '$2b$12$LXfVk/U1VpDq.Peg7.ZGa.TDxmHYi6i7bVS9Zk2mC1OPFCNq5.0eW',  -- admin123
  'admin'
);
```

> To generate a bcrypt hash for your own password:
> ```js
> // In Node.js: node -e "const b=require('bcryptjs'); console.log(b.hashSync('yourpass',12))"
> ```

---

## Step 3 — Run Hasura with Docker

The easiest way to run Hasura is via Docker Compose.

Create a file `docker-compose.yml` anywhere (e.g., project root):

```yaml
version: '3.8'
services:
  hasura:
    image: hasura/graphql-engine:v2.36.0
    ports:
      - "8080:8080"
    restart: always
    environment:
      # Point to your local PostgreSQL
      HASURA_GRAPHQL_DATABASE_URL: "postgres://postgres:YOUR_PG_PASSWORD@host.docker.internal:5432/intern_management"
      
      # Protects the Hasura console — use something strong
      HASURA_GRAPHQL_ADMIN_SECRET: "myadminsecret"
      
      # JWT secret — must match JWT_SECRET in your .env.local
      HASURA_GRAPHQL_JWT_SECRET: '{"type":"HS256","key":"change-me-to-a-long-random-string-min-32-chars"}'
      
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_DEV_MODE: "true"
```

Then run:
```bash
docker-compose up -d
```

Open Hasura Console at: http://localhost:8080 (use admin secret to login)

> **Windows users**: `host.docker.internal` routes to your local machine.  
> If on Linux, use your machine's IP instead of `host.docker.internal`.

---

## Step 4 — Track Tables in Hasura Console

1. Open http://localhost:8080 → enter admin secret
2. Go to **Data** tab → **Connect Database** → select PostgreSQL
3. Under **Untracked Tables**, click **Track All**
4. This exposes `departments`, `users`, and `interns` as GraphQL types

---

## Step 5 — Set Up Relationships

In Hasura Console → **Data** → `interns` table → **Relationships** tab:

| Type        | Name         | From             | To                  |
|-------------|--------------|------------------|---------------------|
| Object      | department   | interns.department_id | departments.id |
| Object      | user         | interns.user_id  | users.id            |

Do the same for `users.department` (users → departments).

---

## Step 6 — Configure Row-Level Permissions

Go to **Data** → each table → **Permissions** tab.

### `interns` table

| Role              | Select                                                           | Insert | Update | Delete |
|-------------------|------------------------------------------------------------------|--------|--------|--------|
| admin             | All rows ✅                                                      | ✅     | ✅     | ✅     |
| department_person | `department_id = X-Hasura-Dept-Id` ✅                           | ✅     | ✅     | ✗      |
| intern            | `user_id = X-Hasura-User-Id` (own row only) ✅                  | ✗      | ✗      | ✗      |

For `department_person` Select filter, use:
```json
{ "department_id": { "_eq": "X-Hasura-Dept-Id" } }
```

For `intern` Select filter, use:
```json
{ "user_id": { "_eq": "X-Hasura-User-Id" } }
```

### `departments` table

| Role              | Select |
|-------------------|--------|
| admin             | ✅     |
| department_person | ✅     |
| intern            | ✅     |

---

## Step 7 — Update .env.local

Edit `intern_management/.env.local`:

```env
NEXT_PUBLIC_HASURA_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=myadminsecret
JWT_SECRET=change-me-to-a-long-random-string-min-32-chars

# Switch to false to use real Hasura data instead of demo mode
NEXT_PUBLIC_DEMO_MODE=false
```

---

## Step 8 — Run the Next.js App

```bash
cd intern_management
npm run dev
```

Open http://localhost:3000 and log in with:
- **Admin**: admin@company.com / admin123
- Or any user you inserted into the `users` table

---

## How JWT Auth Works in This App

```
User logs in → POST /api/auth/login
  → API route queries Hasura (admin-secret) for user record
  → Verifies bcrypt password
  → Generates JWT with Hasura claims:
      x-hasura-default-role: "admin"
      x-hasura-user-id: "<uuid>"
      x-hasura-dept-id: "<uuid>"
  → Returns token to browser

Browser stores token in localStorage
  → Apollo Client sends: Authorization: Bearer <token>
  → Hasura validates JWT, extracts role/user-id/dept-id
  → Row-level permissions filter data automatically
```

---

## Role & Access Matrix

| Feature              | Admin | Dept. Person | Intern |
|----------------------|:-----:|:------------:|:------:|
| View all interns     |  ✅   |      ✗       |   ✗    |
| View dept interns    |  ✅   |      ✅      |   ✗    |
| View own profile     |  ✅   |      ✅      |  ✅    |
| Add intern           |  ✅   |      ✗       |   ✗    |
| Edit intern          |  ✅   |   own dept   |   ✗    |
| Delete intern        |  ✅   |      ✗       |   ✗    |
| Search by name       |  ✅   |      ✅      |  ✅    |
| Filter by department |  ✅   |      ✅      |   ✗    |
| Filter by college    |  ✅   |      ✅      |  ✅    |
| Dashboard stats      |  ✅   |      ✅      |  ✅    |

---

## Project File Structure

```
intern_management/
├── app/
│   ├── api/auth/login/route.ts   ← Login API (JWT issuer)
│   ├── context/AuthContext.tsx   ← Auth state + login/logout
│   ├── providers/ApolloProvider  ← Apollo Client wrapper
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── InternList/page.tsx   ← InternTable component
│   │   └── AddIntern/page.tsx    ← InternFormModal component
│   ├── login/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx            ← Auth guard + Shell
│   │   └── page.tsx              ← Stats overview
│   └── interns/
│       ├── page.tsx              ← List + filters + CRUD
│       └── add/page.tsx          ← Add intern (full page)
├── graphql/
│   ├── queries.ts
│   └── mutations.ts
├── lib/
│   ├── apolloClient.ts
│   ├── constants.ts
│   └── demoStore.ts              ← Local data store (demo mode)
└── .env.local
```

---

## Departments Reference

| Code    | Full Name         |
|---------|-------------------|
| .NET    | .NET Development  |
| SAP     | SAP Consulting    |
| AI      | Artificial Intelligence |
| MOBILE  | Mobile Development |
| ODDO    | Odoo/ERP          |
| RPA     | Robotic Process Automation |
| PHP     | PHP Development   |
| QC      | Quality Control   |
