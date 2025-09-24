// Cloudflare Pages Function: POST /api/signin
// KV bindings: USERS, VERIFY
// Env: RESEND_API_KEY; optional APP_BASE_URL
export async function onRequestPost(context) {
  const { request, env } = context;
  const ct = request.headers.get("content-type") || "";
  const form = ct.includes("application/json")
    ? await request.json().catch(() => ({}))
    : Object.fromEntries(await request.formData());

  const email = String(form.email || "").trim().toLowerCase();
  const password = String(form.password || "");

  if (!email || !password) return redirect(`/signin?ok=0&msg=${enc("Missing email or password.")}`);

  // Lookup user
  const raw = await env.USERS.get(email);
  if (!raw) {
    // Generic message to avoid leaking existence
    return redirect(`/signin?ok=0&msg=${enc("Sign in failed: Email not confirmed. If this address exists, we just sent a new confirmation link.")}`);
  }
  let user; try { user = JSON.parse(raw); } catch { user = null; }
  if (!user) return redirect(`/signin?ok=0&msg=${enc("Account data error. Please contact support.")}`);

  // If not verified, auto-resend confirmation + inform user
  if (!user.verified) {
    try {
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
    } catch (_) {}
    return redirect(`/signin?ok=1&msg=${enc("We just sent a new confirmation link. Please check your email.")}`);
  }

  // Verify password (NOTE: replace with hash verification in production)
  if (user.password !== password) {
    return redirect(`/signin?ok=0&msg=${enc("Incorrect email or password.")}`);
  }

  // Success: create session + redirect
  const token = randomHex(32);
  await env.VERIFY.put(`session:${token}`, JSON.stringify({ email, admin: !!user.admin, tier: user.tier || "free" }), { expirationTtl: 60 * 60 * 24 * 7 });
  const headers = new Headers({ "Location": "/dashboard", "Set-Cookie": cookie("vsess", token, 7) });
  return new Response(null, { status: 302, headers });
}

function redirect(url){ return new Response(null,{status:302,headers:{Location:url}}); }
function enc(s){ return encodeURIComponent(s); }
function randomHex(bytes){ const a=new Uint8Array(bytes); crypto.getRandomValues(a); return [...a].map(b=>b.toString(16).padStart(2,"0")).join(""); }
function cookie(name, value, days){
  const d = new Date(Date.now()+days*864e5).toUTCString();
  return `${name}=${value}; Path=/; Expires=${d}; HttpOnly; Secure; SameSite=Lax`;
}
