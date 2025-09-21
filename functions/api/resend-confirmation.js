// functions/api/resend-confirmation.js
import { sendEmail } from "../_utils/email.js";
import { newToken, getUser, putToken } from "../_utils/db.js";

export async function onRequestPost({ request, env }) {
  const ct = request.headers.get("content-type") || "";
  let email = "";
  if (ct.includes("application/json")) {
    const body = await request.json().catch(()=>({}));
    email = String(body.email || "").trim().toLowerCase();
  } else {
    const form = await request.formData();
    email = String(form.get("email") || "").trim().toLowerCase();
  }
  if (!email) return html(400, page("Resend failed", "<p class='text-sm text-gray-300'>Email is required.</p>"));

  const user = await getUser(env, email);
  if (!user) return html(200, done("If an account exists, a new confirmation was sent."));
  if (user.verified) return html(200, done("Your email is already verified. You can sign in."));

  const token = newToken();
  await putToken(env, token, { email }, 60 * 60 * 24);

  const verifyUrl = new URL(`/api/verify?token=${token}`, request.url).toString();
  await sendEmail(env, {
    to: email,
    subject: "Your VibeScript confirmation link",
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
      <p>Here is your new confirmation link:</p>
      <p><a href="${verifyUrl}" style="background:#10b981;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none">Confirm email</a></p>
      <p>Or paste this link in your browser:<br/>${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    </div>`
  });

  return html(200, done("If an account exists, a new confirmation was sent."));
}

export function onRequestGet() {
  return html(405, page("Resend confirmation", "<p class='text-sm text-gray-300'>Use POST.</p>"));
}

function html(status, content){ return new Response(content,{status,headers:{ "content-type":"text/html; charset=UTF-8"}}); }
function page(title, inner){ return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title} — VibeScript</title><link rel="stylesheet" href="/styles.css"/></head><body class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black"><div class="w-full max-w-md p-6 rounded-2xl bg-black/30 border border-white/10 shadow-xl backdrop-blur">${inner}</div><script src="/scripts/footer-loader.js"></script></body></html>`; }
function done(msg){ return page("Resent", `<h1 class="text-xl font-bold text-white mb-2">Check your email</h1><p class="text-sm text-gray-300 mb-4">${msg}</p><div class="flex gap-2"><a href="/signin" class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Back to sign in</a></div>`); }
