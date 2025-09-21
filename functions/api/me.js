// functions/api/me.js
import { COOKIE, parseCookies, verify } from "../_utils/session.js";

export async function onRequest({ request, env }) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const token = cookies[COOKIE];
  const session = await verify(env, token);
  if (!session) return new Response(JSON.stringify({ ok:false }), { status: 401, headers: { "content-type": "application/json" }});
  return new Response(JSON.stringify({ ok:true, ...session }), { headers: { "content-type": "application/json" }});
}
