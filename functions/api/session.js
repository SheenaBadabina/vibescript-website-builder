// POST /api/session  { token: string, expiresAt?: number }
// Sets HttpOnly cookie "vs_session" for server-side guard.

const COOKIE = "vs_session";
const MAX_AGE_FALLBACK = 60 * 60; // 1 hour

export async function onRequestPost({ request }) {
  try {
    const { token, expiresAt } = await request.json();
    if (!token || typeof token !== "string") {
      return json({ ok: false, error: "Missing token" }, 400);
    }
    const maxAge = clampMaxAge(expiresAt);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "Set-Cookie": cookieSet(COOKIE, token, maxAge)
      }
    });
  } catch {
    return json({ ok: false, error: "Bad request" }, 400);
  }
}

export async function onRequestDelete() {
  // Allow client to clear cookie explicitly if needed
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": cookieClear(COOKIE) }
  });
}

// --- helpers ---
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}
function cookieSet(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
function cookieClear(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
function clampMaxAge(expiresAt) {
  const now = Math.floor(Date.now() / 1000);
  const delta = (Number(expiresAt) || 0) - now;
  if (Number.isFinite(delta) && delta > 0 && delta < 60 * 60 * 24 * 7) return Math.floor(delta);
  return MAX_AGE_FALLBACK;
}
