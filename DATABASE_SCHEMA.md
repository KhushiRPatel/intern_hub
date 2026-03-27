# 🗄️ InternHub — Database Schema Reference

**Database:** `intern_management`  
**User:** `chatbot` / `chatbot123`  
**Port:** `5432`

---

## Table Relationships

```
departments
    │
    ├──< users          (department_id)
    │
    └──< interns        (department_id)
              │
              └──< task_interns  (intern_id)
                        │
                        └──< tasks (via task_interns.task_id)

tasks
    ├──< task_interns       (task_id)  ← many-to-many with interns
    ├──< task_comments      (task_id)
    └──< task_activity_log  (task_id)

users ──< interns.mentor_id
users ──< interns.created_by
users ──< interns.user_id
users ──< tasks.assigned_by
```

---

## Table 1 — `departments`

8 fixed company departments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Auto-generated |
| `name` | TEXT UNIQUE | Full department name |
| `code` | TEXT UNIQUE | Short code e.g. `AI`, `PHP` |
| `description` | TEXT | What this department does |
| `head_name` | TEXT | Department head |
| `max_interns` | INT | Capacity (default 20) |
| `is_active` | BOOLEAN | Default true |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

**Seeded departments:** `.NET`, `SAP`, `AI`, `MOBILE`, `ODOO`, `RPA`, `PHP`, `QC`

---

## Table 2 — `users`

All login accounts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `name` | TEXT | Full name |
| `email` | CITEXT UNIQUE | Case-insensitive |
| `password_hash` | TEXT | bcrypt hashed |
| `role` | TEXT | `admin` / `department_person` / `intern` |
| `phone` | TEXT | |
| `department_id` | UUID FK → departments | |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Default admin:** `admin@company.com` / `admin123`

---

## Table 3 — `interns` ⭐

Full intern profile.

### Personal
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | |
| `email` | CITEXT UNIQUE | |
| `phone` | TEXT | |
| `date_of_birth` | DATE | |
| `gender` | TEXT | `male/female/other/prefer_not_to_say` |
| `profile_photo` | TEXT | URL |

### Address
`address_line1`, `address_line2`, `city`, `state`, `pincode`, `country`

### Academic
| Column | Description |
|--------|-------------|
| `college` | College name (required) |
| `degree` | e.g. B.Tech, MCA (required) |
| `branch` | e.g. Computer Science (required) |
| `university` | Affiliated university |
| `cgpa` | NUMERIC(4,2) |
| `graduation_year` | Expected year |

### Internship
| Column | Description |
|--------|-------------|
| `department_id` | FK → departments (required) |
| `start_date` | Required |
| `end_date` | Optional |
| `status` | `applied/selected/active/completed/terminated/on_leave` |
| `work_mode` | `onsite/remote/hybrid` |
| `stipend` | Monthly stipend |
| `mentor_id` | FK → users |

### Skills & Social
`skills TEXT[]`, `tools TEXT[]`, `languages_known TEXT[]`  
`linkedin_url`, `github_url`, `portfolio_url`

### System
| Column | Description |
|--------|-------------|
| `user_id` | FK → users (linked login account) |
| `created_by` | FK → users (who added this intern) |
| `notes` | Admin notes |

---

## Table 4 — `tasks`

Task assignments.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `title` | TEXT NOT NULL | |
| `description` | TEXT | |
| `priority` | TEXT | `low/medium/high/critical` |
| `status` | TEXT | `open/in_progress/completed/on_hold/cancelled` — controlled by admin/dept only |
| `assigned_by` | UUID FK → users | Who created the task |
| `department_id` | UUID FK → departments | |
| `due_date` | DATE | |
| `start_date` | DATE | Default today |
| `completed_date` | DATE | Set when status → completed |
| `estimated_hours` | NUMERIC | |
| `tags` | TEXT[] | |
| `intern_id` | UUID FK → interns | Backward compat (first intern) |
| `parent_task_id` | UUID FK → tasks | Sub-task support |

---

## Table 5 — `task_interns` ⭐

Many-to-many between tasks and interns. Tracks **per-intern completion** independently from `tasks.status`.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `task_id` | UUID FK → tasks CASCADE | |
| `intern_id` | UUID FK → interns CASCADE | |
| `intern_status` | TEXT | `pending` / `completed` — each intern's own completion |
| `created_at` | TIMESTAMPTZ | |

> **Key design:** `tasks.status` is set by admin/dept person. `task_interns.intern_status` is set by each intern individually. They are independent — one intern completing their part does not change the overall task status.

---

## Table 6 — `task_comments`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `task_id` | UUID FK → tasks CASCADE | |
| `user_id` | UUID FK → users | |
| `comment` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

---

## Table 7 — `task_activity_log`

Audit trail of task changes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `task_id` | UUID FK → tasks CASCADE | |
| `user_id` | UUID FK → users | Who made the change |
| `action` | TEXT | e.g. `status_changed`, `assigned` |
| `old_value` | TEXT | Previous value |
| `new_value` | TEXT | New value |
| `created_at` | TIMESTAMPTZ | |

---

## Hasura Role Permissions

| Table | admin | department_person | intern |
|-------|-------|-------------------|--------|
| `departments` | SELECT | SELECT | SELECT |
| `users` | SELECT, UPDATE, DELETE | SELECT (own), UPDATE (own) | SELECT (own), UPDATE (own) |
| `interns` | ALL | SELECT+UPDATE (own dept) | SELECT+UPDATE (own record, limited fields) |
| `tasks` | ALL | SELECT+UPDATE+DELETE (own dept) | SELECT (assigned) |
| `task_interns` | ALL | SELECT+UPDATE | SELECT+UPDATE (own, intern_status only) |

---

## Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";    -- case-insensitive email
```

---

## Indexes

```sql
-- interns
idx_interns_department, idx_interns_status, idx_interns_email, idx_interns_user

-- tasks
idx_tasks_status, idx_tasks_department, idx_tasks_due_date, idx_tasks_assigned_by

-- task_interns
idx_task_interns_task, idx_task_interns_intern, idx_task_interns_status
```