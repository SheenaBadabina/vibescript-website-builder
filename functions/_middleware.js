/**
 * Cloudflare Pages Functions middleware
 * - Protects /edit (and any other protected routes) with a token.
 * - Token is stored in KV: env.VIBESCRIPT_SETTINGS with key "ACCESS_TOKEN".
 * - Accepts token via cookie `vs_token`, query ?token=, header `x-access-token`,
 *   or a POST form to /auth (field name "token").
 * - /logout clears the cookie.
 */

/** @type {PagesFunction<{ VIBESCRIPT_SETTINGS: KVNamespace }>} */
export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);

  // 1) Fetch the expected token from KV
  const expected = (await env.VIBESCRIPT_SETTINGS.get("ACCESS_TOKEN")) || "";
  // If no token configured in KV, fail closed (every token will be invalid)
  const hasConfiguredToken = expected.length > 0;

  // 2) Helper: read incoming token from various places
  const incomingFromCookie = getCookie(request.headers.get("Cookie") || "", "vs_token");
  const incomingFromQuery  = url.searchParams.get("token") || "";
  const incomingFromHeader = request.headers.get("x-access-token") || "";
  let incoming = incomingFromCookie || incomingFromQuery || incomingFromHeader || "";

  // 3) Handle POST /auth (form submit with { token })
  if (url.pathname === "/auth" && request.method.toUpperCase() === "POST") {
    const form = await readForm(request);
    const typed = (form.get("token") || "").toString().trim();
    const ok = hasConfiguredToken && timingSafeEqual(typed, expected);

    if (!ok) {
      return json({ ok: false, error: "invalid_token" }, 401);
    }

    // Set cookie then redirect back to /edit
    const headers = new Headers({
      "Set-Cookie": buildCookie("vs_token", typed, { maxAge: 60 * 60 * 24 * 30 }), // 30 days
      "Location": "/edit"
    });
    return new Response(null, { status: 302, headers });
  }

  // 4) Handle /logout
  if (url.pathname === "/logout") {
    const headers = new Headers({
      "Set-Cookie": buildCookie("vs_token", "", { maxAge: 0 }),
      "Location": "/"
    });
    return new Response(null, { status: 302, headers });
  }

  // 5) Define protected paths
  const PROTECTED = ["/edit", "/projects", "/api/secure"];
  const needsAuth = PROTECTED.some(p =>
    url.pathname === p || url.pathname.startsWith(p + "/")
  );

  if (!needsAuth) {
    // Public routes pass through
    return next();
  }

  // 6) If token is in query, promote it to cookie
  if (incomingFromQuery) {
    const headers = new Headers({
      "Set-Cookie": buildCookie("vs_token", incomingFromQuery, { maxAge: 60 * 60 * 24 * 30 }),
      "Location": url.pathname // clean the URL
    });
    return new Response(null, { status: 302, headers });
  }

  // 7) Validate token
  const valid = hasConfiguredToken && incoming && timingSafeEqual(incoming, expected);

  if (!valid) {
    // Show minimal HTML login (works even if the UI page isn’t loaded)
    return htmlLogin(401);
  }

  // 8) All good
  return next();
};

/* ----------------- helpers ----------------- */

function getCookie(header, name) {
  const cookies = (header || "").split(/;\s*/);
  for (const c of cookies) {
    const idx = c.indexOf("=");
    if (idx === -1) continue;
    const k = c.slice(0, idx).trim();
    const v = c.slice(idx + 1).trim();
    if (k === name) return decodeURIComponent(v);
  }
  return "";
}

function buildCookie(name, value, { maxAge = 0 }) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax",
    "Secure" // Pages is HTTPS
  ];
  if (maxAge >= 0) parts.push(`Max-Age=${maxAge}`);
  return parts.join("; ");
}

async function readForm(request) {
  const ct = request.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => fd.set(k, String(v)));
    return fd;
  }
  // handles form-urlencoded & multipart
  return request.formData();
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function htmlLogin(status = 401) {
  const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>VibeScript Builder – Sign in</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1220;color:#e6e6f0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial}
  .card{background:#0f172a;border:1px solid #24324a;border-radius:16px;padding:28px;max-width:480px;width:92%}
  h1{font-size:28px;margin:0 0 12px}
  p{opacity:.9;margin:0 0 16px}
  input,button{font-size:16px}
  input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid #334155;background:#0b1220;color:#e6e6f0;outline:none}
  button{margin-top:12px;width:100%;padding:12px;border-radius:10px;border:0;background:#7c3aed;color:white;font-weight:600}
  .err{color:#fda4af;margin-top:8px}
</style>
<div class="card">
  <h1>🔒 VibeScript Builder</h1>
  <p>Enter your access token to continue.</p>
  <form method="post" action="/auth">
    <input name="token" type="password" placeholder="token" autocomplete="one-time-code" required />
    <button type="submit">Continue</button>
  </form>
  <div class="err">${status === 401 ? "Invalid or missing token." : ""}</div>
</div>
</html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8" } });
}

/**
 * Constant-time string compare to avoid timing side-channels.
 * Treats empty strings as non-matches.
 */
function timingSafeEqual(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}
