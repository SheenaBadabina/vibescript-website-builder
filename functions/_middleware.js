// /functions/_middleware.js
// Cloudflare Pages Functions middleware with safe logging

const TOKEN_KV_KEY = "ACCESS_TOKEN";
const AUTH_COOKIE = "vs_auth";
const AUTH_MAX_AGE = 60 * 60 * 6; // 6 hours
const PROTECTED_PATHS = ["/edit", "/save", "/api"]; // add more protected roots if needed

/** Utility: read cookie by name */
function getCookie(req, name) {
  const cookie = req.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Utility: set cookie header */
function setCookie(name, value, { maxAge = AUTH_MAX_AGE, path = "/", secure = true } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** Utility: delete cookie */
function deleteCookie(name) {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax; Secure`;
}

/** Render a minimal login page with optional error */
function loginPage({ showError = false } = {}) {
  const err = showError
    ? `<p style="color:#f88; margin-top:12px;">Invalid token. Try again.</p>`
    : "";
  return new Response(
    `<!doctype html>
<html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>VibeScript Builder – Login</title>
<style>
  body{background:#0b1320;color:#fff;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;display:grid;place-items:center;height:100vh}
  .card{background:#101a2f;border:1px solid #243056;border-radius:16px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,.35);width:min(420px,92vw)}
  h1{margin:0 0 12px;font-size:26px}
  label{display:block;margin:12px 0 6px;color:#aab8e6}
  input{width:100%;padding:12px 14px;border-radius:10px;border:1px solid #2b3b64;background:#0e1730;color:#fff;outline:none}
  button{margin-top:16px;width:100%;padding:12px 16px;border:0;border-radius:10px;background:#7c4dff;color:#fff;font-weight:600}
</style>
</head>
<body>
  <form class="card" method="POST" action="/login">
    <h1>🔒 VibeScript Builder</h1>
    <label for="token">Token</label>
    <input id="token" name="token" type="password" autocomplete="one-time-code" />
    <button type="submit">Continue</button>
    ${err}
  </form>
</body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

/** Middleware entry */
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Simple health/ping
  if (path === "/ping") {
    return new Response("ok", { status: 200 });
  }

  // Login handler (POST)
  if (path === "/login" && request.method === "POST") {
    try {
      const form = await request.formData();
      const userToken = (form.get("token") || "").trim();

      // Pull token from KV (do NOT log the actual value)
      const kvToken = ((await env.VIBESCRIPT_SETTINGS.get(TOKEN_KV_KEY)) || "").trim();

      // Safe logs
      console.log(
        JSON.stringify({
          where: "login",
          gotFormTokenLength: userToken.length,
          hasKvToken: kvToken.length > 0,
          kvKey: TOKEN_KV_KEY,
          bindingPresent: typeof env.VIBESCRIPT_SETTINGS !== "undefined",
        })
      );

      if (kvToken && userToken && userToken === kvToken) {
        const headers = new Headers({ Location: "/edit" });
        headers.append("Set-Cookie", setCookie(AUTH_COOKIE, "1"));
        return new Response(null, { status: 302, headers });
      }

      // Invalid
      const headers = new Headers({ Location: "/login?err=1" });
      return new Response(null, { status: 302, headers });
    } catch (err) {
      console.error("login_error", err?.message || err);
      return new Response("Login error", { status: 500 });
    }
  }

  // Login page (GET)
  if (path === "/login" && request.method === "GET") {
    return loginPage({ showError: url.searchParams.get("err") === "1" });
  }

  // Logout
  if (path === "/logout") {
    const headers = new Headers({ Location: "/login" });
    headers.append("Set-Cookie", deleteCookie(AUTH_COOKIE));
    return new Response(null, { status: 302, headers });
  }

  // Protect selected paths
  const needsAuth = PROTECTED_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  if (needsAuth) {
    const authed = getCookie(request, AUTH_COOKIE) === "1";

    // Extra guard: also allow direct token via query ?token=... (handy for first-time)
    const qsToken = (url.searchParams.get("token") || "").trim();
    if (!authed) {
      try {
        const kvToken = ((await env.VIBESCRIPT_SETTINGS.get(TOKEN_KV_KEY)) || "").trim();
        if (qsToken && kvToken && qsToken === kvToken) {
          const headers = new Headers({ Location: path }); // refresh same page without token in URL
          headers.append("Set-Cookie", setCookie(AUTH_COOKIE, "1"));
          return new Response(null, { status: 302, headers });
        }
      } catch (e) {
        console.error("auth_qs_check_error", e?.message || e);
      }
    }

    if (!authed) {
      const headers = new Headers({ Location: "/login" });
      return new Response(null, { status: 302, headers });
    }
  }

  // Continue to the requested asset/function
  return next();
}
