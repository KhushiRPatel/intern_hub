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
    console.log('\n[EMAIL] SMTP not configured — password setup link:');
    console.log(`  To:   ${email}`);
    console.log(`  Link: ${resetLink}`);
    console.log('  → Add SMTP_HOST / SMTP_USER / SMTP_PASS to .env.local to enable real emails.\n');
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
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Welcome to InternMS</title>
</head>

<body style="margin:0;padding:0;background:#f6f7fb;font-family:Inter,Segoe UI,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 15px;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table width="100%" max-width="520px" cellpadding="0" cellspacing="0"
          style="background:#ffffff;border-radius:18px;overflow:hidden;
          box-shadow:0 10px 30px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td align="center"
              style="background:linear-gradient(135deg,#4f46e5,#7c3aed);
              padding:40px 20px;color:#ffffff;">

              <div style="font-size:40px;margin-bottom:10px;">🚀</div>

              <h1 style="margin:0;font-size:24px;font-weight:800;">
                Welcome to InternMS
              </h1>

              <p style="margin-top:8px;font-size:14px;opacity:0.85;">
                Your journey starts here
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:35px 30px;">

              <p style="margin:0 0 10px;font-size:16px;color:#111827;">
                Hi <strong>${name}</strong>,
              </p>

              <p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:1.6;">
                Your InternMS account has been successfully created.
                Click the button below to set your password and access your dashboard.
              </p>

              <!-- CTA Button -->
              <div style="text-align:center;margin:30px 0;">
                <a href="${resetLink}"
                  style="display:inline-block;
                  background:linear-gradient(135deg,#4f46e5,#7c3aed);
                  color:#ffffff;
                  padding:14px 32px;
                  font-size:15px;
                  font-weight:600;
                  border-radius:10px;
                  text-decoration:none;
                  box-shadow:0 6px 18px rgba(79,70,229,0.3);">
                  Set Your Password →
                </a>
              </div>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:25px 0;" />

              <!-- Info -->
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                ⏳ This link will expire in <strong>24 hours</strong>.<br/>
                If you didn’t request this, you can safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center"
              style="padding:20px;background:#f9fafb;font-size:12px;color:#9ca3af;">
              
              © ${new Date().getFullYear()} InternMS <br/>
              Built for smarter internship management

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;
}