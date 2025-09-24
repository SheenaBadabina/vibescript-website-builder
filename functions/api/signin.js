import { getUser, putToken, newToken } from "../_utils/db.js";
import { sign, setCookieHeader } from "../_utils/session.js";
import { sendEmail } from "../_utils/email.js";

export async function onRequestPost({ request, env }) {
  const ct = request.headers.get("content-type") || "";
  let email = "", password = "";

  if (ct.includes("application/json")) {
    const b = await request.json().catch(() => ({}));
    email = (b.email || "").trim().toLowerCase();
    password = b.password || "";
  } else {
    const f = await request.formData();
    email = String(f.get("email") || "").trim().toLowerCase();
    password = String(f.get("password") || "");
  }

  if (!email || !password) return text(400, "Missing credentials.");

  const user = await getUser(env, email);
  // If account doesn't exist, keep the same UX text (don’t leak existence)
  if (!user) return redirect(`/signin?msg=${encodeURIComponent("Sign in failed: Email not confirmed. We sent a new confirmation link if an account exists for that email.")}`);

  // If not verified yet → auto-resend confirmation and bounce back with a message
  if (!user.verified) {
    const token = newToken();
    await putToken(env, token, { email }, 60 * 60 * 24); // 24h
    const verifyUrl = new URL(`/api/verify?token=${token}`, request.url).toString();

    try {
      await sendEmail(env, {
        to: email,
        subject: "Your new VibeScript confirmation link",
        html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
          <h2>Confirm your email</h2>
          <p>Tap to confirm your address for VibeScript:</p>
          <p><a href="${verifyUrl}" style="background:#10b981;color:#111;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Confirm email</a></p>
          <p>Or paste this link:<br/>${verifyUrl}</p>
          <p>This link expires in 24 hours.</p>
        </div>`
      });
    } catch (_err) {
      // keep the same outward message—don’t leak infra details
    }

    return redirect(`/signin?msg=${encodeURIComponent("We just sent a new confirmation link. Please check your email.")}`);
  }

  // Verified → check password (NOTE: for production, hash & compare)
  if (user.password !== password) return text(400, "Incorrect password.");

  const token = await sign(env, { email: user.email, admin: !!user.admin, tier: user.tier || "free", iat: Date.now() });
  const headers = new Headers({ "Set-Cookie": setCookieHeader(token) });
  headers.set("Location", "/dashboard");
  return new Response(null, { status: 302, headers });
}

function text(s, m) {
  return new Response(m, { status: s, headers: { "content-type": "text/plain; charset=UTF-8" } });
}
function redirect(u) {
  return new Response(null, { status: 302, headers: { Location: u } });
}
