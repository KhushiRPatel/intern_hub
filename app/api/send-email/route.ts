import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { sendPasswordSetupEmail } from '@/lib/email';

const JWT_SECRET = process.env.JWT_SECRET || 'intern-mgmt-jwt-secret-change-in-prod';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json() as { name: string; email: string };

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
    }

    const token = jwt.sign(
      { sub: email, email, purpose: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '7d' },
    );
    const resetLink = `${APP_URL}/reset-password?token=${token}`;

    const result = await sendPasswordSetupEmail(name, email, resetLink);
    return NextResponse.json({ ...result, resetLink });
  } catch (err) {
    return NextResponse.json(
      { sent: false, error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 },
    );
  }
}
