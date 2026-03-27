import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

function getSMTPFrom() {
  return process.env.SMTP_FROM || 'InternMS <noreply@internms.com>';
}

export async function sendPasswordSetupEmail(
  name: string,
  email: string,
  resetLink: string,
): Promise<{ sent: boolean; error?: string }> {
  const transporter = getTransporter();

  if (!transporter) {
    console.log('\n[EMAIL] SMTP not configured — reset link logged below:');
    console.log(`  To:   ${email}`);
    console.log(`  Link: ${resetLink}\n`);
    return { sent: false, error: 'SMTP not configured' };
  }

  try {
    await transporter.sendMail({
      from: getSMTPFrom(),
      to: email,
      subject: 'Welcome to InternMS — Set Your Password',
      html: buildEmailHtml(name, resetLink),
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed';
    console.error('[email]', message);
    return { sent: false, error: message };
  }
}

function buildEmailHtml(name: string, resetLink: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to InternMS</title></head>
<body style="font-family:Inter,-apple-system,sans-serif;background:#f0effe;padding:40px 20px;margin:0;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(79,70,229,0.1);">

    <div style="background:linear-gradient(135deg,#3730a3,#4f46e5,#7c3aed);padding:40px;text-align:center;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:16px;margin-bottom:16px;font-size:32px;">👤</div>
      <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;letter-spacing:-0.5px;">Welcome to InternMS</h1>
      <p style="color:rgba(255,255,255,0.7);margin:0;font-size:15px;">Your intern account has been created</p>
    </div>

    <div style="padding:40px;">
      <p style="color:#1e1b4b;font-size:16px;margin:0 0 12px;">Hi <strong>${name}</strong>,</p>
      <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 28px;">
        An account has been created for you on <strong>InternMS</strong>. Click the button below to set your password and access your dashboard.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(79,70,229,0.35);">
          Set Your Password →
        </a>
      </div>

      <div style="background:#f5f3ff;border-radius:10px;padding:16px;margin:24px 0;">
        <p style="color:#6d6a8a;font-size:12px;margin:0 0 6px;">Or copy this link into your browser:</p>
        <p style="color:#4f46e5;font-size:12px;word-break:break-all;margin:0;font-family:monospace;">${resetLink}</p>
      </div>

      <p style="color:#9ca3af;font-size:13px;margin:0;border-top:1px solid #e5e7eb;padding-top:20px;">
        ⏰ This link expires in <strong>24 hours</strong>.<br>
        If you weren't expecting this, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}
