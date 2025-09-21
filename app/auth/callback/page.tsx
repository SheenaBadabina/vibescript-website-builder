// app/auth/callback/page.tsx
// Supabase OAuth returns here, then we bounce to /dashboard (or home).

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Supabase stores tokens in local storage; once the page loads, redirect.
    router.replace('/dashboard');
  }, [router]);

  return null;
}
