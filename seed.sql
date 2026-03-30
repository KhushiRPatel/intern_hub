-- ============================================================
-- INTERN HUB — Full demo seed (fills columns; run after init.sql)
-- ============================================================
-- Passwords:
--   admin@company.com  -> Admin@1234
--   dept.*@company.com -> Dept@1234
--   *.student.com      -> Intern@1234
--
-- Usage:
--   Get-Content -Raw seed.sql | docker exec -i internhub_postgres psql -U chatbot -d intern_management -v ON_ERROR_STOP=1
-- ============================================================

BEGIN;

-- ── Departments: optional columns (init only sets name, code, description, max_interns) ──
UPDATE departments AS d SET
  head_name   = v.head_name,
  head_email  = v.head_email,
  location    = v.loc,
  description = COALESCE(v.desc_long, d.description),
  max_interns = v.cap,
  is_active   = v.active
FROM (VALUES
  ('.NET',   'Vikram Desai',      'head.dotnet@company.com',  'Ahmedabad HQ — Tower 1',    '.NET and backend services pod',             18, TRUE),
  ('SAP',    'Meera Iyer',        'head.sap@company.com',     'Pune Campus',              'SAP ERP and integration',                   12, TRUE),
  ('AI',     'Ananya Shah',       'head.ai@company.com',      'Bangalore — Block A',     'AI/ML research and product ML',             22, TRUE),
  ('MOBILE', 'Arjun Patel',       'head.mobile@company.com',  'Hyderabad — Floor 3',     'Native and cross-platform mobile',          16, TRUE),
  ('ODOO',   'Ravi Menon',        'head.odoo@company.com',      'Remote-first Odoo cell',  'Odoo ERP implementations',                  11, TRUE),
  ('RPA',    'Kiran Bose',        'head.rpa@company.com',     'Chennai Lab',             'RPA bots and orchestration',                12, TRUE),
  ('PHP',    'Priya Nair',        'head.php@company.com',     'Kochi Office',            'PHP, Laravel, APIs',                        17, TRUE),
  ('QC',     'Sneha Krishnan',    'head.qc@company.com',      'Bangalore — QA wing',     'Manual and automation QA',                  14, TRUE)
) AS v(code, head_name, head_email, loc, desc_long, cap, active)
WHERE d.code = v.code;

-- ── Admin: all nullable / useful columns ────────────────────────────────────
UPDATE users SET
  password_hash   = '$2b$12$2sVEgxbxHELMndYX90q5DOhW6hO.FrwnaQROR90wawIGPnLDai0P2',
  phone           = '+91 98000 00001',
  profile_photo   = 'https://example-cdn.demo/internhub/admin.png',
  designation     = 'Platform Administrator',
  is_active       = TRUE,
  last_login      = NOW() - INTERVAL '90 minutes',
  department_id   = NULL
WHERE email = 'admin@company.com';

-- ── Department persons ──────────────────────────────────────────────────────
INSERT INTO users (
  id, name, email, password_hash, role, department_id, designation,
  phone, profile_photo, is_active, last_login
)
SELECT
  x.id, x.name, x.email::citext, x.password_hash, 'department_person', d.id, x.designation,
  x.phone, x.photo, TRUE, NOW() - (x.login_ago || ' hours')::interval
