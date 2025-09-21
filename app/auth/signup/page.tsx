// app/auth/signup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';

export default function SignUpPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password: pw });
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    router.push('/dashboard');
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white/5 p-6 backdrop-blur">
        <h1 className="text-xl font-semibold mb-4">Create account</h1>

        <form onSubmit={signUp} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-white/10 bg-black/20 p-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-white/10 bg-black/20 p-3"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            autoComplete="new-password"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-teal-500 p-3 font-medium disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        {msg && <p className="mt-4 text-sm text-red-400">{msg}</p>}

        <p className="mt-6 text-sm text-white/60">
          Already have an account?{' '}
          <a href="/auth/signin" className="text-teal-300 underline">Sign in</a>
        </p>
      </div>
    </main>
  );
          }
