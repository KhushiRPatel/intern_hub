import { NextResponse } from 'next/server';
import { sendPasswordSetupEmail } from '@/lib/email';

export async function GET() {
  const result = await sendPasswordSetupEmail(
    'Test User',
    process.env.SMTP_USER || '',
    'http://localhost:3000/reset-password?token=test-token-123',
  );
  return NextResponse.json(result);
}
