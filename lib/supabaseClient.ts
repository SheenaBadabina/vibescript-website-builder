// lib/supabaseClient.ts
// Browser-side Supabase client for Next.js App Router on Cloudflare.
// Reads NEXT_PUBLIC_* envs (safe for the browser).

'use client';

import { createBrowserClient, type SupabaseClient } from '@supabase/ssr';

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  client = createBrowserClient(url, anon);
  return client;
}
