import { takeToken, getUser, putUser } from "../_utils/db.js";
import { sign, setCookieHeader } from "../_utils/session.js";

export async function onRequest({ request, env }) {
  const u = new URL(request.url); const token = u.searchParams.get("token") || "";
  if(!token) return text(400,"Missing token.");

  const data = await takeToken(env, token);
  if(!data || !data.email) return redirect("/resend?msg=Link%20invalid%20or%20expired");

  const user = await getUser(env, data.email);
  if(!user) return redirect("/signup?msg=Account%20not%20found");

  user.verified = true; await putUser(env, user);
  const session = await sign(env, { email:user.email, admin:!!user.admin, tier:user.tier||"free", iat:Date.now() });
  const headers = new Headers({ "Set-Cookie": setCookieHeader(session) });
  headers.set("Location","/dashboard");
  return new Response(null,{status:302, headers});
}
function text(s,m){ return new Response(m,{status:s,headers:{'content-type':'text/plain; charset=UTF-8'}}); }
function redirect(u){ return new Response(null,{status:302,headers:{Location:u}}); }