FROM (VALUES
  ('22222222-2222-4222-a222-222222220001'::uuid, 'Ananya Shah',     'dept.ai@company.com',     '$2b$12$YYAASOj/Am/d3SmtgacEG.crbDDjTTjsHUBmarI2f4KyoWUxVFcwq', 'AI Lead',       '+91 91000 22001', 'https://example-cdn.demo/internhub/dp-ai.png',     '3'::text),
  ('22222222-2222-4222-a222-222222220002'::uuid, 'Vikram Desai',   'dept.dotnet@company.com', '$2b$12$YYAASOj/Am/d3SmtgacEG.crbDDjTTjsHUBmarI2f4KyoWUxVFcwq', '.NET Lead',      '+91 91000 22002', 'https://example-cdn.demo/internhub/dp-dotnet.png', '12'::text),
  ('22222222-2222-4222-a222-222222220003'::uuid, 'Meera Iyer',     'dept.sap@company.com',    '$2b$12$YYAASOj/Am/d3SmtgacEG.crbDDjTTjsHUBmarI2f4KyoWUxVFcwq', 'SAP Consultant', '+91 91000 22003', 'https://example-cdn.demo/internhub/dp-sap.png',    '1'::text),
  ('22222222-2222-4222-a222-222222220004'::uuid, 'Priya Nair',     'dept.php@company.com',    '$2b$12$YYAASOj/Am/d3SmtgacEG.crbDDjTTjsHUBmarI2f4KyoWUxVFcwq', 'PHP Lead',       '+91 91000 22004', 'https://example-cdn.demo/internhub/dp-php.png',    '6'::text),
  ('22222222-2222-4222-a222-222222220005'::uuid, 'Arjun Patel',    'dept.mobile@company.com', '$2b$12$YYAASOj/Am/d3SmtgacEG.crbDDjTTjsHUBmarI2f4KyoWUxVFcwq', 'Mobile Lead',    '+91 91000 22005', 'https://example-cdn.demo/internhub/dp-mobile.png', '24'::text),
  ('22222222-2222-4222-a222-222222220006'::uuid, 'Sneha Krishnan', 'dept.qc@company.com',     '$2b$12$YYAASOj/Am/d3SmtgacEG.crbDDjTTjsHUBmarI2f4KyoWUxVFcwq', 'QC Manager',     '+91 91000 22006', 'https://example-cdn.demo/internhub/dp-qc.png',       '48'::text)
) AS x(id, name, email, password_hash, designation, phone, photo, login_ago)
JOIN departments d ON d.code = CASE x.email::text
  WHEN 'dept.ai@company.com'     THEN 'AI'
  WHEN 'dept.dotnet@company.com' THEN '.NET'
  WHEN 'dept.sap@company.com'    THEN 'SAP'
  WHEN 'dept.php@company.com'    THEN 'PHP'
  WHEN 'dept.mobile@company.com' THEN 'MOBILE'
  WHEN 'dept.qc@company.com'     THEN 'QC'
END
ON CONFLICT (email) DO UPDATE SET
  name            = EXCLUDED.name,
  password_hash   = EXCLUDED.password_hash,
  role            = EXCLUDED.role,
  department_id   = EXCLUDED.department_id,
  designation     = EXCLUDED.designation,
  phone           = EXCLUDED.phone,
  profile_photo   = EXCLUDED.profile_photo,
  is_active       = EXCLUDED.is_active,
  last_login      = EXCLUDED.last_login;

-- ── Intern users ────────────────────────────────────────────────────────────
INSERT INTO users (
  id, name, email, password_hash, role, department_id,
  phone, profile_photo, designation, is_active, last_login
)
SELECT
  x.id, x.name, x.email::citext, x.password_hash, 'intern', d.id,
  x.phone, x.photo, 'Intern', TRUE, NOW() - (x.login_ago || ' hours')::interval
FROM (VALUES
  ('33333333-3333-4333-a333-333333330001'::uuid, 'Raj Mehta',       'raj.ai@student.com',         '$2b$12$qK2hwlgatuDtOrtsdeMCAOMQEyM2bm6erfKgPzXPXSX07xyNlYXva', '+91 92000 33001', 'https://example-cdn.demo/internhub/intern-01.png', '2'::text,  'AI'),
  ('33333333-3333-4333-a333-333333330002'::uuid, 'Kavya Reddy',     'kavya.php@student.com',      '$2b$12$qK2hwlgatuDtOrtsdeMCAOMQEyM2bm6erfKgPzXPXSX07xyNlYXva', '+91 92000 33002', 'https://example-cdn.demo/internhub/intern-02.png', '5'::text,  'PHP'),
  ('33333333-3333-4333-a333-333333330003'::uuid, 'Rohan Verma',     'rohan.dotnet@student.com',     '$2b$12$qK2hwlgatuDtOrtsdeMCAOMQEyM2bm6erfKgPzXPXSX07xyNlYXva', '+91 92000 33003', 'https://example-cdn.demo/internhub/intern-03.png', '1'::text,  '.NET'),
  ('33333333-3333-4333-a333-333333330004'::uuid, 'Divya Menon',     'divya.completed@student.com',  '$2b$12$qK2hwlgatuDtOrtsdeMCAOMQEyM2bm6erfKgPzXPXSX07xyNlYXva', '+91 92000 33004', 'https://example-cdn.demo/internhub/intern-04.png', '72'::text, 'MOBILE'),
  ('33333333-3333-4333-a333-333333330005'::uuid, 'Amit Joshi',      'amit.term@student.com',        '$2b$12$qK2hwlgatuDtOrtsdeMCAOMQEyM2bm6erfKgPzXPXSX07xyNlYXva', '+91 92000 33005', 'https://example-cdn.demo/internhub/intern-05.png', '168'::text,'SAP'),
  ('33333333-3333-4333-a333-333333330006'::uuid, 'Neha Kulkarni',   'neha.leave@student.com',       '$2b$12$qK2hwlgatuDtOrtsdeMCAOMQEyM2bm6erfKgPzXPXSX07xyNlYXva', '+91 92000 33006', 'https://example-cdn.demo/internhub/intern-06.png', '4'::text,  'QC'),
  ('33333333-3333-4333-a333-333333330007'::uuid, 'Suresh Anand',    'suresh.selected@student.com',  '$2b$12$qK2hwlgatuDtOrtsdeMCAOMQEyM2bm6erfKgPzXPXSX07xyNlYXva', '+91 92000 33007', 'https://example-cdn.demo/internhub/intern-07.png', '8'::text,  'RPA')
) AS x(id, name, email, password_hash, phone, photo, login_ago, dept_code)
JOIN departments d ON d.code = x.dept_code
ON CONFLICT (email) DO UPDATE SET
  name            = EXCLUDED.name,
  password_hash   = EXCLUDED.password_hash,
  role            = EXCLUDED.role,
  department_id   = EXCLUDED.department_id,
  phone           = EXCLUDED.phone,
  profile_photo   = EXCLUDED.profile_photo,
  designation     = EXCLUDED.designation,
  is_active       = EXCLUDED.is_active,
  last_login      = EXCLUDED.last_login;

