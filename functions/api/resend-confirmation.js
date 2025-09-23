import { sendEmail } from "../_utils/email.js";
import { newToken, getUser, putToken } from "../_utils/db.js";

export async function onRequestPost({ request, env }) {
  const ct = request.headers.get("content-type") || "";
  let email="";
  if (ct.includes("application/json")) { const b=await request.json().catch(()=>({})); email=(b.email||"").trim().toLowerCase(); }
  else { const f=await request.formData(); email=String(f.get("email")||"").trim().toLowerCase(); }
  if(!email) return text(400,"Email is required.");

  const user = await getUser(env, email);
  if(!user || user.verified) return redirect(`/signin?msg=${encodeURIComponent("If an account exists, a new confirmation was sent.")}`);

  const token = newToken();
  await putToken(env, token, { email }, 60*60*24);
  const verifyUrl = new URL(`/api/verify?token=${token}`, request.url).toString();

  await sendEmail(env, {
    to: email, subject: "Your VibeScript confirmation link",
    html: `<p>Here is your new confirmation link:</p>
           <p><a href="${verifyUrl}" style="background:#10b981;color:#111;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">Confirm email</a></p>
           <p>Or paste this link:<br/>${verifyUrl}</p><p>Expires in 24 hours.</p>`
  });

  return redirect(`/signin?msg=${encodeURIComponent("If an account exists, a new confirmation was sent.")}`);
}
function text(s,m){ return new Response(m,{status:s,headers:{'content-type':'text/plain; charset=UTF-8'}}); }
function redirect(u){ return new Response(null,{status:302,headers:{Location:u}}); }
