import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendPasswordSetupEmail } from '@/lib/email';

const HASURA_ENDPOINT = process.env.HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN = process.env.HASURA_ADMIN_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'intern-mgmt-jwt-secret-change-in-prod';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const IS_DEMO = !HASURA_ADMIN;

async function hasura<T = unknown>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hasura-admin-secret': HASURA_ADMIN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'Hasura error');
  return json.data as T;
}

function normKey(k: string) {
  return k.toLowerCase().replace(/[\s_-]+/g, '_');
}

// Department alias map — short name → substring of full name
const DEPT_ALIASES: Record<string, string> = {
  'ai':       'artificial intelligence',
  'php':      'php development',
  '.net':     '.net development',
  'dotnet':   '.net development',
  'mobile':   'mobile development',
  'odoo':     'odoo',
  'oddo':     'odoo',
  'erp':      'odoo',
  'rpa':      'robotic process automation',
  'sap':      'sap consulting',
  'qc':       'quality control',
  'qa':       'quality',
};

type Department = { id: string; name: string };

function findDepartment(departments: Department[], input: string): Department | undefined {
  const lower = input.trim().toLowerCase();
  // 1. Exact match
  const exact = departments.find((d) => d.name.toLowerCase() === lower);
  if (exact) return exact;
  // 2. Alias match
  const alias = DEPT_ALIASES[lower];
  if (alias) return departments.find((d) => d.name.toLowerCase().includes(alias));
  // 3. Partial match
  return departments.find((d) => d.name.toLowerCase().includes(lower) || lower.includes(d.name.toLowerCase()));
}

