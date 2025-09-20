// GET /api/public-env -> { url, anon }
// Safe to expose anon key; it's designed for client use.

export async function onRequestGet({ env }) {
  const body = {
    url: env.VITE_SUPABASE_URL || env.SUPABASE_URL || "",
    anon: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ""
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
