// functions/api/signup.js
// Create "unverified" user, send verification email via Resend.
// On success, show "check your email" page.

import { sendEmail } from "../_utils/email.js";
import { newToken, getUser, putUser, putToken } from "../_utils/db.js";

const ADMIN_EMAIL = "admin@vibescript.online";

export async function onRequestPost({ request, env }) {
  const ct = request.headers.get("content-type") || "";
  let email = "", password = "", confirm = "";
  if (ct.includes("application/json")) {
    const body = await request.json().catch(()=>({}));
    email = String(body.email || "").trim().toLowerCase();
    password = String(body.password || "");
    confirm = String(body.confirm || "");
  } else {
    const form = await request.formData();
    email = String(form.get("email") || "").trim().toLowerCase();
    password = String(form.get("password") || "");
    confirm = String(form.get("confirm") || "");
  }

  if (!email || !password || !confirm) return html(400, errorPage("Missing required fields."));
  if (password !== confirm) return html(400, errorPage("Passwords don’t match."));

  let user = await getUser(env, email);
  if (!user) {
    user = {
      email,
      // NOTE: Password storage is stubbed (demo). Replace with hashed storage before real prod.
      password, // TODO: hash with bcrypt/scrypt/argon2 in a secure backend
      verified: false,
      admin: email === ADMIN_EMAIL,
      tier: email === ADMIN_EMAIL ? "studio" : "free",
      createdAt: Date.now(),
    };
  } else {
    // Update password if they re-signup (so they aren't stuck).
    user.password = password;
    user.admin = email === ADMIN_EMAIL || !!user.admin;
  }
  await putUser(env, user);

  const token = newToken();
  await putToken(env, token, { email }, 60 * 60 * 24); // 24h validity

  const verifyUrl = new URL(`/api/verify?token=${token}`, request.url).toString();
  const subject = "Verify your VibeScript account";
  const body = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
      <h2>Confirm your email</h2>
      <p>Hi, please confirm your email for VibeScript:</p>
      <p><a href="${verifyUrl}" style="background:#10b981;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Confirm email</a></p>
      <p>Or paste this link in your browser:<br/>${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    </div>`;

  await sendEmail(env, { to: email, subject, html: body });
  return html(200, sentPage(email));
}

export function onRequestGet() {
  return html(405, simplePage("Sign up", `<p>Use POST.</p><p><a href="/signup" class="btn">Back</a></p>`));
}

// --- helpers ---
function html(status, content) {
  return new Response(content, { status, headers: { "content-type": "text/html; charset=UTF-8" } });
}
function shell(title, inner) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — VibeScript</title><link rel="stylesheet" href="/styles.css"/></head>
  <body class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black">
  <div class="w-full max-w-md p-6 rounded-2xl bg-black/30 border border-white/10 shadow-xl backdrop-blur">${inner}</div>
  <script src="/scripts/footer-loader.js"></script></body></html>`;
}
function errorPage(msg) {
  return shell("Sign up error", `
    <h1 class="text-xl font-bold text-white mb-2">Sign up error</h1>
    <p class="text-sm text-gray-300 mb-4">${escapeHtml(msg)}</p>
    <div class="flex gap-2">
      <a href="/signup" class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Back</a>
      <a href="/signin" class="rounded-lg bg-gradient-to-r from-pink-500 via-yellow-400 to-teal-400 px-4 py-2 text-sm font-semibold text-black">Sign in</a>
    </div>
  `);
}
function sentPage(email) {
  return shell("Check your email", `
    <h1 class="text-xl font-bold text-white mb-2">Check your email</h1>
    <p class="text-sm text-gray-300 mb-4">We sent a confirmation link to <span class="font-semibold">${escapeHtml(email)}</span>.</p>
    <p class="text-xs text-gray-400 mb-4">Didn’t get it? <a class="underline underline-offset-2" href="/resend">Resend confirmation</a></p>
    <div class="flex gap-2">
      <a href="/signin" class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Back to sign in</a>
    </div>
  `);
}
function simplePage(title, body) { return shell(title, body); }
function escapeHtml(s=""){ return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
