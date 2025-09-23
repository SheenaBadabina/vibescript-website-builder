import { getUser } from "../_utils/db.js";
import { sign, setCookieHeader } from "../_utils/session.js";

export async function onRequestPost({ request, env }) {
  const ct = request.headers.get("content-type") || "";
  let email="", password="";
  if (ct.includes("application/json")) { const b=await request.json().catch(()=>({})); email=(b.email||"").trim().toLowerCase(); password=b.password||""; }
  else { const f=await request.formData(); email=String(f.get("email")||"").trim().toLowerCase(); password=String(f.get("password")||""); }
  if(!email || !password) return text(400,"Missing credentials.");

  const user = await getUser(env, email);
  if(!user || !user.verified) return redirect(`/resend?email=${encodeURIComponent(email)}`);

  if(user.password !== password) return text(400,"Incorrect password.");

  const token = await sign(env, { email:user.email, admin:!!user.admin, tier:user.tier||"free", iat:Date.now() });
  const headers = new Headers({ "Set-Cookie": setCookieHeader(token) });
  headers.set("Location","/dashboard");
  return new Response(null,{status:302, headers});
}
function text(s,m){ return new Response(m,{status:s,headers:{'content-type':'text/plain; charset=UTF-8'}}); }
function redirect(u){ return new Response(null,{status:302,headers:{Location:u}}); }
