// functions/api/verify.js
// Confirms email by token, sets session cookie, redirects into /dashboard.

import { takeToken, getUser, putUser } from "../_utils/db.js";
import { sign, setCookieHeader } from "../_utils/session.js";

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!token) return html(400, page("Invalid link", `<p class="text-sm text-gray-300">Missing token.</p>`));

  const data = await takeToken(env, token);
  if (!data || !data.email) {
    return html(400, page("Invalid or expired", `<p class="text-sm text-gray-300">The confirmation link is invalid or expired. <a class="underline" href="/resend">Request a new one</a>.</p>`));
  }

  const user = await getUser(env, data.email);
  if (!user) {
    return html(400, page("Account not found", `<p class="text-sm text-gray-300">Please sign up again.</p><a class="btn" href="/signup">Create account</a>`));
  }

  user.verified = true;
  await putUser(env, user);

  const tokenSession = await sign(env, {
    email: user.email,
    admin: !!user.admin,
    tier: user.tier || "free",
    iat: Date.now(),
  });
  const headers = new Headers({ "Set-Cookie": setCookieHeader(tokenSession) });
  headers.set("Location", "/dashboard");
  return new Response(null, { status: 302, headers });
}

// helpers
function html(status, content) { return new Response(content, { status, headers:{ "content-type":"text/html; charset=UTF-8" } }); }
function page(title, inner){ return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title} — VibeScript</title><link rel="stylesheet" href="/styles.css"/></head><body class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black"><div class="w-full max-w-md p-6 rounded-2xl bg-black/30 border border-white/10 shadow-xl backdrop-blur">${inner}</div><script src="/scripts/footer-loader.js"></script></body></html>`; }
