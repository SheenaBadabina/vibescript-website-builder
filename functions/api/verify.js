// GET /api/verify?token=...
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return Response.redirect("/signin?error=server-error", 303);

  const key = `verify:${token}`;
  const data = await env.VERIFY?.get(key);
  if (!data) return Response.redirect("/signin?error=server-error", 303);

  const payload = JSON.parse(data);
  if (payload.exp && Date.now() > payload.exp) {
    return Response.redirect("/signin?error=server-error", 303);
  }

  const userKey = `user:${payload.email.toLowerCase()}`;
  const userJSON = await env.USERS?.get(userKey);
  let user = userJSON ? JSON.parse(userJSON) : { email: payload.email, confirmed: true };
  user.confirmed = true;
  await env.USERS?.put(userKey, JSON.stringify(user));
  await env.VERIFY?.delete(key);

  return Response.redirect("/signin?notice=email-verified", 303);
}
