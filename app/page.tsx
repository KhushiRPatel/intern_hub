import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  // Server-side redirect — no loading spinner, no hydration flash
  if (token) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