-- ── Interns: every column (CHECK constraints satisfied per row) ────────────
INSERT INTO interns (
  id, name, email, phone, alternate_phone, date_of_birth, gender, blood_group, nationality, profile_photo,
  address_line1, address_line2, city, state, pincode, country,
  college, university, degree, branch, specialization, graduation_year, current_year, cgpa, percentage,
  student_id, college_email, college_city, college_state,
  department_id, start_date, end_date, duration_months, status, work_mode,
  stipend, offer_letter_date, joining_letter_date, mentor_id,
  skills, languages_known, tools,
  linkedin_url, github_url, portfolio_url,
  aadhar_number, pan_number,
  reference_name, reference_contact,
  user_id, created_by, notes
)
SELECT
  v.id, v.name, v.email::citext, v.phone, v.alt_phone, v.dob::date, v.gender, v.blood, v.nationality, v.avatar,
  v.addr1, v.addr2, v.city, v.state, v.pin, v.country,
  v.college, v.university, v.degree, v.branch, v.spec, v.grad_yr, v.cur_yr, v.cgpa, v.pct,
  v.stu_id, v.coll_email::citext, v.coll_city, v.coll_state,
  d.id, v.start_d::date, v.end_d::date, v.dur_m, v.status, v.wmode,
  v.stipend, v.offer_d::date, v.join_d::date, m.id,
  v.skills, v.langs, v.tools,
  v.linkedin, v.github, v.portfolio,
  v.aadhar, v.pan,
  v.ref_name, v.ref_phone,
  u.id, (SELECT id FROM users WHERE email = 'admin@company.com' LIMIT 1), v.notes
