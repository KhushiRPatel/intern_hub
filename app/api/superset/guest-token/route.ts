import { NextResponse } from 'next/server';

const SUPERSET_URL = process.env.SUPERSET_INTERNAL_URL ?? 'http://localhost:8088';
const SUPERSET_USER = process.env.SUPERSET_ADMIN_USERNAME ?? 'admin';
const SUPERSET_PASS = process.env.SUPERSET_ADMIN_PASSWORD ?? 'admin123';

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${SUPERSET_URL}/api/v1/security/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: SUPERSET_USER,
      password: SUPERSET_PASS,
      provider: 'db',
      refresh: true,
    }),
  });
  if (!res.ok) throw new Error(`Superset login failed: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { dashboardId?: string };
    const { dashboardId } = body;

    if (!dashboardId || typeof dashboardId !== 'string') {
      return NextResponse.json({ error: 'dashboardId is required' }, { status: 400 });
    }

    const accessToken = await getAccessToken();

    const guestRes = await fetch(`${SUPERSET_URL}/api/v1/security/guest_token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        resources: [{ type: 'dashboard', id: dashboardId }],
        rls: [],
        user: { username: 'guest', first_name: 'Guest', last_name: 'User' },
      }),
    });

    if (!guestRes.ok) {
      const errText = await guestRes.text();
      return NextResponse.json(
        { error: `Guest token request failed: ${errText}` },
        { status: 502 },
      );
    }

    const { token } = await guestRes.json() as { token: string };
    return NextResponse.json({ token });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
