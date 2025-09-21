// functions/api/signin.js
// Enforces "verified email" before issuing a session cookie.
// If unverified (or user not found), shows a confirm/resend UI instead of redirecting.

import { getUser } from "../_utils/db.js";
import { sign, setCookieHeader } from "../_utils/session.js";

export async function onRequestPost({ request, env }) {
  const ct = request.headers.get("content-type") || "";
  let email = "", password = "";
  if (ct.includes("application/json")) {
    const body = await request.json().catch(()=>({}));
    email = String(body.email || "").trim().toLowerCase();
    password = String(body.password || "");
  } else {
    const form = await request.formData();
    email = String(form.get("email") || "").trim().toLowerCase();
    password = String(form.get("password") || "");
  }

  if (!email || !password) return html(400, errorPage("Missing credentials."));

  const user = await getUser(env, email);

  // If account is missing OR unverified, show the same "confirm email" UI
  // to avoid leaking account existence and to give a one-click resend path.
  if (!user || !user.verified) {
    return html(200, verifyNeeded(email));
  }

  if (user.password !== password) {
    return html(400, errorPage("Incorrect password."));
  }

  // Verified: issue session and go to dashboard
  const token = await sign(env, {
    email: user.email,
    admin: !!user.admin,
    tier: user.tier || "free",
    iat: Date.now(),
  });
  const headers = new Headers({ "Set-Cookie": setCookieHeader(token) });
  headers.set("Location", "/dashboard");
  return new Response(null, { status: 302, headers });
}

export function onRequestGet() {
  return html(405, page("Sign in", "<p class='text-sm text-gray-300'>Use POST.</p>"));
}

// helpers
function html(status, content){ return new Response(content,{status,headers:{ "content-type":"text/html; charset=UTF-8"}}); }
function page(title, inner){ return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title} — VibeScript</title><link rel="stylesheet" href="/styles.css"/></head><body class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black"><div class="w-full max-w-md p-6 rounded-2xl bg-black/30 border border-white/10 shadow-xl backdrop-blur">${inner}</div><script src="/scripts/footer-loader.js"></script></body></html>`; }
function errorPage(msg){
  return page("Sign in error", `
    <h1 class="text-xl font-bold text-white mb-2">Sign in error</h1>
    <p class="text-sm text-gray-300 mb-4">${escapeHtml(msg)}</p>
    <div class="flex gap-2">
      <a href="/signin" class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Try again</a>
      <a href="/signup" class="rounded-lg bg-gradient-to-r from-pink-500 via-yellow-400 to-teal-400 px-4 py-2 text-sm font-semibold text-black">Create account</a>
    </div>
  `);
}
function verifyNeeded(email){
  // Unified page for "not found" and "unverified": lets user resend without leaking existence.
  return page("Confirm your email", `
    <h1 class="text-xl font-bold text-white mb-2">Confirm your email</h1>
    <p class="text-sm text-gray-300 mb-4">
      We still need to verify <span class="font-semibold">${escapeHtml(email)}</span>.
      We can send a fresh link.
    </p>
    <form method="POST" action="/api/resend-confirmation" class="space-y-3">
      <input type="hidden" name="email" value="${escapeHtml(email)}"/>
      <button type="submit" class="rounded-lg bg-gradient-to-r from-pink-500 via-yellow-400 to-teal-400 px-4 py-2 text-sm font-semibold text-black">Resend confirmation</button>
      <a href="/signin" class="ml-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Back</a>
    </form>
    <p class="mt-3 text-xs text-gray-400">Did you enter the wrong address? <a class="underline underline-offset-2" href="/signup">Create a new account</a>.</p>
  `);
}
function escapeHtml(s=""){ return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
