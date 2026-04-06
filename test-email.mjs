/**
 * Manual email test — run with:
 *   node test-email.mjs
 *
 * Set these env vars first (or paste values directly below for a one-off test):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, SMTP_FROM
 */

import nodemailer from 'nodemailer';

// ── Config (reads from env or use hardcoded values for testing) ──────────────
const SMTP_HOST   = process.env.SMTP_HOST   || '';
const SMTP_PORT   = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER   = process.env.SMTP_USER   || '';
const SMTP_PASS   = process.env.SMTP_PASS   || '';
const SMTP_FROM   = process.env.SMTP_FROM   || 'InternArk <noreply@internark.com>';
const TEST_TO     = process.env.TEST_TO     || SMTP_USER; // send to yourself by default

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error('\n❌  SMTP not configured.');
  console.error('    Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars and re-run.\n');
  process.exit(1);
}

// ── Build the same HTML as lib/email.ts ──────────────────────────────────────
const name      = 'Harshil Kachhadiya';
const resetLink = 'http://localhost:3000/reset-password?token=TEST_TOKEN_123';
const year      = new Date().getFullYear();

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to InternArk</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Sora:wght@700;800&display=swap" rel="stylesheet"/>
</head>
<body style="margin:0;padding:0;background:#EAECF2;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:540px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(18,22,40,0.13);" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="background:#131929;padding:44px 40px 36px;">
            <table cellpadding="0" cellspacing="0" style="margin-bottom:26px;">
              <tr><td><span style="font-family:'Sora',Arial,sans-serif;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:0.01em;">INTERN<span style="color:#94a3b8;">ARK</span></span></td></tr>
            </table>
            <div style="display:inline-block;background:rgba(34,211,138,0.12);border:1px solid rgba(34,211,138,0.25);color:#34d399;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;padding:5px 14px;border-radius:100px;margin-bottom:22px;">● &nbsp;Account Created</div>
            <h1 style="font-family:'Sora',Arial,sans-serif;font-size:26px;font-weight:800;color:#ffffff;line-height:1.25;margin:0 0 10px;">Welcome aboard,<br/>let's get you in. 🎉</h1>
            <p style="font-size:13.5px;color:#7c8fa8;line-height:1.65;margin:0;">Your InternArk account is ready. One step left —<br/>set your password to unlock your dashboard.</p>
          </td>
        </tr>
        <tr><td style="height:1px;background:linear-gradient(90deg,#131929,rgba(34,211,138,0.5),#131929);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="font-size:16px;color:#131929;font-weight:500;margin:0 0 12px;">Hi <strong style="color:#0f172a;font-weight:700;">${name}</strong>,</p>
            <p style="font-size:14.5px;color:#52627a;line-height:1.75;margin:0 0 28px;">You've been added to <strong style="color:#131929;">InternArk</strong> as an intern. Your profile is live and your mentor is waiting. Here's what happens next:</p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e8ecf3;border-radius:12px;margin-bottom:10px;"><tr><td style="padding:14px 16px;"><table cellpadding="0" cellspacing="0"><tr><td style="vertical-align:top;padding-right:14px;"><div style="width:30px;height:30px;border-radius:8px;background:#131929;text-align:center;line-height:30px;font-size:12px;font-weight:700;color:#34d399;">01</div></td><td style="vertical-align:middle;"><p style="font-size:13.5px;color:#374151;font-weight:500;margin:0;">Set your password</p><p style="font-size:12px;color:#8892a4;margin:2px 0 0;">Click the button below to create your secure password</p></td></tr></table></td></tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e8ecf3;border-radius:12px;margin-bottom:10px;"><tr><td style="padding:14px 16px;"><table cellpadding="0" cellspacing="0"><tr><td style="vertical-align:top;padding-right:14px;"><div style="width:30px;height:30px;border-radius:8px;background:#131929;text-align:center;line-height:30px;font-size:12px;font-weight:700;color:#34d399;">02</div></td><td style="vertical-align:middle;"><p style="font-size:13.5px;color:#374151;font-weight:500;margin:0;">Complete your profile</p><p style="font-size:12px;color:#8892a4;margin:2px 0 0;">Add your college details, skills and photo</p></td></tr></table></td></tr></table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #e8ecf3;border-radius:12px;margin-bottom:30px;"><tr><td style="padding:14px 16px;"><table cellpadding="0" cellspacing="0"><tr><td style="vertical-align:top;padding-right:14px;"><div style="width:30px;height:30px;border-radius:8px;background:#131929;text-align:center;line-height:30px;font-size:12px;font-weight:700;color:#34d399;">03</div></td><td style="vertical-align:middle;"><p style="font-size:13.5px;color:#374151;font-weight:500;margin:0;">Start your internship</p><p style="font-size:12px;color:#8892a4;margin:2px 0 0;">View tasks, track progress and connect with your team</p></td></tr></table></td></tr></table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr><td align="center">
              <a href="${resetLink}" style="display:inline-block;background:#131929;color:#ffffff;font-family:'DM Sans',Arial,sans-serif;font-size:14.5px;font-weight:600;padding:15px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.01em;">Set Your Password &nbsp;<span style="color:#34d399;">→</span></a>
            </td></tr></table>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf7;border:1px solid #bbf7d0;border-radius:12px;margin-bottom:24px;"><tr><td style="padding:16px 18px;"><table cellpadding="0" cellspacing="0"><tr><td style="vertical-align:top;padding-right:10px;font-size:16px;">ℹ️</td><td><p style="font-size:12.5px;color:#166534;line-height:1.65;margin:0;"><strong style="color:#14532d;">This link expires in 24 hours.</strong> If you didn't expect this email, you can safely ignore it — your account won't be activated without a password.</p></td></tr></table></td></tr></table>

            <p style="font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;margin:20px 0 0;">Questions? Reply to this email or reach out to your internship coordinator.<br/><span style="color:#cbd5e1;">internark.com &nbsp;·&nbsp; support@internark.com</span></p>
          </td>
        </tr>
        <tr>
          <td align="center" style="background:#f7f9fc;border-top:1px solid #eef0f6;padding:24px 40px;">
            <table cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr><td><span style="font-family:'Sora',Arial,sans-serif;font-size:13px;font-weight:800;color:#131929;letter-spacing:0.01em;">INTERN<span style="color:#94a3b8;">ARK</span></span></td></tr></table>
            <p style="font-size:11.5px;color:#94a3b8;line-height:1.7;margin:0;">© ${year} InternArk &nbsp;·&nbsp; Built for smarter internship management<br/><a href="#" style="color:#64748b;text-decoration:none;">Unsubscribe</a>&nbsp;·&nbsp;<a href="#" style="color:#64748b;text-decoration:none;">Privacy Policy</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
`;

// ── Send ──────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

console.log(`\n📧  Sending test email to: ${TEST_TO}`);
console.log(`    SMTP: ${SMTP_HOST}:${SMTP_PORT} (secure=${SMTP_SECURE})\n`);

try {
  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to: TEST_TO,
    subject: '✅ [TEST] Welcome to InternArk — Set Your Password',
    html,
  });
  console.log('✅  Email sent successfully!');
  console.log('    Message ID:', info.messageId);
  if (info.response) console.log('    Response:', info.response);
} catch (err) {
  console.error('❌  Failed to send email:');
  console.error('   ', err.message);
  process.exit(1);
}
