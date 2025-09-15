// functions/_middleware.js
// Robust token gate for VibeScript Builder on Cloudflare Pages Functions

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const isEdit = url.pathname === "/" || url.pathname === "/edit" || url.pathname.startsWith("/edit/");
  const debug = url.searchParams.get("debug") === "1";

  // Allow static/assets and health checks through
  const allowlisted =
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/favicon") ||
    url.pathname.startsWith("/ping") ||
    url.pathname === "/healthz";

  if (!isEdit || allowlisted) {
    return next();
  }

  // 1) Read token from form body OR query OR header
  let provided = await readTokenFromRequest(request);

  // 2) Normalize (remove invisible/accidental chars)
  const normalized = normalizeToken(provided);

  // 3) Load expected token from KV
  //    KV binding name MUST be: VIBESCRIPT_SETTINGS
  //    Key MUST be: ACCESS_TOKEN
  let expected = "";
  try {
    expected = await env.VIBESCRIPT_SETTINGS.get("ACCESS_TOKEN");
  } catch (e) {
    if (debug) console.log("auth debug: KV get error:", e?.message || e);
  }

  // 4) Normalize expected as well (defensive)
  const normalizedExpected = normalizeToken(expected || "");

  // 5) Logging (safe): show short hashes only
  if (debug) {
    console.log(
      "auth debug:",
      JSON.stringify({
        path: url.pathname,
        hasProvided: Boolean(provided),
        providedHash: shortHash(normalized),
        expectedPresent: Boolean(normalizedExpected),
        expectedHash: shortHash(normalizedExpected),
      })
    );
  }

  // 6) If there is no expected token set, let owner in (optional: block instead)
  if (!normalizedExpected) {
    // No token in KV yet—show form so owner can set it, but don’t hard-block
    return tokenFormResponse(url, false);
  }

  // 7) Compare
  const ok = timingSafeEqual(normalized, normalizedExpected);

  if (ok) {
    // Pass through to the app
    return next();
  }

  // 8) If POSTed but wrong, redisplay with error
  const tried =
    request.method === "POST" ||
    url.searchParams.has("token") ||
    request.headers.get("x-access-token");

  return tokenFormResponse(url, tried);
}

/* ---------------- helpers ---------------- */

async function readTokenFromRequest(request) {
  const url = new URL(request.url);

  // a) Header
  const h = request.headers.get("x-access-token");
  if (h) return h;

  // b) Query
  const q = url.searchParams.get("token");
  if (q) return q;

  // c) Form body (from /edit form)
  if (request.method === "POST") {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/x-www-form-urlencoded")) {
      const body = await request.clone().formData().catch(() => null);
      if (body && body.get("token")) {
        return body.get("token");
      }
    } else if (ct.includes("application/json")) {
      const data = await request.clone().json().catch(() => null);
      if (data?.token) return data.token;
    }
  }

  return "";
}

function normalizeToken(s) {
  if (!s) return "";
  // trim spaces, newlines, carriage returns
  let t = String(s).trim();
  // strip common invisible characters
  t = t
    .replace(/\u200B/g, "") // zero width space
    .replace(/\u200C/g, "") // zero width non-joiner
    .replace(/\u200D/g, "") // zero width joiner
    .replace(/\uFEFF/g, "") // BOM
    .replace(/\u00A0/g, " ") // nbsp
    .trim();
  return t;
}

function shortHash(s) {
  // NOT cryptographic—just to correlate values in logs safely
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

function timingSafeEqual(a, b) {
  // constant-time comparison
  const aLen = a.length;
  const bLen = b.length;
  const len = Math.max(aLen, bLen);
  let out = 0;
  for (let i = 0; i < len; i++) {
    const ac = i < aLen ? a.charCodeAt(i) : 0;
    const bc = i < bLen ? b.charCodeAt(i) : 0;
    out |= ac ^ bc;
  }
  return out === 0 && aLen === bLen;
}

function tokenFormResponse(url, invalid) {
  const err = invalid ? `<p style="color:#ef4444;margin-top:12px">Invalid token. Try again.</p>` : "";
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>VibeScript Builder</title>
  <style>
    html,body{height:100%;margin:0;background:#0b1220;color:#e5e7eb;font-family:system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif;}
    .card{max-width:560px;margin:7vh auto;padding:28px 24px;background:#0f172a;border:1px solid #23314e;border-radius:14px;box-shadow:0 10px 25px rgba(0,0,0,.35)}
    h1{margin:0 0 12px;font-size:28px}
    label{display:block;margin:18px 0 8px;color:#9fb0d8}
    input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid #2c3e66;background:#0b1220;color:#e5e7eb;font-size:16px}
    button{margin-top:14px;background:#7c3aed;color:white;border:none;border-radius:10px;padding:12px 16px;font-size:16px;cursor:pointer}
    button:active{transform:translateY(1px)}
  </style>
</head>
<body>
  <div class="card">
    <h1>🔒 VibeScript Builder</h1>
    <form method="POST" action="${url.pathname}">
      <label for="token">Token</label>
      <input id="token" name="token" type="password" autocomplete="one-time-code" inputmode="text" />
      <button type="submit">Continue</button>
      ${err}
    </form>
  </div>
</body>
</html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" }, status: invalid ? 401 : 200 });
}
