// Create unverified user and send initial verification email.
// NOTE: Passwords are stored plaintext in this demo; replace with hashing before production.

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

  if (!email || !password || !confirm) return html(400, page("Sign up error", msg("Missing required fields.")));
  if (password !== confirm) return html(400, page("Sign up error", msg("Passwords don’t match.")));

  let user = await getUser(env, email);
  if (!user) {
    user = {
      email,
      password,                     // TODO: hash
      verified: false,
      admin: email === ADMIN_EMAIL,
      tier: email === ADMIN_EMAIL ? "studio" : "free",
      createdAt: Date.now(),
    };
  } else {
    // allow re-signup resets; don’t change verified flag here
    user.password = password;       // TODO: hash
    user.admin = user.admin || (email === ADMIN_EMAIL);
  }
  await putUser(env, user);

  const token = newToken();
  await putToken(env, token, { email }, 60 * 60 * 24);

  const verifyUrl = new URL(`/api/verify?token=${token}`, request.url).toString();
  await sendEmail(env, {
    to: email,
    subject: "Verify your VibeScript account",
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
      <h2>Confirm your email</h2>
      <p>Hi, please confirm your email for VibeScript:</p>
      <p><a href="${verifyUrl}" style="background:#10b981;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Confirm email</a></p>
      <p>Or paste this link in your browser:<br/>${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    </div>`
  });

  return html(200, page("Check your email",
    `<p class="text-sm text-gray-300 mb-4">We sent a confirmation link to <span class="font-semibold">${escapeHtml(email)}</span>.</p>
     <p class="text-xs text-gray-400 mb-4">Didn’t get it? <a class="underline" href="/resend?email=${encodeURIComponent(email)}">Resend confirmation</a>.</p>
     <a href="/signin" class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Back to sign in</a>`
  ));
}

export function onRequestGet(){ return html(405, page("Sign up", msg("Use POST."))); }

function html(s, c){ return new Response(c,{status:s,headers:{ "content-type":"text/html; charset=UTF-8"}}); }
function page(t,i){ return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${t} — VibeScript</title><link rel="stylesheet" href="/styles.css"/></head><body class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black"><div class="w-full max-w-md p-6 rounded-2xl bg-black/30 border border-white/10 shadow-xl backdrop-blur">${i}</div><script src="/scripts/footer-loader.js"></script></body></html>`; }
function msg(t){ return `<p class="text-sm text-gray-300 mb-4">${t}</p>`; }
function escapeHtml(s=""){ return s.replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
