# 🎓 InternHub — Intern Management System

A production-ready **Intern Management System** built with **Next.js**, **Hasura GraphQL**, and **PostgreSQL**.
Manage interns across departments with role-based access control, JWT authentication, task management, and per-intern completion tracking.

---

## ✨ Features

- 🔐 **JWT Authentication** — Role-based login (Admin / Department Person / Intern)
- 👥 **Full Intern Profiles** — Personal, academic, internship details
- 🏢 **Department Management** — 8 departments with capacity tracking
- 📊 **Dashboard Stats** — Real-time overview of intern data
- ✅ **Task Management** — Create, assign, and track tasks per intern
- 🎯 **Per-Intern Task Completion** — Each intern marks their own completion independently
- 🔎 **Search & Filter** — By name, department, college, status
- 🌙 **Dark Mode** — Full dark/light theme support
- 🎭 **Demo Mode** — Run without any database setup

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 + TypeScript |
| Styling | TailwindCSS |
| GraphQL Client | Apollo Client |
| GraphQL Engine | Hasura v2.36 |
| Database | PostgreSQL 15 |
| Auth | JWT + bcryptjs |
| Infrastructure | Docker |

---

## 👤 Role Permissions

| Action | Admin | Dept Person | Intern |
|--------|-------|-------------|--------|
| View all interns | ✅ | ✅ own dept | ✅ own record |
| Add intern | ✅ | ✅ own dept | ❌ |
| Edit intern | ✅ | ✅ own dept | ✅ limited fields |
| Delete intern | ✅ | ❌ | ❌ |
| Create task | ✅ | ✅ own dept | ❌ |
| Edit task | ✅ | ✅ own dept | ❌ |
| Mark task complete | ✅ | ✅ own dept | ✅ assigned only |
| Delete task | ✅ | ✅ own dept | ❌ |

---

## ⚡ Quick Start (Demo Mode — No Database Needed)

```bash
# 1. Clone the repo
git clone https://github.com/KhushiRPatel/intern_hub.git
cd intern_hub

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# Leave NEXT_PUBLIC_DEMO_MODE=true in .env.local

# 4. Start the app
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

## 🏗️ Full Setup (With PostgreSQL + Hasura)

See **[HOW_TO_RUN.md](./HOW_TO_RUN.md)** for the complete guide.

### TL;DR

```bash
1. git clone + npm install
2. cp .env.example .env.local  →  set NEXT_PUBLIC_DEMO_MODE=false
3. docker compose up -d        →  starts PostgreSQL + Hasura automatically
4. node apply-permissions.mjs  →  sets Hasura role permissions
5. npm run dev
```

---

## 📁 Project Structure

```
intern_hub/
├── app/
│   ├── api/                              ← Next.js API routes (admin-secret, server-side)
│   │   ├── auth/login/route.ts           ← JWT login + user upsert
│   │   ├── auth/utils.ts                 ← checkAuth, requireAdmin helpers
│   │   ├── departments/route.ts          ← GET departments
│   │   ├── interns/
│   │   │   ├── route.ts                  ← GET interns (role-scoped)
│   │   │   ├── create/route.ts           ← POST create intern + user account
│   │   │   ├── update/route.ts           ← POST update intern
│   │   │   └── delete/route.ts           ← POST delete intern
│   │   ├── tasks/
│   │   │   ├── get/route.ts              ← GET tasks (role-scoped)
│   │   │   ├── create/route.ts           ← POST create task
│   │   │   ├── update/route.ts           ← POST update task fields
│   │   │   ├── update-status/route.ts    ← POST update task/intern status
│   │   │   └── delete/route.ts           ← POST delete task
│   │   └── users/
│   │       └── create-department-person/ ← POST create dept person account
│   ├── components/
│   │   ├── Sidebar.tsx                   ← Role-aware navigation
│   │   ├── Navbar.tsx
│   │   ├── Tasks/                        ← TaskCard, TaskList, TaskForm, TaskFilters
│   │   ├── InternList/page.tsx           ← Intern table
│   │   └── AddIntern/page.tsx            ← Add/edit intern form
│   ├── context/
│   │   ├── AuthContext.tsx               ← Auth state (login/logout/token)
│   │   ├── TaskContext.tsx               ← Task state + permission helpers
│   │   └── ThemeContext.tsx              ← Dark/light mode
│   ├── dashboard/
│   │   ├── page.tsx                      ← Stats overview + quick actions
│   │   ├── tasks/page.tsx                ← Task dashboard
│   │   ├── InternsView.tsx               ← Interns inside dashboard shell
│   │   └── TaskDashboard.tsx             ← Task management UI
│   └── interns/
│       ├── page.tsx                      ← /interns route
│       └── add/page.tsx                  ← /interns/add route
├── graphql/
│   ├── queries.ts                        ← Apollo GraphQL queries
│   └── mutations.ts                      ← Apollo GraphQL mutations
├── hasura/
│   └── metadata/
│       └── metadata.json                 ← Hasura permissions (auto-applied on startup)
├── lib/
│   ├── constants.ts                      ← UserData, InternData types
│   └── demoStore.ts                      ← Demo mode in-memory data
├── apply-permissions.mjs                 ← One-time Hasura permission setup
├── docker-compose.yml                    ← PostgreSQL + Hasura config
├── init.sql                              ← Auto-runs on first Docker start
├── HOW_TO_RUN.md                         ← Detailed setup guide
└── .env.example                          ← Environment template
```

---

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `departments` | 8 company departments |
| `users` | Login accounts (admin / dept person / intern) |
| `interns` | Full intern profiles (40+ fields) |
| `tasks` | Task assignments with priority and status |
| `task_interns` | Many-to-many intern↔task + per-intern completion status |
| `task_comments` | Comments on tasks |
| `task_activity_log` | Audit log of task changes |

---

## 🔑 Environment Variables

```env
NEXT_PUBLIC_HASURA_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=your_admin_secret
JWT_SECRET=your_long_random_jwt_secret_min_32_chars
NEXT_PUBLIC_DEMO_MODE=false
```

> ⚠️ Never commit `.env.local` — it is already in `.gitignore`.

---

## 🌐 Service URLs

| Service | URL |
|---------|-----|
| Next.js App | http://localhost:3000 |
| Hasura Console | http://localhost:8080 |
| GraphQL API | http://localhost:8080/v1/graphql |

---

## 📄 License

This project is for internal use. All rights reserved.