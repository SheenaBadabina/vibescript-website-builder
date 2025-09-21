// app/auth/debug/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function AuthDebug() {
  const supabase = getSupabaseBrowserClient();
  const [envOK, setEnvOK] = useState<'yes' | 'no'>('no');
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    setEnvOK(url && anon ? 'yes' : 'no');

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setMsg(error.message);
      setSession(data?.session ?? null);
      setUser(data?.session?.user ?? null);
    });
  }, [supabase]);

  async function testGoogle() {
    setMsg(null);
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${site}/auth/callback` },
    });
    if (error) setMsg(error.message);
  }

  return (
    <main className="min-h-dvh p-6 space-y-4">
      <h1 className="text-xl font-semibold">Auth Debug</h1>

      <div className="rounded-xl border border-white/10 p-4">
        <p>Env visible in browser: <b>{envOK}</b></p>
        <p className="text-xs text-white/60">
          URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing'} •
          ANON: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing'} •
          SITE: {process.env.NEXT_PUBLIC_SITE_URL ?? '(not set)'}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 p-4">
        <p>Session: {session ? 'present' : 'none'}</p>
        <p>User: {user ? user.email : '(none)'}</p>
      </div>

      <button
        onClick={testGoogle}
        className="rounded-xl border border-white/10 bg-white/5 p-3"
      >
        Test Google OAuth
      </button>

      {msg && <p className="text-red-400">{msg}</p>}
    </main>
  );
}