FROM (VALUES
  -- Raj — active, male, AI
  ('44444444-4444-4444-a444-444444440001'::uuid, 'Raj Mehta', 'raj.ai@student.com',
   '+91 90001 11101', '+91 90001 11999', '2002-03-15', 'male', 'B+', 'Indian', 'https://example-cdn.demo/internhub/face-01.jpg',
   '12 Lake Road', 'Apt 4B', 'Chennai', 'TN', '600028', 'India',
   'IIT Madras', 'IIT Madras', 'B.Tech', 'Computer Science', 'Deep Learning', 2025, 4, 8.70, 87.50,
   'IM22CS1001', 'raj.mehta@student.iitm.ac.in', 'Chennai', 'TN',
   'AI', '2025-06-01', NULL, 6, 'active', 'hybrid',
   25000.00, '2025-05-01', '2025-06-01',
   ARRAY['Python','PyTorch','SQL']::text[], ARRAY['English','Hindi','Tamil']::text[], ARRAY['VS Code','Docker','W&B']::text[],
   'https://linkedin.com/demo/raj-mehta', 'https://github.com/demo-raj', 'https://raj-demo.portfolio.dev',
   '123456789012', 'ABCDE1234F',
   'Prof. K. Subramanian', '+91 91000 99001',
   'GPU hours approved for benchmark sprint.'),
  -- Kavya — female, PHP
  ('44444444-4444-4444-a444-444444440002'::uuid, 'Kavya Reddy', 'kavya.php@student.com',
   '+91 90001 11102', NULL, '2001-11-08', 'female', 'O+', 'Indian', 'https://example-cdn.demo/internhub/face-02.jpg',
   '88 Jubilee Hills', NULL, 'Hyderabad', 'TG', '500033', 'India',
   'BITS Pilani', 'BITS Pilani', 'B.E.', 'Information Technology', 'Web backends', 2025, 4, 8.20, 84.20,
   'BP23IT045', 'kavya.r@pilani.bits-pilani.ac.in', 'Hyderabad', 'TG',
   'PHP', '2025-01-15', NULL, 5, 'active', 'onsite',
   22000.00, '2024-12-20', '2025-01-15',
   ARRAY['PHP','Laravel','MySQL']::text[], ARRAY['English','Telugu']::text[], ARRAY['PhpStorm','Postman']::text[],
   'https://linkedin.com/demo/kavya-r', 'https://github.com/demo-kavya', NULL,
   '234567890123', 'FGHIJ5678K',
   'Dr. L. Prasad', '+91 91000 99002',
   'Strong API design; assign payment module.'),
  -- Rohan — prefer_not_to_say, .NET
  ('44444444-4444-4444-a444-444444440003'::uuid, 'Rohan Verma', 'rohan.dotnet@student.com',
   '+91 90001 11103', '+91 90001 11303', '2000-07-22', 'prefer_not_to_say', 'A+', 'Indian', 'https://example-cdn.demo/internhub/face-03.jpg',
   'Plot 21 Sector 9', NULL, 'Nagpur', 'MH', '440009', 'India',
   'NIT Trichy', 'NIT Trichy', 'B.Tech', 'IT', 'Distributed systems', 2024, NULL, 7.90, 79.10,
   'NITT21IT777', 'rohan.v@nitt.edu', 'Tiruchirappalli', 'TN',
   '.NET', '2025-03-01', NULL, 6, 'active', 'remote',
   24000.00, '2025-02-10', '2025-03-01',
   ARRAY['C#','.NET','Azure']::text[], ARRAY['English','Hindi']::text[], ARRAY['Rider','Azure Portal']::text[],
   NULL, 'https://github.com/demo-rohan', 'https://rohan-demo.dev',
   '345678901234', 'KLMNO9012P',
   'Ms. T. Das', '+91 91000 99003',
   'Remote onboarding completed.'),
  -- Divya — completed, Mobile
  ('44444444-4444-4444-a444-444444440004'::uuid, 'Divya Menon', 'divya.completed@student.com',
   '+91 90001 11104', NULL, '1999-01-30', 'female', 'AB+', 'Indian', 'https://example-cdn.demo/internhub/face-04.jpg',
   'Rose Villa', 'Lane 2', 'Udupi', 'KA', '576101', 'India',
   'Manipal Institute', 'MAHE', 'B.Tech', 'CSE', 'Mobile UX', 2024, NULL, 8.50, 88.00,
   'MIT22CS4004', 'divya.m@learner.manipal.edu', 'Manipal', 'KA',
   'MOBILE', '2024-06-01', '2025-02-28', 9, 'completed', 'onsite',
   20000.00, '2024-05-01', '2024-06-01',
   ARRAY['Kotlin','Swift','Jetpack']::text[], ARRAY['English','Malayalam']::text[], ARRAY['Android Studio','Xcode']::text[],
   'https://linkedin.com/demo/divya-m', 'https://github.com/demo-divya', 'https://divya.work',
   '456789012345', 'PQRST3456U',
   'Mr. G. Nair', '+91 91000 99004',
   'Exited cleanly; eligible for return offer discussion.'),
  -- Amit — terminated, SAP
  ('44444444-4444-4444-a444-444444440005'::uuid, 'Amit Joshi', 'amit.term@student.com',
   '+91 90001 11105', NULL, '2001-05-18', 'male', 'A-', 'Indian', 'https://example-cdn.demo/internhub/face-05.jpg',
   'B-404 DTU Hostel', NULL, 'Delhi', 'DL', '110042', 'India',
   'DTU', 'Delhi Technological University', 'B.Tech', 'ECE', 'SAP integration', 2025, 4, 7.40, 76.30,
   'DTU22CO501', 'amit.j@dtu.ac.in', 'New Delhi', 'DL',
   'SAP', '2024-11-01', '2025-01-15', 3, 'terminated', 'onsite',
   18000.00, '2024-10-15', '2024-11-01',
   ARRAY['ABAP','SAP Fiori']::text[], ARRAY['English','Hindi']::text[], ARRAY['SAP GUI','Eclipse ADT']::text[],
   'https://linkedin.com/demo/amit-j', NULL, NULL,
   '567890123456', 'UVWXY7890Z',
   'Prof. R. Khanna', '+91 91000330555',
   'Terminated per mutual early exit; access revoked.'),
  -- Neha — on_leave, QC
  ('44444444-4444-4444-a444-444444440006'::uuid, 'Neha Kulkarni', 'neha.leave@student.com',
   '+91 90001 11106', '+91 90001 11606', '2002-09-02', 'female', 'B-', 'Indian', 'https://example-cdn.demo/internhub/face-06.jpg',
   'Sinhgad Road', 'Flat 9', 'Pune', 'MH', '411041', 'India',
   'COEP', 'Savitribai Phule Pune University', 'B.Tech', 'IT', 'Test automation', 2026, 3, 8.10, 82.40,
   'COEP25IT901', 'neha.k@coep.ac.in', 'Pune', 'MH',
   'QC', '2025-04-01', NULL, 6, 'on_leave', 'hybrid',
   23000.00, '2025-03-15', '2025-04-01',
   ARRAY['Selenium','Jest','Playwright']::text[], ARRAY['English','Marathi']::text[], ARRAY['Jira','TestRail']::text[],
   'https://linkedin.com/demo/neha-k', 'https://github.com/demo-neha', NULL,
   '678901234567', 'AABCD1111E',
   'Ms. S. Patil', '+91 91000 99006',
   'Medical leave approved Apr 2025.'),
  -- Suresh — selected, RPA
  ('44444444-4444-4444-a444-444444440007'::uuid, 'Suresh Anand', 'suresh.selected@student.com',
   '+91 90001 11107', NULL, '2003-12-11', 'male', 'O-', 'Indian', 'https://example-cdn.demo/internhub/face-07.jpg',
   'Gandhinagar St', NULL, 'Vellore', 'TN', '632014', 'India',
   'VIT', 'VIT', 'B.Tech', 'CSE', 'RPA', 2026, 3, 8.00, 81.00,
   'VIT26CS1200', 'suresh.a@vitstudent.ac.in', 'Vellore', 'TN',
   'RPA', '2025-07-01', NULL, 6, 'selected', 'onsite',
   26000.00, '2025-06-01', '2025-06-15',
   ARRAY['UiPath','Power Automate']::text[], ARRAY['English','Tamil']::text[], ARRAY['UiPath Studio','Orchestrator']::text[],
   NULL, 'https://github.com/demo-suresh', NULL,
   '789012345678', 'BBCDE2222F',
   'Dr. N. Rao', '+91 91000 99007',
   'Offer accepted; start July batch.'),
  -- Applicant — applied, no user login, ODOO
  ('44444444-4444-4444-a444-444444440008'::uuid, 'Applicant Singh', 'applicant.pipeline@mail.com',
   '+91 90001 11108', NULL, '2002-04-25', 'male', 'B+', 'Indian', 'https://example-cdn.demo/internhub/face-08.jpg',
   'North Campus', 'Room 7', 'Delhi', 'DL', '110007', 'India',
   'DU', 'University of Delhi', 'B.Sc', 'CS', 'ERP', 2026, 2, 7.60, 78.90,
   'DU25CS5544', 'applicant.s@du.ac.in', 'New Delhi', 'DL',
   'ODOO', '2025-09-01', NULL, NULL, 'applied', 'remote',
   NULL, NULL, NULL,
   ARRAY['Python','Odoo']::text[], ARRAY['English','Hindi']::text[], ARRAY['PyCharm','pgAdmin']::text[],
   NULL, NULL, NULL,
   NULL, NULL,
   'Dr. Mehta College', '+91 91000 88008',
   'Pipeline candidate; no system user yet.'),
  -- Legacy — completed, no user_id
  ('44444444-4444-4444-a444-444444440009'::uuid, 'Legacy Trainee', 'legacy.nulluser@mail.com',
   '+91 90001 11109', NULL, '1998-10-01', 'other', 'AB-', 'Indian', NULL,
   'Old Hostel Block', NULL, 'Indore', 'MP', '452001', 'India',
   'Older College', 'State University', 'B.Tech', 'Mechanical', 'N/A', 2022, NULL, 6.80, 72.00,
   'LEG19ME001', NULL, 'Indore', 'MP',
   'PHP', '2023-01-01', '2023-12-01', 12, 'completed', 'onsite',
   15000.00, '2022-11-01', '2023-01-01',
   ARRAY['PHP']::text[], ARRAY['English']::text[], ARRAY['NetBeans']::text[],
   NULL, NULL, NULL,
   NULL, NULL,
   NULL, NULL,
   'Historical import; pre SSO linkage.'
  )
) AS v(
  id, name, email, phone, alt_phone, dob, gender, blood, nationality, avatar,
  addr1, addr2, city, state, pin, country,
  college, university, degree, branch, spec, grad_yr, cur_yr, cgpa, pct,
  stu_id, coll_email, coll_city, coll_state,
  dept_code, start_d, end_d, dur_m, status, wmode,
  stipend, offer_d, join_d,
  skills, langs, tools,
  linkedin, github, portfolio,
  aadhar, pan,
  ref_name, ref_phone,
  notes
)
JOIN departments d ON d.code = v.dept_code
LEFT JOIN users u ON u.email = v.email::citext
LEFT JOIN users m ON m.department_id = d.id AND m.role = 'department_person' AND m.email = (
  CASE v.dept_code
    WHEN 'AI'     THEN 'dept.ai@company.com'
    WHEN '.NET'   THEN 'dept.dotnet@company.com'
    WHEN 'SAP'    THEN 'dept.sap@company.com'
    WHEN 'PHP'    THEN 'dept.php@company.com'
    WHEN 'MOBILE' THEN 'dept.mobile@company.com'
    WHEN 'QC'     THEN 'dept.qc@company.com'
    ELSE NULL
  END
)
ON CONFLICT (email) DO UPDATE SET
  name                = EXCLUDED.name,
  phone               = EXCLUDED.phone,
  alternate_phone     = EXCLUDED.alternate_phone,
  date_of_birth       = EXCLUDED.date_of_birth,
  gender              = EXCLUDED.gender,
  blood_group         = EXCLUDED.blood_group,
  nationality         = EXCLUDED.nationality,
  profile_photo       = EXCLUDED.profile_photo,
  address_line1       = EXCLUDED.address_line1,
  address_line2       = EXCLUDED.address_line2,
  city                = EXCLUDED.city,
  state               = EXCLUDED.state,
  pincode             = EXCLUDED.pincode,
  country             = EXCLUDED.country,
  college             = EXCLUDED.college,
  university          = EXCLUDED.university,
  degree              = EXCLUDED.degree,
  branch              = EXCLUDED.branch,
  specialization      = EXCLUDED.specialization,
  graduation_year     = EXCLUDED.graduation_year,
  current_year        = EXCLUDED.current_year,
  cgpa                = EXCLUDED.cgpa,
  percentage          = EXCLUDED.percentage,
  student_id          = EXCLUDED.student_id,
  college_email       = EXCLUDED.college_email,
  college_city        = EXCLUDED.college_city,
  college_state       = EXCLUDED.college_state,
  department_id       = EXCLUDED.department_id,
  start_date          = EXCLUDED.start_date,
  end_date            = EXCLUDED.end_date,
  duration_months     = EXCLUDED.duration_months,
  status              = EXCLUDED.status,
  work_mode           = EXCLUDED.work_mode,
  stipend             = EXCLUDED.stipend,
  offer_letter_date   = EXCLUDED.offer_letter_date,
  joining_letter_date = EXCLUDED.joining_letter_date,
  mentor_id           = EXCLUDED.mentor_id,
  skills              = EXCLUDED.skills,
  languages_known     = EXCLUDED.languages_known,
  tools               = EXCLUDED.tools,
  linkedin_url        = EXCLUDED.linkedin_url,
  github_url          = EXCLUDED.github_url,
  portfolio_url       = EXCLUDED.portfolio_url,
  aadhar_number       = EXCLUDED.aadhar_number,
  pan_number          = EXCLUDED.pan_number,
  reference_name      = EXCLUDED.reference_name,
  reference_contact   = EXCLUDED.reference_contact,
  user_id             = EXCLUDED.user_id,
  created_by          = EXCLUDED.created_by,
  notes               = EXCLUDED.notes,
  updated_at          = NOW();

