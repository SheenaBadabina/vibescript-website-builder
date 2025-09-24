export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return respond("Invalid or missing token.", 400);

  const rec = await env.VERIFY.get(token, { type: "json" });
  if (!rec || !rec.email) return respond("Link expired or already used.", 410);

  const user = await env.USERS.get(rec.email, { type: "json" });
  if (!user) return respond("Account not found.", 404);

  user.verified = true;
  await env.USERS.put(rec.email, JSON.stringify(user));
  await env.VERIFY.delete(token);

  return new Response(null, { status: 302, headers: { Location: "/signin?verified=1" }});
}
function respond(msg, status=400){ return new Response(JSON.stringify({ ok:false, error: msg }), { status, headers:{ "content-type":"application/json" } }); }
