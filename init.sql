-- ============================================================
-- INTERNHUB — Auto-init SQL
-- This file runs AUTOMATICALLY when PostgreSQL starts in Docker
-- for the FIRST time (fresh volume). Do not run manually.
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ── 1. DEPARTMENTS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL UNIQUE,
  code         TEXT        NOT NULL UNIQUE,
  description  TEXT,
  head_name    TEXT,
  head_email   TEXT,
  location     TEXT,
  max_interns  INT         DEFAULT 20,
  is_active    BOOLEAN     DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO departments (name, code, description, max_interns) VALUES
  ('.NET Development',           '.NET',   'Microsoft .NET application development',       15),
  ('SAP Consulting',             'SAP',    'SAP ERP implementation and consulting',        10),
  ('Artificial Intelligence',    'AI',     'AI/ML research and development',               20),
  ('Mobile Development',         'MOBILE', 'iOS and Android mobile app development',       15),
  ('Odoo/ERP',                   'ODOO',   'Odoo open-source ERP solutions',               10),
  ('Robotic Process Automation', 'RPA',    'UiPath and automation bot development',        10),
  ('PHP Development',            'PHP',    'Web development using PHP and Laravel',        15),
  ('Quality Control',            'QC',     'Software testing and quality assurance',       12)
ON CONFLICT (code) DO NOTHING;

-- ── 2. USERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  email          CITEXT      NOT NULL UNIQUE,
  password_hash  TEXT        NOT NULL,
  role           TEXT        NOT NULL CHECK (role IN ('admin','department_person','intern')),
  phone          TEXT,
  profile_photo  TEXT,
  designation    TEXT,
  department_id  UUID        REFERENCES departments(id),
  is_active      BOOLEAN     DEFAULT TRUE,
  last_login     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin user: admin@company.com / admin123
INSERT INTO users (name, email, password_hash, role) VALUES (
  'System Admin',
  'admin@company.com',
  '$2b$12$LXfVk/U1VpDq.Peg7.ZGa.TDxmHYi6i7bVS9Zk2mC1OPFCNq5.0eW',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- ── 3. INTERNS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interns (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Personal
  name                TEXT        NOT NULL,
  email               CITEXT      NOT NULL UNIQUE,
  phone               TEXT        NOT NULL,
  alternate_phone     TEXT,
  date_of_birth       DATE,
  gender              TEXT        CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  blood_group         TEXT        CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  nationality         TEXT        DEFAULT 'Indian',
  profile_photo       TEXT,

  -- Address
  address_line1       TEXT,
  address_line2       TEXT,
  city                TEXT,
  state               TEXT,
  pincode             TEXT,
  country             TEXT        DEFAULT 'India',

  -- Academic
  college             TEXT        NOT NULL,
  university          TEXT,
  degree              TEXT        NOT NULL,
  branch              TEXT        NOT NULL,
  specialization      TEXT,
  graduation_year     INT,
  current_year        INT,
  cgpa                NUMERIC(4,2),
  percentage          NUMERIC(5,2),
  student_id          TEXT,
  college_email       TEXT,
  college_city        TEXT,
  college_state       TEXT,

  -- Internship
  department_id       UUID        NOT NULL REFERENCES departments(id),
  start_date          DATE        NOT NULL,
  end_date            DATE,
  duration_months     INT,
  status              TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('applied','selected','active','completed','terminated','on_leave')),
  work_mode           TEXT        DEFAULT 'onsite'
                                  CHECK (work_mode IN ('onsite','remote','hybrid')),
  stipend             NUMERIC(10,2),
  offer_letter_date   DATE,
  joining_letter_date DATE,
  mentor_id           UUID        REFERENCES users(id),

  -- Skills
  skills              TEXT[],
  languages_known     TEXT[],
  tools               TEXT[],

  -- Social
  linkedin_url        TEXT,
  github_url          TEXT,
  portfolio_url       TEXT,

  -- Identity
  aadhar_number       TEXT,
  pan_number          TEXT,

  -- Reference
  reference_name      TEXT,
  reference_contact   TEXT,

  -- System
  user_id             UUID        REFERENCES users(id),
  created_by          UUID        REFERENCES users(id),
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- ── TRIGGERS: auto-update updated_at ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER departments_updated_at
  BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER interns_updated_at
  BEFORE UPDATE ON interns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── INDEXES ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_interns_department ON interns(department_id);
CREATE INDEX IF NOT EXISTS idx_interns_status     ON interns(status);
CREATE INDEX IF NOT EXISTS idx_interns_mentor     ON interns(mentor_id);
CREATE INDEX IF NOT EXISTS idx_interns_email      ON interns(email);
CREATE INDEX IF NOT EXISTS idx_attendance_intern  ON attendance(intern_id, date);
CREATE INDEX IF NOT EXISTS idx_reviews_intern     ON performance_reviews(intern_id);
