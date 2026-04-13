# CLAUDE.md — Intern Hub Project Guide

## Project Overview
**Intern Hub** is a full-stack intern management system built with Next.js 16 (App Router). It allows organizations to manage interns across departments with role-based access control (admin, department person, intern).

---

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| GraphQL Client | Apollo Client 4 |
| Backend API | Next.js API Routes (serverless) |
| Database | PostgreSQL (via Hasura) |
| GraphQL Engine | Hasura v2.36 |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Language | TypeScript 5 (strict) |

---

## Environment Variables
```env
NEXT_PUBLIC_HASURA_ENDPOINT=http://localhost:8080/v1/graphql
NEXT_PUBLIC_DEMO_MODE=false       # true = offline demo mode
HASURA_ENDPOINT=http://localhost:8080/v1/graphql
HASURA_ADMIN_SECRET=<your-secret>
JWT_SECRET=<min-32-chars-random-string>
```

---

## Project Structure
```
intern_hub/
├── app/
│   ├── api/                          # Backend API routes
│   │   ├── auth/login/route.ts       # JWT login endpoint
│   │   ├── interns/create/route.ts   # Create intern + auto user
│   │   ├── users/create-department-person/route.ts
│   │   └── departments/route.ts      # List departments
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── AddIntern/page.tsx        # Reusable intern form
│   │   └── InternList/page.tsx       # Interns data table
│   ├── context/AuthContext.tsx       # Auth state + useAuth() hook
│   ├── providers/ApolloProvider.tsx  # Apollo Client wrapper
│   ├── dashboard/
│   │   ├── layout.tsx                # Auth guard + shell
│   │   └── page.tsx                  # Stats dashboard
│   ├── interns/
│   │   ├── page.tsx                  # Main CRUD page
│   │   └── add/page.tsx              # Admin add-intern page
│   ├── login/page.tsx
│   ├── page.tsx                      # Root redirect
│   └── layout.tsx                    # Root layout
├── graphql/
│   ├── queries.ts                    # All GraphQL queries
│   └── mutations.ts                  # All GraphQL mutations
├── lib/
│   ├── apolloClient.ts               # Apollo config
│   ├── constants.ts                  # Types, role constants, colors
│   └── demoStore.ts                  # In-memory offline data store
├── SETUP.md
└── README.md
```

---

## User Roles & Permissions
| Feature | Admin | Dept Person | Intern |
|---|---|---|---|
| View all interns | Yes | Own dept only | Own record only |
| Add intern | Yes | No | No |
| Edit intern | Yes | Own dept only | No |
| Delete intern | Yes | No | No |
| Add dept person | Yes | No | No |
| Dashboard stats | All interns | Own dept | Own record |

---

## Demo Mode
Set `NEXT_PUBLIC_DEMO_MODE=true` to run fully offline. `lib/demoStore.ts` provides in-memory CRUD that mirrors Hasura response shapes. Data persists in localStorage under `intern_demo_records`.

Demo credentials:
- `admin@company.com` / `Admin@1234` (admin)
- `raj.ai@company.com` / `Intern@1234` (intern)
- `dept.ai@company.com` / `Dept@1234` (department_person)

---

## Key Conventions
- **Role-based queries:** `GET_INTERNS` WHERE clause changes per role (admin=all, dept_person=by dept, intern=by user_id)
- **Auto user creation:** Creating an intern via `/api/interns/create` also creates a `users` table entry with a temp password `Intern@XXXX`
- **JWT claims:** Token contains `x-hasura-default-role`, `x-hasura-user-id`, `x-hasura-dept-id` for Hasura RLS
- **Apollo headers:** `lib/apolloClient.ts` attaches JWT from localStorage on every request
- **Path alias:** `@/` maps to the project root

---

## Database Schema (PostgreSQL)
```sql
departments (id UUID PK, name TEXT UNIQUE)

users (
  id UUID PK, name TEXT, email TEXT UNIQUE,
  password_hash TEXT, role TEXT,
  department_id UUID FK -> departments
)

interns (
  id UUID PK, name TEXT, email TEXT UNIQUE,
  phone TEXT, college TEXT,
  department_id UUID FK -> departments,
  start_date DATE, end_date DATE,
  status TEXT (active|completed|terminated),
  user_id UUID FK -> users,
  created_by UUID FK -> users
)
```

---

## Development Commands
```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run lint     # ESLint check
```

---

## Common Patterns

### Adding a new API route
1. Create `app/api/<resource>/<action>/route.ts`
2. Use `HASURA_ADMIN_SECRET` in server-side headers (never expose to client)
3. Always validate input and return typed responses

### Adding a new GraphQL query/mutation
1. Add to `graphql/queries.ts` or `graphql/mutations.ts`
2. Use `useQuery`/`useMutation` from `@apollo/client` in components
3. Mirror the query in `demoStore.ts` if demo mode support is needed

### Adding a new page
1. Create under `app/<route>/page.tsx`
2. If it needs auth, place under `app/dashboard/` (auto-guarded by `dashboard/layout.tsx`) or add your own auth check with `useAuth()`
3. Use `useAuth()` from `app/context/AuthContext.tsx` for user info
