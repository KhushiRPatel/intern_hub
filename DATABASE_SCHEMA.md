# 🗄️ InternHub — Database Schema Reference

## Overview

This project uses **PostgreSQL** as the primary database, accessed via **Hasura GraphQL Engine**.

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE: intern_management               │
│                        USER: chatbot / chatbot123                │
│                        PORT: 5432                                │
└─────────────────────────────────────────────────────────────────┘
```

## Table Relationships

```
departments
    │
    ├──< users (department_id)
    │
    └──< interns (department_id)
              │
              ├──< emergency_contacts (intern_id)
              ├──< intern_documents   (intern_id)
              ├──< performance_reviews (intern_id)
              └──< attendance          (intern_id)

users ──< interns.mentor_id
users ──< interns.created_by
users ──< interns.user_id
```

---

## Table 1 — `departments`

Stores the 8 fixed departments in the company.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Unique identifier |
| `name` | TEXT | NOT NULL, UNIQUE | Full department name |
| `code` | TEXT | NOT NULL, UNIQUE | Short code e.g. `AI`, `PHP` |
| `description` | TEXT | | What this department does |
| `head_name` | TEXT | | Department head's name |
| `head_email` | TEXT | | Department head's email |
| `location` | TEXT | | Office floor/room |
| `max_interns` | INT | DEFAULT 20 | Max intern capacity |
| `is_active` | BOOLEAN | DEFAULT TRUE | Whether dept is active |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last updated time |

### Seeded Data

| code | name |
|------|------|
| `.NET` | .NET Development |
| `SAP` | SAP Consulting |
| `AI` | Artificial Intelligence |
| `MOBILE` | Mobile Development |
| `ODOO` | Odoo/ERP |
| `RPA` | Robotic Process Automation |
| `PHP` | PHP Development |
| `QC` | Quality Control |

---

## Table 2 — `users`

Stores all login accounts (admin, department persons, interns).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `name` | TEXT | NOT NULL | Full name |
| `email` | CITEXT | NOT NULL, UNIQUE | Email (case-insensitive) |
| `password_hash` | TEXT | NOT NULL | bcrypt hashed password |
| `role` | TEXT | NOT NULL, CHECK | `admin` / `department_person` / `intern` |
| `phone` | TEXT | | Phone number |
| `profile_photo` | TEXT | | URL to profile photo |
| `designation` | TEXT | | Job title / position |
| `department_id` | UUID | FK → departments.id | Department assignment |
| `is_active` | BOOLEAN | DEFAULT TRUE | Account active status |
| `last_login` | TIMESTAMPTZ | | Last login timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last updated time |

### Default Admin User

| Field | Value |
|-------|-------|
| Email | `admin@company.com` |
| Password | `admin123` |
| Role | `admin` |

---

## Table 3 — `interns` ⭐ (Main Table)

Full intern profile — personal, academic, and internship details.

### 🧍 Personal Details

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique identifier |
| `name` | TEXT NOT NULL | Full name |
| `email` | CITEXT UNIQUE | Personal email |
| `phone` | TEXT NOT NULL | Primary phone |
| `alternate_phone` | TEXT | Secondary phone |
| `date_of_birth` | DATE | Date of birth |
| `gender` | TEXT | `male` / `female` / `other` / `prefer_not_to_say` |
| `blood_group` | TEXT | A+, A-, B+, B-, AB+, AB-, O+, O- |
| `nationality` | TEXT | Default: `Indian` |
| `profile_photo` | TEXT | URL/path to photo |

### 🏠 Address

| Column | Type | Description |
|--------|------|-------------|
| `address_line1` | TEXT | Street address |
| `address_line2` | TEXT | Apt/Suite/Area |
| `city` | TEXT | City |
| `state` | TEXT | State |
| `pincode` | TEXT | Postal code |
| `country` | TEXT | Default: `India` |

### 🎓 Academic / College Details

| Column | Type | Description |
|--------|------|-------------|
| `college` | TEXT NOT NULL | College name |
| `university` | TEXT | Affiliated university |
| `degree` | TEXT NOT NULL | B.Tech / MCA / BCA / MBA etc. |
| `branch` | TEXT NOT NULL | CSE / IT / ECE / Mech etc. |
| `specialization` | TEXT | AI/ML, Data Science etc. |
| `graduation_year` | INT | Expected graduation year |
| `current_year` | INT | 1st / 2nd / 3rd / 4th year |
| `cgpa` | NUMERIC(4,2) | e.g. `8.75` |
| `percentage` | NUMERIC(5,2) | e.g. `87.50` % |
| `student_id` | TEXT | College roll number |
| `college_email` | TEXT | Official college email |
| `college_city` | TEXT | College city |
| `college_state` | TEXT | College state |

### 💼 Internship Details

| Column | Type | Description |
|--------|------|-------------|
| `department_id` | UUID NOT NULL FK | Assigned department |
| `start_date` | DATE NOT NULL | Internship start |
| `end_date` | DATE | Internship end |
| `duration_months` | INT | Duration in months |
| `status` | TEXT | `applied` / `selected` / `active` / `completed` / `terminated` / `on_leave` |
| `work_mode` | TEXT | `onsite` / `remote` / `hybrid` |
| `stipend` | NUMERIC(10,2) | Monthly stipend (₹) |
| `offer_letter_date` | DATE | Offer letter issue date |
| `joining_letter_date` | DATE | Joining letter date |
| `mentor_id` | UUID FK → users.id | Assigned mentor |

### 💡 Skills & Tech

| Column | Type | Description |
|--------|------|-------------|
| `skills` | TEXT[] | e.g. `['Python','React','SQL']` |
| `languages_known` | TEXT[] | e.g. `['English','Hindi']` |
| `tools` | TEXT[] | e.g. `['Git','Docker','Figma']` |

### 🔗 Social Links

| Column | Type | Description |
|--------|------|-------------|
| `linkedin_url` | TEXT | LinkedIn profile |
| `github_url` | TEXT | GitHub profile |
| `portfolio_url` | TEXT | Personal portfolio |

### 🪪 Identity & Reference

| Column | Type | Description |
|--------|------|-------------|
| `aadhar_number` | TEXT | Masked Aadhar (XXXX-XXXX-1234) |
| `pan_number` | TEXT | PAN card number |
| `reference_name` | TEXT | Reference person name |
| `reference_contact` | TEXT | Reference phone/email |

### ⚙️ System Fields

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | UUID FK → users.id | Linked login account |
| `created_by` | UUID FK → users.id | Who added this intern |
| `notes` | TEXT | Admin notes |
| `created_at` | TIMESTAMPTZ | Creation time |
| `updated_at` | TIMESTAMPTZ | Last updated time |

---

## Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- For gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";    -- For case-insensitive emails
```

---

