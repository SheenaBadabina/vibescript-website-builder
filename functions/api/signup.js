import { sendEmail } from "../_utils/email.js";
import { newToken, getUser, putUser, putToken } from "../_utils/db.js";

const ADMIN_EMAIL = "admin@vibescript.online";

export async function onRequestPost({ request, env }) {
  const ct = request.headers.get("content-type") || "";
  let email="", password="", confirm="";
  if (ct.includes("application/json")) {
    const b = await request.json().catch(()=>({})); email=(b.email||"").trim().toLowerCase(); password=b.password||""; confirm=b.confirm||"";
  } else {
    const f = await request.formData(); email=String(f.get("email")||"").trim().toLowerCase(); password=String(f.get("password")||""); confirm=String(f.get("confirm")||"");
  }
  if(!email || !password || !confirm) return text(400,"Missing required fields.");
  if(password !== confirm) return text(400,"Passwords don’t match.");

  let user = await getUser(env, email);
  if(!user){
    user = { email, password, verified:false, admin: email===ADMIN_EMAIL, tier: email===ADMIN_EMAIL ? "studio":"free", createdAt: Date.now() };
  } else {
    user.password = password; // TODO: hash in production
  }
  await putUser(env, user);

  const token = newToken();
  await putToken(env, token, { email }, 60*60*24);
  const verifyUrl = new URL(`/api/verify?token=${token}`, request.url).toString();

  await sendEmail(env, {
    to: email,
    subject: "Verify your VibeScript account",
    html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
      <h2>Confirm your email</h2>
      <p>Tap to confirm your address for VibeScript:</p>
      <p><a href="${verifyUrl}" style="background:#10b981;color:#111;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Confirm email</a></p>
      <p>Or paste this link in your browser:<br/>${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    </div>`
  });

  return redirect(`/signin?msg=${encodeURIComponent("We sent you a confirmation link.")}`);
}
function text(s,m){ return new Response(m,{status:s,headers:{'content-type':'text/plain; charset=UTF-8'}}); }
function redirect(u){ return new Response(null,{status:302,headers:{Location:u}}); }
