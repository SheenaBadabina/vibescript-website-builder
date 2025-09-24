// Cloudflare Pages Function for /api/signin
// Accepts GET or POST (defensive). Always redirects back to /signin with a banner.
// KV: USERS, VERIFY  |  Env: RESEND_API_KEY  |  optional: APP_BASE_URL
export async function onRequest(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (!["GET","POST"].includes(method)) {
      return seeOther("/signin?ok=0&msg=" + enc("Unsupported method."));
    }

    // Pull input from either JSON, form, or query (defensive)
    let email = "", password = "";
    if (method === "POST") {
      const ct = request.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const body = await request.json().catch(() => ({}));
        email = (body.email || "").trim().toLowerCase();
        password = (body.password || "");
      } else {
        const body = Object.fromEntries(await request.formData());
        email = String(body.email || "").trim().toLowerCase();
        password = String(body.password || "");
      }
    } else {
      email = (url.searchParams.get("email") || "").trim().toLowerCase();
      password = (url.searchParams.get("password") || "");
    }

    if (!email || !password) {
      return seeOther("/signin?ok=0&msg=" + enc("Missing email or password."));
    }

    // Look up user
    const raw = await env.USERS.get(email);
    if (!raw) {
      // Do not leak existence; auto-resend if it *does* exist later
      await maybeAutoResend(env, request, email).catch(() => {});
      return seeOther("/signin?ok=1&msg=" + enc("If this address exists, we just sent a new confirmation link."));
    }

    let user;
    try { user = JSON.parse(raw); } catch { user = null; }
    if (!user) return seeOther("/signin?ok=0&msg=" + enc("Account data error."));

    if (!user.verified) {
      await autoResend(env, request, email).catch(() => {});
      return seeOther("/signin?ok=1&msg=" + enc("We just sent a new confirmation link. Please check your email."));
    }

    // TODO: replace with proper hash verification
    if (user.password !== password) {
      return seeOther("/signin?ok=0&msg=" + enc("Incorrect email or password."));
    }

    // Create session
    const token = randomHex(32);
    await env.VERIFY.put(
      "session:" + token,
      JSON.stringify({ email, admin: !!user.admin, tier: user.tier || "free" }),
      { expirationTtl: 60 * 60 * 24 * 7 }
    );

    const headers = new Headers({
      "Location": "/dashboard",
      "Set-Cookie": cookie("vsess", token, 7)
    });
    return new Response(null, { status: 303, headers });
  } catch (err) {
    // Never leak raw JSON to end-user; always bounce back with message.
    return seeOther("/signin?ok=0&msg=" + enc("Could not sign in right now. Please try again."));
  }
}

async function maybeAutoResend(env, request, email) {
  // If there is a user but unverified, resend. If not, silently do nothing.
  const raw = await env.USERS.get(email);
  if (!raw) return;
  const user = JSON.parse(raw);
  if (!user || user.verified) return;
  await autoResend(env, request, email);
}

async function autoResend(env, request, email) {
  const token = randomHex(32);
  await env.VERIFY.put(token, email, { expirationTtl: 60 * 60 * 24 });
  const base = env.APP_BASE_URL || new URL(request.url).origin;
  const verifyUrl = `${base}/api/verify?token=${token}`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "VibeScript <no-reply@vibescript.online>",
      to: [email],
      subject: "Confirm your VibeScript email",
      html: `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
          <h2>Confirm your email</h2>
          <p>Tap the button to confirm your address and sign in:</p>
          <p><a href="${verifyUrl}" style="display:inline-block;background:#10b981;color:#111;padding:12px 16px;border-radius:10px;text-decoration:none;font-weight:800">Confirm email</a></p>
          <p>Or copy and paste this link:<br>${verifyUrl}</p>
          <p>This link expires in 24 hours.</p>
        </div>`
    })
  });
}

function seeOther(path){ return new Response(null,{status:303,headers:{Location:path,"Cache-Control":"no-store"}}); }
function enc(s){ return encodeURIComponent(s); }
function randomHex(n){ const a=new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(b=>b.toString(16).padStart(2,"0")).join(""); }
function cookie(name,val,days){
  const exp=new Date(Date.now()+days*864e5).toUTCString();
  return `${name}=${val}; Path=/; Expires=${exp}; HttpOnly; Secure; SameSite=Lax`;
}
