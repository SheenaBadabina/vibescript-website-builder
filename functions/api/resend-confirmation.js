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
  if (!email) return respond("Email is required.", 400);

  const user = await getUser(env, email);
  // Do not leak user existence
  if (!user || user.verified) return sent();

  const token = newToken();
  await putToken(env, token, { email }, 60 * 60 * 24); // 24h
  const verifyUrl = new URL(`/api/verify?token=${token}`, request.url).toString();

  await sendEmail(env, {
    to: email,
    subject: "Your VibeScript confirmation link",
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
      <p>Here is your new confirmation link:</p>
      <p><a href="${verifyUrl}" style="background:#10b981;color:#111;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Confirm email</a></p>
      <p>Or paste this link in your browser:<br/>${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    </div>`
  });

  return sent();

  function sent(){
    return redirectWithMsg("/signin", "If an account exists, a new confirmation link was sent.");
  }
  function respond(text, status=200){
    return new Response(text, { status, headers:{ "content-type":"text/plain; charset=UTF-8"}});
  }
}

function redirectWithMsg(path, msg){
  const u = new URL(path, "https://builder.vibescript.online");
  u.searchParams.set("msg", encodeURIComponent(msg));
  return new Response(null, { status: 302, headers: { Location: u.toString() }});
}
