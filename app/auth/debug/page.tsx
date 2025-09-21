// app/auth/debug/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

type Line = { label: string; value: string };

export default function AuthDebug() {
  const supabase = getSupabaseBrowserClient();

  const [lines, setLines] = useState<Line[]>([]);
  const [status, setStatus] = useState<'checking'|'ok'|'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const base: Line[] = [
      { label: 'NEXT_PUBLIC_SUPABASE_URL', value: url ? 'set' : 'MISSING' },
      { label: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: anon ? 'set' : 'MISSING' },
      { label: 'NEXT_PUBLIC_SITE_URL', value: site || '(empty)' },
    ];
    setLines(base);

    // Immediately try a harmless API call + session check and surface the exact error text.
    (async () => {
      try {
        // 1) lightweight call to prove network + CORS
        const resp = await fetch(`${url}/auth/v1/settings`, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` }
        });
        if (!resp.ok) {
          const t = await resp.text().catch(()=>'');
          throw new Error(`GET /auth/v1/settings -> ${resp.status} ${resp.statusText} ${t}`.trim());
        }

        // 2) can we read session?
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        setLines(prev => [
          ...prev,
          { label: 'settings', value: 'ok' },
          { label: 'session', value: data.session ? 'present' : 'none' },
        ]);
        setStatus('ok');
      } catch (e: any) {
        setStatus('error');
        setError(String(e?.message || e));
      }
    })();
  }, [supabase]);

  async function testGoogle() {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${site}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="min-h-dvh p-6 space-y-4">
      <h1 className="text-xl font-semibold">Auth Debug</h1>

      <div className="rounded-xl border border-white/10 p-4 space-y-1">
        {lines.map((l) => (
          <div key={l.label} className="text-sm">
            <b>{l.label}:</b> {l.value}
          </div>
        ))}
        <div className="text-sm"><b>status:</b> {status}</div>
        {error && <div className="text-sm text-red-400 break-all"><b>error:</b> {error}</div>}
      </div>

      <button
        onClick={testGoogle}
        className="rounded-xl border border-white/10 bg-white/5 p-3"
      >
        Test Google OAuth
      </button>
    </main>
  );
}