function parseExcelDate(val: unknown): string | null {
  if (!val && val !== 0) return null;
  if (typeof val === 'number') {
    const d = xlsx.SSF.parse_date_code(val);
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

type RowResult = {
  row: number;
  status: 'success' | 'error' | 'skipped';
  name: string;
  email: string;
  message?: string;
  resetLink?: string;
  emailSent?: boolean;
};

/* ── POST /api/interns/import ────────────────────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const deptsJson = formData.get('departments') as string | null;

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    const departments: Department[] = deptsJson ? JSON.parse(deptsJson) : [];

    // Parse Excel
    const buffer = await file.arrayBuffer();
    const wb = xlsx.read(buffer, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rawRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    if (rawRows.length === 0) {
      return NextResponse.json({ message: 'The file contains no data rows' }, { status: 400 });
    }

    // Filter out instruction/note rows
    const dataRows = rawRows.filter((row) => {
      const first = String(Object.values(row)[0] ?? '').trim();
      return (
        first !== '' &&
        !first.startsWith('INFO') &&
        !first.startsWith('ℹ') &&
        !first.startsWith('•') &&
        !first.startsWith('Required') &&
        !first.startsWith('All other') &&
        !first.startsWith('Department') &&
        !first.startsWith('Status') &&
        !first.startsWith('Work Mode') &&
        !first.startsWith('Date format') &&
        !first.startsWith('Skills') &&
        !first.startsWith('Delete') &&
        !first.startsWith('Do NOT')
      );
    });

    if (IS_DEMO) {
      // Demo mode — return parsed rows for client-side insertion
      const parsed = dataRows.map((raw, i) => {
        const row: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) row[normKey(k)] = String(v).trim();
        return {
          row: i + 2,
          name: row['name'] || '',
          email: (row['email'] || '').toLowerCase(),
          phone: row['phone'] || '',
          college: row['college'] || '',
          degree: row['degree'] || '',
          branch: row['branch'] || '',
          deptName: row['department'] || '',
          startDate: parseExcelDate(raw['Start Date'] ?? raw['start_date'] ?? ''),
          endDate: parseExcelDate(raw['End Date'] ?? raw['end_date'] ?? ''),
          status: ['active', 'completed', 'terminated'].includes((row['status'] || 'active').toLowerCase())
            ? (row['status'] || 'active').toLowerCase()
            : 'active',
        };
      });
      return NextResponse.json({ demo: true, rows: parsed });
    }

    // ── Production: create interns in DB ─────────────────────────────────────
    const results: RowResult[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const raw = dataRows[i];
      const rowNum = i + 2;

      // Normalize column keys
      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) row[normKey(k)] = String(v).trim();

      // ── Required fields ───────────────────────────────────────────────────
      const name      = row['name'] || '';
      const email     = (row['email'] || '').toLowerCase();
      const phone     = row['phone'] || '';
      const college   = row['college'] || '';
      const degree    = row['degree'] || '';
      const branch    = row['branch'] || '';
      const deptName  = row['department'] || row['department_name'] || '';
      const startDate = parseExcelDate(raw['Start Date'] ?? raw['start_date'] ?? raw['start date'] ?? '');
      const endDate   = parseExcelDate(raw['End Date'] ?? raw['end_date'] ?? raw['end date'] ?? '') ?? undefined;
      const rawStatus = (row['status'] || 'active').toLowerCase();
      const finalStatus = ['active', 'completed', 'terminated'].includes(rawStatus) ? rawStatus : 'active';

      // ── Optional personal fields ──────────────────────────────────────────
      const alternatePhone    = row['alternate_phone'] || null;
      const dateOfBirth       = parseExcelDate(raw['Date of Birth'] ?? raw['date_of_birth'] ?? '') ?? null;
      const gender            = row['gender'] || null;
      const bloodGroup        = row['blood_group'] || null;
      const nationality       = row['nationality'] || null;
      const addressLine1      = row['address_line1'] || null;
      const addressLine2      = row['address_line2'] || null;
      const city              = row['city'] || null;
      const state             = row['state'] || null;
      const pincode           = row['pincode'] || null;
      const country           = row['country'] || null;

      // ── Optional academic fields ──────────────────────────────────────────
      const university        = row['university'] || null;
      const specialization    = row['specialization'] || null;
      const graduationYear    = row['graduation_year'] ? parseInt(row['graduation_year']) : null;
      const currentYear       = row['current_year'] ? parseInt(row['current_year']) : null;
      const cgpa              = row['cgpa'] ? parseFloat(row['cgpa']) : null;
      const percentage        = row['percentage'] ? parseFloat(row['percentage']) : null;
      const studentId         = row['student_id'] || null;
      const collegeEmail      = row['college_email'] || null;
      const collegeCity       = row['college_city'] || null;
      const collegeState      = row['college_state'] || null;

      // ── Optional internship fields ────────────────────────────────────────
      const rawWorkMode       = (row['work_mode'] || '').toLowerCase();
      const workMode          = ['onsite', 'remote', 'hybrid'].includes(rawWorkMode) ? rawWorkMode : null;
      const stipend           = row['stipend'] ? parseFloat(row['stipend']) : null;
      const durationMonths    = row['duration_months'] ? parseInt(row['duration_months']) : null;
      const offerLetterDate   = parseExcelDate(raw['Offer Letter Date'] ?? raw['offer_letter_date'] ?? '') ?? null;
      const joiningLetterDate = parseExcelDate(raw['Joining Letter Date'] ?? raw['joining_letter_date'] ?? '') ?? null;

      // ── Optional skills / social / docs ──────────────────────────────────
      const skills          = row['skills'] ? row['skills'].split(',').map((s: string) => s.trim()).filter(Boolean) : null;
      const languagesKnown  = row['languages_known'] ? row['languages_known'].split(',').map((s: string) => s.trim()).filter(Boolean) : null;
      const tools           = row['tools'] ? row['tools'].split(',').map((s: string) => s.trim()).filter(Boolean) : null;
      const linkedinUrl     = row['linkedin_url'] || null;
      const githubUrl       = row['github_url'] || null;
      const portfolioUrl    = row['portfolio_url'] || null;
      const aadharNumber    = row['aadhar_number'] || null;
      const panNumber       = row['pan_number'] || null;
      const referenceName   = row['reference_name'] || null;
      const referenceContact = row['reference_contact'] || null;
      const notes           = row['notes'] || null;

      // ── Validate required ─────────────────────────────────────────────────
      if (!name || !email || !college || !degree || !branch) {
        results.push({ row: rowNum, status: 'error', name, email, message: 'Missing required: Name, Email, College, Degree, Branch' });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ row: rowNum, status: 'error', name, email, message: 'Invalid email address' });
        continue;
      }
      const dept = findDepartment(departments, deptName);
      if (!dept) {
        results.push({
          row: rowNum, status: 'error', name, email,
          message: `Department "${deptName}" not found. Available: ${departments.map((d) => d.name).join(', ')}`,
        });
        continue;
      }
      if (!startDate) {
        results.push({ row: rowNum, status: 'error', name, email, message: 'Invalid or missing Start Date (use YYYY-MM-DD)' });
        continue;
      }

      try {
        // Check duplicate
        type UserCheck = { users: { id: string }[] };
        const existing = await hasura<UserCheck>(
          `query CheckEmail($email: citext!) { users(where: { email: { _eq: $email } }, limit: 1) { id } }`,
          { email },
        );
        if (existing.users.length > 0) {
          results.push({ row: rowNum, status: 'skipped', name, email, message: 'Email already exists' });
          continue;
        }

        // Create user account
        const tempPass = `${crypto.randomUUID()}-${Date.now()}`;
        const passwordHash = await bcrypt.hash(tempPass, 10);

        type InsertUser = { insert_users_one: { id: string } };
        const { insert_users_one } = await hasura<InsertUser>(
          `mutation CreateUser($obj: users_insert_input!) { insert_users_one(object: $obj) { id } }`,
          { obj: { name, email, password_hash: passwordHash, role: 'intern', department_id: dept.id } },
        );
        const userId = insert_users_one.id;

        // Create intern record with ALL fields
        await hasura(
          `mutation CreateIntern($obj: interns_insert_input!) { insert_interns_one(object: $obj) { id } }`,
          {
            obj: {
              name, email,
              phone: phone || null,
              alternate_phone: alternatePhone,
              date_of_birth: dateOfBirth,
              gender, blood_group: bloodGroup, nationality,
              address_line1: addressLine1, address_line2: addressLine2,
              city, state, pincode, country,
              college, university,
              degree, branch, specialization,
              graduation_year: graduationYear, current_year: currentYear,
              cgpa, percentage,
              student_id: studentId, college_email: collegeEmail,
              college_city: collegeCity, college_state: collegeState,
              department_id: dept.id,
              start_date: startDate, end_date: endDate || null,
              status: finalStatus, work_mode: workMode,
              stipend, duration_months: durationMonths,
              offer_letter_date: offerLetterDate,
              joining_letter_date: joiningLetterDate,
              skills, languages_known: languagesKnown, tools,
              linkedin_url: linkedinUrl, github_url: githubUrl, portfolio_url: portfolioUrl,
              aadhar_number: aadharNumber, pan_number: panNumber,
              reference_name: referenceName, reference_contact: referenceContact,
              notes,
              user_id: userId,
            },
          },
        );

        // Generate password-setup token (7 days for bulk imports)
        const resetToken = jwt.sign(
          { sub: userId, email, purpose: 'password_reset' },
          JWT_SECRET,
          { expiresIn: '7d' },
        );
        const resetLink = `${APP_URL}/reset-password?token=${resetToken}`;

        const { sent, error: emailError } = await sendPasswordSetupEmail(name, email, resetLink);

        results.push({
          row: rowNum,
          status: 'success',
          name,
          email,
          emailSent: sent,
          resetLink, // always returned so admin can share manually
          message: sent ? undefined : `Email not sent: ${emailError}`,
        });
      } catch (err) {
        results.push({
          row: rowNum, status: 'error', name, email,
          message: err instanceof Error ? err.message : 'Database error',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount   = results.filter((r) => r.status === 'error').length;
    const skippedCount = results.filter((r) => r.status === 'skipped').length;

    return NextResponse.json({ results, successCount, errorCount, skippedCount, totalRows: dataRows.length });
  } catch (err) {
    console.error('[import]', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Import failed' },
      { status: 500 },
    );
  }
}
