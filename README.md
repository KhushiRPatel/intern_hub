# 🎓 InternHub — Intern Management System

A production-ready **Intern Management System** built with **Next.js**, **Hasura GraphQL**, and **PostgreSQL**.
Manage interns across departments with role-based access control, JWT authentication, attendance tracking, and performance reviews.

---

## ✨ Features

- 🔐 **JWT Authentication** — Role-based login (Admin / Department Person / Intern)
- 👥 **Full Intern Profiles** — Personal, academic, internship & document details
- 🏢 **Department Management** — 8 departments with capacity tracking
- 📊 **Dashboard Stats** — Real-time overview of intern data
- 📋 **Attendance Tracking** — Daily check-in/check-out records
- ⭐ **Performance Reviews** — Monthly rating system
- 🔎 **Search & Filter** — By name, department, college, status
- 🎭 **Demo Mode** — Run without any database setup

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 + TypeScript |
| Styling | TailwindCSS 4 |
| GraphQL Client | Apollo Client |
| GraphQL Engine | Hasura v2.36 |
| Database | PostgreSQL 15+ |
| Auth | JWT + bcryptjs |
| Infrastructure | Docker (for Hasura) |

---

## ⚡ Quick Start (Demo Mode — No Database Needed)

Run the app instantly with demo data — no PostgreSQL or Docker required.

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

## Prerequisites

You only need **two things** installed:

| Tool | Download |
|------|----------|
| **Node.js 18+** | https://nodejs.org |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop |

> ✅ No need to install PostgreSQL separately — it runs inside Docker!

---

## 🏗️ Full Setup (With PostgreSQL + Hasura)

For the full production setup with a real database, see **[HOW_TO_RUN.md](./HOW_TO_RUN.md)**.

### TL;DR — Full Setup Steps

```bash
1. git clone + npm install
2. cp .env.example .env.local  →  set NEXT_PUBLIC_DEMO_MODE=false
3. docker compose up -d        →  starts PostgreSQL + Hasura automatically
4. Open http://localhost:8080  →  Track All tables
5. npm run dev
```

> ✅ PostgreSQL runs inside Docker — no separate installation needed!

---

## 📁 Project Structure

```
intern_hub/
├── app/
│   ├── api/                        ← Next.js API routes
│   │   ├── auth/login/route.ts     ← JWT login
│   │   ├── departments/route.ts
│   │   ├── interns/route.ts
│   │   └── users/
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── InternList/page.tsx     ← Intern table
│   │   └── AddIntern/page.tsx      ← Add intern form
│   ├── context/AuthContext.tsx     ← Auth state
│   ├── dashboard/page.tsx          ← Stats overview
│   └── interns/page.tsx            ← Intern list
├── graphql/
│   ├── queries.ts                  ← GraphQL queries
│   └── mutations.ts                ← GraphQL mutations
├── lib/
│   ├── apolloClient.ts
│   └── demoStore.ts                ← Demo mode data
├── docker-compose.yml              ← Hasura config
├── recreate_schema.sql             ← Full DB schema SQL
├── DATABASE_SCHEMA.md              ← Schema documentation
├── HOW_TO_RUN.md                   ← Detailed run guide
└── .env.example                    ← Environment template
```

---

## 🗄️ Database Schema

The system uses **7 tables**. See **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** for full details.

| Table | Purpose |
|-------|---------|
| `departments` | 8 company departments |
| `users` | Login accounts (admin/dept/intern) |
| `interns` | Full intern profiles (40+ fields) |
| `emergency_contacts` | Emergency contacts per intern |
| `intern_documents` | Uploaded documents |
| `performance_reviews` | Monthly performance ratings |
| `attendance` | Daily attendance records |

---

## 🔑 Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```env
NEXT_PUBLIC_HASURA_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=your_admin_secret
JWT_SECRET=your_long_random_jwt_secret_min_32_chars
NEXT_PUBLIC_DEMO_MODE=true
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

## 📖 Documentation

| File | Description |
|------|-------------|
| [HOW_TO_RUN.md](./HOW_TO_RUN.md) | Detailed step-by-step setup guide |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | All 7 table schemas documented |
| [recreate_schema.sql](./recreate_schema.sql) | Full SQL to create all tables |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

This project is for internal use. All rights reserved.