-- ── Tasks + related (only if schema includes tasks) ─────────────────────────
DO $$
BEGIN
  IF to_regclass('public.tasks') IS NULL THEN
    RAISE NOTICE 'seed: skipping tasks (no public.tasks; recreate DB or run full init.sql)';
    RETURN;
  END IF;

  DELETE FROM tasks WHERE id IN (
    '55555555-5555-4555-a555-555555550001'::uuid,
    '55555555-5555-4555-a555-555555550002'::uuid,
    '55555555-5555-4555-a555-555555550003'::uuid,
    '55555555-5555-4555-a555-555555550004'::uuid,
    '55555555-5555-4555-a555-555555550005'::uuid,
    '55555555-5555-4555-a555-555555550006'::uuid
  );

  INSERT INTO tasks (
    id, title, description, priority, status,
    intern_id, assigned_by, assigned_to,
    due_date, start_date, completed_date, estimated_hours,
    department_id, parent_task_id,
    tags, attachment_url, notes,
    created_at, updated_at
  )
  SELECT
    s.id, s.title, s.description, s.priority, s.status,
    i.id, admin.id, u.id,
    s.due_date::date, s.start_date::date, s.completed_date::date, s.est_hrs,
    i.department_id, s.parent_id,
    s.tags, s.attach, s.tnotes,
    s.created_at::timestamptz, s.updated_at::timestamptz
  FROM (VALUES
    ('55555555-5555-4555-a555-555555550001'::uuid, 'Model evaluation pipeline',
     'Document benchmarks and upload evaluation notebook.', 'high', 'in_progress',
     'raj.ai@student.com', '2025-04-15'::date, '2025-03-01'::date, NULL::date, 40.50,
     NULL::uuid,
     ARRAY['ml','documentation']::text[],
     'https://files.demo/internhub/attach/benchmarks.pdf',
     'Owner: admin; deadline may slip if GPU queue grows.',
     '2025-03-01 09:00:00+05'::timestamptz, '2025-03-05 14:00:00+05'::timestamptz),
    ('55555555-5555-4555-a555-555555550002'::uuid, 'Payment webhook tests',
     'Integration tests for refund and capture paths.', 'medium', 'open',
     'kavya.php@student.com', '2025-04-20'::date, '2025-03-10'::date, NULL::date, 16.00,
     NULL::uuid,
     ARRAY['qa','api']::text[],
     'https://files.demo/internhub/attach/webhook-spec.docx',
     'Block release until parity with staging.',
     '2025-03-10 08:30:00+05'::timestamptz, '2025-03-11 10:00:00+05'::timestamptz),
    ('55555555-5555-4555-a555-555555550003'::uuid, 'Security onboarding module',
     'Complete training and acknowledge policy.', 'low', 'completed',
     'rohan.dotnet@student.com', NULL::date, '2025-02-01'::date, '2025-02-25'::date, 8.00,
     NULL::uuid,
     ARRAY['hr','security']::text[],
     NULL,
     'Closed successfully.',
     '2025-02-01 08:00:00+05'::timestamptz, '2025-02-25 17:10:00+05'::timestamptz),
    ('55555555-5555-4555-a555-555555550004'::uuid, 'Critical migration dry-run',
     'Schedule after-hours runbook review.', 'critical', 'on_hold',
     'raj.ai@student.com', '2025-05-01'::date, '2025-03-15'::date, NULL::date, 120.00,
     NULL::uuid,
     ARRAY['infra']::text[],
     'https://files.demo/internhub/attach/runbook-v3.xlsx',
     'Waiting on DBA sign-off.',
     '2025-03-15 07:45:00+05'::timestamptz, '2025-03-18 09:30:00+05'::timestamptz),
    ('55555555-5555-4555-a555-555555550005'::uuid, 'Legacy report decommission',
     'Sunset Crystal report; notify stakeholders.', 'medium', 'cancelled',
     'kavya.php@student.com', '2025-03-30'::date, '2025-02-28'::date, NULL::date, 12.00,
     NULL::uuid,
     ARRAY['sunset']::text[],
     NULL,
     'Cancelled: product line merged.',
     '2025-02-28 15:00:00+05'::timestamptz, '2025-03-10 09:05:00+05'::timestamptz),
    ('55555555-5555-4555-a555-555555550006'::uuid, 'Sub-task: export metrics CSV',
     'Child of evaluation pipeline - weekly export job.', 'low', 'open',
     'raj.ai@student.com', '2025-04-10'::date, '2025-03-20'::date, NULL::date, 4.00,
     '55555555-5555-4555-a555-555555550001'::uuid,
     ARRAY['ml','export']::text[],
     NULL,
     'parent_task_id points to main pipeline task.',
     '2025-03-20 08:00:00+05'::timestamptz, '2025-03-21 08:35:00+05'::timestamptz)
  ) AS s(
    id, title, description, priority, status, intern_email,
    due_date, start_date, completed_date, est_hrs,
    parent_id, tags, attach, tnotes,
    created_at, updated_at
  )
  CROSS JOIN LATERAL (SELECT id FROM users WHERE email = 'admin@company.com' LIMIT 1) admin
  JOIN users u ON u.email = s.intern_email::citext
  JOIN interns i ON i.email = s.intern_email::citext;

  INSERT INTO task_interns (id, task_id, intern_id, intern_status, created_at, updated_at)
  VALUES
    ('77777777-7777-4777-a777-777777770001'::uuid, '55555555-5555-4555-a555-555555550001', '44444444-4444-4444-a444-444444440001', 'pending', '2025-03-02 10:00:00+05', '2025-03-05 14:30:00+05'),
    ('77777777-7777-4777-a777-777777770002'::uuid, '55555555-5555-4555-a555-555555550002', '44444444-4444-4444-a444-444444440002', 'pending', '2025-03-11 09:15:00+05', '2025-03-11 09:15:00+05'),
    ('77777777-7777-4777-a777-777777770003'::uuid, '55555555-5555-4555-a555-555555550003', '44444444-4444-4444-a444-444444440003', 'completed', '2025-02-02 08:00:00+05', '2025-02-25 17:00:00+05'),
    ('77777777-7777-4777-a777-777777770004'::uuid, '55555555-5555-4555-a555-555555550004', '44444444-4444-4444-a444-444444440001', 'pending', '2025-03-16 11:00:00+05','2025-03-16 11:00:00+05'),
    ('77777777-7777-4777-a777-777777770005'::uuid, '55555555-5555-4555-a555-555555550005', '44444444-4444-4444-a444-444444440002', 'pending', '2025-03-01 12:00:00+05','2025-03-10 09:00:00+05'),
    ('77777777-7777-4777-a777-777777770006'::uuid, '55555555-5555-4555-a555-555555550006', '44444444-4444-4444-a444-444444440001', 'pending', '2025-03-21 08:30:00+05','2025-03-21 08:30:00+05');

  INSERT INTO task_comments (id, task_id, user_id, comment, created_at, updated_at)
  VALUES
    ('66666666-6666-4666-a666-666666660001'::uuid, '55555555-5555-4555-a555-555555550001',
     (SELECT id FROM users WHERE email = 'admin@company.com' LIMIT 1),
     'Add latency numbers and hardware notes to the benchmark doc.',
     '2025-03-03 10:00:00+05', '2025-03-03 10:00:00+05'),
    ('66666666-6666-4666-a666-666666660002'::uuid, '55555555-5555-4555-a555-555555550001',
     (SELECT id FROM users WHERE email = 'raj.ai@student.com' LIMIT 1),
     'Notebook draft is on the shared drive; review section 3.',
     '2025-03-04 16:20:00+05', '2025-03-04 18:00:00+05'),
    ('66666666-6666-4666-a666-666666660003'::uuid, '55555555-5555-4555-a555-555555550002',
     (SELECT id FROM users WHERE email = 'dept.php@company.com' LIMIT 1),
     'Prioritize refund idempotency tests first.',
     '2025-03-12 10:00:00+05', '2025-03-12 10:00:00+05');

  INSERT INTO task_activity_log (id, task_id, user_id, action, old_value, new_value, created_at)
  VALUES
    ('88888888-8888-4888-a888-888888880001'::uuid, '55555555-5555-4555-a555-555555550001',
     (SELECT id FROM users WHERE email = 'admin@company.com' LIMIT 1), 'created', NULL, NULL, '2025-03-01 09:00:00+05'),
    ('88888888-8888-4888-a888-888888880002'::uuid, '55555555-5555-4555-a555-555555550001',
     (SELECT id FROM users WHERE email = 'dept.ai@company.com' LIMIT 1), 'status_changed', 'open', 'in_progress', '2025-03-02 11:00:00+05'),
    ('88888888-8888-4888-a888-888888880003'::uuid, '55555555-5555-4555-a555-555555550003',
     (SELECT id FROM users WHERE email = 'admin@company.com' LIMIT 1), 'status_changed', 'in_progress', 'completed', '2025-02-25 17:05:00+05'),
    ('88888888-8888-4888-a888-888888880004'::uuid, '55555555-5555-4555-a555-555555550004',
     (SELECT id FROM users WHERE email = 'admin@company.com' LIMIT 1), 'priority_changed', 'high', 'critical', '2025-03-18 09:00:00+05'),
    ('88888888-8888-4888-a888-888888880005'::uuid, '55555555-5555-4555-a555-555555550005',
     (SELECT id FROM users WHERE email = 'dept.php@company.com' LIMIT 1), 'cancelled', 'open', 'cancelled', '2025-03-10 09:05:00+05');

END $$;

COMMIT;
