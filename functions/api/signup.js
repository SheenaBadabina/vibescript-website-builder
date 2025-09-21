// functions/api/signup.js
// Enforces confirm-password (server-side), sets session, redirects to /dashboard.
// Admin is auto-detected by email (admin@vibescript.online).

import { sign, setCookieHeader } from "../_utils/session.js";

const ADMIN_EMAIL = "admin@vibescript.online";

export async function onRequestPost({ request, env }) {
  const contentType = request.headers.get("content-type") || "";
  let email = "", password = "", confirm = "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    email = (body.email || "").trim().toLowerCase();
    password = body.password || "";
    confirm = body.confirm || "";
  } else {
    const form = await request.formData();
    email = String(form.get("email") || "").trim().toLowerCase();
    password = String(form.get("password") || "");
    confirm = String(form.get("confirm") || "");
  }

  if (!email || !password || !confirm) {
    return badRequest("Missing required fields. Please try again.");
  }
  if (password !== confirm) {
    return badRequest("Passwords don’t match. Please go back and try again.");
  }

  // Minimal demo: we don't store users yet; session unlocks access.
  const admin = email === ADMIN_EMAIL;
  const tier = admin ? "studio" : "free";

  const token = await sign(env, { email, admin, tier, iat: Date.now() });
  const headers = new Headers({ "Set-Cookie": setCookieHeader(token) });
  headers.set("Location", "/dashboard");
  return new Response(null, { status: 302, headers });
}

export function onRequestGet() {
  return new Response("Use POST", { status: 405 });
}

function badRequest(message) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Sign up error</title><link rel="stylesheet" href="/styles.css"/></head>
  <body class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black">
    <div class="w-full max-w-md p-6 rounded-2xl bg-black/30 border border-white/10 shadow-xl backdrop-blur">
      <h1 class="text-xl font-bold text-white mb-2">Sign up error</h1>
      <p class="text-sm text-gray-300 mb-4">${escapeHtml(message)}</p>
      <div class="flex gap-2">
        <a href="/signup" class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Back to sign up</a>
        <a href="/signin" class="rounded-lg bg-gradient-to-r from-pink-500 via-yellow-400 to-teal-400 px-4 py-2 text-sm font-semibold text-black">Go to sign in</a>
      </div>
    </div>
    <script src="/scripts/footer-loader.js"></script>
  </body></html>`;
  return new Response(html, { status: 400, headers: { "content-type": "text/html; charset=UTF-8" }});
}

function escapeHtml(s="") {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
