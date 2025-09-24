export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") || "";
    if (!token) return seeOther("/signin?ok=0&msg=" + enc("Invalid verification link."));

    const email = await env.VERIFY.get(token);
    if (!email) return seeOther("/signin?ok=0&msg=" + enc("This verification link is invalid or expired."));

    const raw = await env.USERS.get(email);
    if (!raw) return seeOther("/signin?ok=0&msg=" + enc("Account not found."));

    const user = JSON.parse(raw);
    user.verified = true;
    await env.USERS.put(email, JSON.stringify(user));
    await env.VERIFY.delete(token);

    const sess = randomHex(32);
    await env.VERIFY.put("session:"+sess, JSON.stringify({ email, admin: !!user.admin, tier: user.tier || "free" }), { expirationTtl: 60*60*24*7 });

    return new Response(null, {
      status: 303,
      headers: { "Location": "/dashboard", "Set-Cookie": cookie("vsess", sess, 7) }
    });
  } catch {
    return seeOther("/signin?ok=0&msg=" + enc("Could not verify email. Please try again."));
  }
}

function seeOther(path){ return new Response(null,{status:303,headers:{Location:path,"Cache-Control":"no-store"}}); }
function enc(s){ return encodeURIComponent(s); }
function randomHex(n){ const a=new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b=>b.toString(16).padStart(2,"0")).join(""); }
function cookie(name,val,days){
  const exp=new Date(Date.now()+days*864e5).toUTCString();
  return `${name}=${val}; Path=/; Expires=${exp}; HttpOnly; Secure; SameSite=Lax`;
}
