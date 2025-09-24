// GET /api/verify?token=...
// Confirms email, starts session, redirects → /dashboard
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!token) return redirect(`/signin?ok=0&msg=${enc("Invalid or missing verification token.")}`);

  const email = await env.VERIFY.get(token);
  if (!email) return redirect(`/signin?ok=0&msg=${enc("This verification link is invalid or has expired.")}`);

  const raw = await env.USERS.get(email);
  if (!raw) return redirect(`/signin?ok=0&msg=${enc("Account not found.")}`);

  let user; try { user = JSON.parse(raw); } catch { user = null; }
  if (!user) return redirect(`/signin?ok=0&msg=${enc("Account data error.")}`);

  user.verified = true;
  await env.USERS.put(email, JSON.stringify(user));
  await env.VERIFY.delete(token);

  const sess = randomHex(32);
  await env.VERIFY.put(`session:${sess}`, JSON.stringify({ email, admin: !!user.admin, tier: user.tier || "free" }), { expirationTtl: 60 * 60 * 24 * 7 });
  const headers = new Headers({ "Location": "/dashboard", "Set-Cookie": cookie("vsess", sess, 7) });
  return new Response(null, { status: 302, headers });
}

function redirect(url){ return new Response(null,{status:302,headers:{Location:url}}); }
function enc(s){ return encodeURIComponent(s); }
function randomHex(bytes){ const a=new Uint8Array(bytes); crypto.getRandomValues(a); return [...a].map(b=>b.toString(16).padStart(2,"0")).join(""); }
function cookie(name, value, days){
  const d=new Date(Date.now()+days*864e5).toUTCString();
  return `${name}=${value}; Path=/; Expires=${d}; HttpOnly; Secure; SameSite=Lax`;
}
