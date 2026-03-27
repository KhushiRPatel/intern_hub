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

type Department = { id: string; name: string };

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

    // Filter out instruction/note rows (rows where first cell starts with "ℹ" or "•")
    const dataRows = rawRows.filter((row) => {
      const first = String(Object.values(row)[0] ?? '').trim();
      return first !== '' && !first.startsWith('ℹ') && !first.startsWith('•') && !first.startsWith('---');
    });

    if (IS_DEMO) {
      // Demo mode: just parse and return rows for client-side demoStore insertion
      const parsed = dataRows.map((raw, i) => {
        const row: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) row[normKey(k)] = String(v).trim();

        const name = row['name'] || '';
        const email = (row['email'] || '').toLowerCase();
        const phone = row['phone'] || '';
        const college = row['college'] || '';
        const deptName = row['department'] || row['department_name'] || '';
        const startDate = parseExcelDate(raw['Start Date'] ?? raw['start_date'] ?? raw['start date'] ?? '');
        const endDate = parseExcelDate(raw['End Date'] ?? raw['end_date'] ?? raw['end date'] ?? '');
        const status = (row['status'] || 'active').toLowerCase();

        return {
          row: i + 2,
          name, email, phone, college,
          deptName, startDate, endDate,
          status: ['active', 'completed', 'terminated'].includes(status) ? status : 'active',
        };
      });

      return NextResponse.json({ demo: true, rows: parsed });
    }

    // Production: create interns in DB
    const results: RowResult[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const raw = dataRows[i];
      const rowNum = i + 2;

      const row: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) row[normKey(k)] = String(v).trim();

      const name = row['name'] || '';
      const email = (row['email'] || '').toLowerCase();
      const phone = row['phone'] || '';
      const college = row['college'] || '';
      const deptName = row['department'] || row['department_name'] || '';
      const startDate = parseExcelDate(raw['Start Date'] ?? raw['start_date'] ?? raw['start date'] ?? '');
      const endDate = parseExcelDate(raw['End Date'] ?? raw['end_date'] ?? raw['end date'] ?? '') ?? undefined;
      const status = (row['status'] || 'active').toLowerCase();
      const finalStatus = ['active', 'completed', 'terminated'].includes(status) ? status : 'active';

      if (!name || !email || !college) {
        results.push({ row: rowNum, status: 'error', name, email, message: 'Missing required fields: Name, Email, College' });
        continue;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ row: rowNum, status: 'error', name, email, message: 'Invalid email address' });
        continue;
      }

      const dept = departments.find((d) => d.name.toLowerCase() === deptName.toLowerCase());
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
          `query CheckEmail($email: String!) { users(where: { email: { _eq: $email } }, limit: 1) { id } }`,
          { email },
        );
        if (existing.users.length > 0) {
          results.push({ row: rowNum, status: 'skipped', name, email, message: 'Email already exists' });
          continue;
        }

        // Create user
        const tempPass = `${crypto.randomUUID()}-${Date.now()}`;
        const passwordHash = await bcrypt.hash(tempPass, 10);

        type InsertUser = { insert_users_one: { id: string } };
        const { insert_users_one } = await hasura<InsertUser>(
          `mutation CreateUser($obj: users_insert_input!) { insert_users_one(object: $obj) { id } }`,
          { obj: { name, email, password_hash: passwordHash, role: 'intern', department_id: dept.id } },
        );
        const userId = insert_users_one.id;

        // Create intern
        await hasura(
          `mutation CreateIntern($obj: interns_insert_input!) { insert_interns_one(object: $obj) { id } }`,
          {
            obj: {
              name, email,
              phone: phone || null,
              college,
              department_id: dept.id,
              start_date: startDate,
              end_date: endDate || null,
              status: finalStatus,
              user_id: userId,
            },
          },
        );

        // Generate reset token (7 days for bulk imports)
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
          // Always include resetLink so admin can share it if email isn't configured
          resetLink,
          message: sent ? undefined : `Email not sent: ${emailError}`,
        });
      } catch (err) {
        results.push({
          row: rowNum,
          status: 'error',
          name,
          email,
          message: err instanceof Error ? err.message : 'Database error',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;
    const errorCount = results.filter((r) => r.status === 'error').length;
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
