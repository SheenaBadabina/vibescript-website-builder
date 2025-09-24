// Cloudflare Pages Function
// Needs KV bindings: USERS, VERIFY
// Needs vars: RESEND_API_KEY (secret), EMAIL_FROM (plaintext), NEXT_PUBLIC_SITE_URL (plaintext)

export const onRequestOptions = () =>
  new Response(null, { status: 204, headers: cors() });

export async function onRequestGet() {
  // No GETs on this endpoint
  return json({ ok: false, error: "Method not allowed" }, 405);
}

export async function onRequestPost({ request, env }) {
  try {
    const { mode, email, password } = await request.json();
    if (!email || !password || !["create", "login"].includes(mode)) {
      return json({ ok: false, error: "Bad request" }, 400);
    }
    const e = email.trim().toLowerCase();

    if (mode === "create") {
      // reject if exists
      const existing = await env.USERS.get(e, { type: "json" });
      if (existing) {
        return json({ ok: false, error: "Email already in use" }, 409);
      }
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await hashPass(password, salt);
      const user = {
        email: e,
        pass: b64(hash),
        salt: b64(salt),
        verified: false,
        createdAt: Date.now()
      };
      await env.USERS.put(e, JSON.stringify(user));
      await sendVerification(env, e);
      return json({ ok: true, message: "created" });
    }

    // login
    const user = await env.USERS.get(e, { type: "json" });
    if (!user) return json({ ok: false, error: "Invalid email or password" }, 401);

    const okPass = await verifyPass(password, fromB64(user.salt), fromB64(user.pass));
    if (!okPass) return json({ ok: false, error: "Invalid email or password" }, 401);

    if (!user.verified) {
      // auto resend
      await sendVerification(env, e);
      return json({ ok: false, reason: "unverified", resent: true }, 403);
    }

    // TODO: set your session/cookie here if you have one
    return json({ ok: true, redirect: "/dashboard" });
  } catch (err) {
    return json({ ok: false, error: err.message || "Server error" }, 500);
  }
}

/* helpers */
function cors() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST,OPTIONS"
  };
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...cors() }
  });
}
function b64(u8) { return btoa(String.fromCharCode(...u8)); }
function fromB64(s) { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }

async function hashPass(pass, salt) {
  const enc = new TextEncoder();
  const data = new Uint8Array([...salt, ...enc.encode(pass)]);
  const h = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(h);
}
async function verifyPass(pass, salt, targetHash) {
  const h = await hashPass(pass, salt);
  if (h.length !== targetHash.length) return false;
  // constant-time compare
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h[i] ^ targetHash[i];
  return diff === 0;
}

async function sendVerification(env, email) {
  // create one-time token (10 minutes)
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0,8);
  const ttl = 60 * 10;
  await env.VERIFY.put(token, JSON.stringify({ email }), { expirationTtl: ttl });

  const verifyUrl = `${env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/,"")}/api/verify?token=${token}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: email,
      subject: "Confirm your VibeScript account",
      html: `<p>Tap to confirm:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 10 minutes.</p>`
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Email send failed: ${res.status} ${text}`);
  }
}
