// Cloudflare Pages Function: /api/signin
// Behavior:
// - Always returns a 303 redirect (never raw JSON to the browser)
// - If email is unverified or user missing, auto-resend a confirmation email
// - On success (placeholder), would redirect to /dashboard

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const form = await request.formData();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const password = String(form.get("password") || "");

    if (!email || !password) {
      return redirect(context, "/signin?error=missing-fields");
    }

    // ---- Load (or seed) user record from KV --------------------------------
    // Expect KV namespaces bound in Pages > Settings > Bindings:
    //   USERS  -> for user objects
    //   VERIFY -> for pending verification tokens
    const userKey = `user:${email}`;
    let userJSON = await env.USERS?.get(userKey);
    let user = userJSON ? JSON.parse(userJSON) : null;

    // If user does not exist, seed a "pending" user so we can verify via email.
    if (!user) {
      user = {
        email,
        // DO NOT store plaintext in production — this is a scaffold.
        password: password,
        confirmed: false,
        createdAt: Date.now(),
      };
      await env.USERS?.put(userKey, JSON.stringify(user));
    }

    // If not confirmed, auto-send confirmation email & bounce back to /signin.
    if (!user.confirmed) {
      await sendConfirmation(env, email);
      return redirect(context, "/signin?notice=confirm-sent");
    }

    // TODO: replace with a real password hash check in production.
    if (user.password !== password) {
      return redirect(context, "/signin?error=bad-credentials");
    }

    // Success path (placeholder): set a session cookie (skipped here) and go.
    return redirect(context, "/dashboard");
  } catch (err) {
    // Log to Workers tail; keep UX clean.
    console.error("signin error", err);
    return redirect(context, "/signin?error=server-error");
  }
}

export async function onRequestGet(context) {
  // Health-y response if someone GETs this endpoint.
  return json({ ok: true, route: "signin" });
}

// --- helpers ----------------------------------------------------------------

function redirect(context, location) {
  const url = absoluteURL(context, location);
  return Response.redirect(url, 303);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function absoluteURL(context, path) {
  const { env, request } = context;
  const base =
    env.APP_BASE_URL ||
    (new URL(request.url)).origin ||
    "https://builder.vibescript.online";
  return new URL(path, base).toString();
}

async function sendConfirmation(env, email) {
  const token = crypto.randomUUID();
  const payload = {
    email,
    exp: Date.now() + 1000 * 60 * 60, // 60 minutes
    type: "email-verify",
  };
  await env.VERIFY?.put(`verify:${token}`, JSON.stringify(payload), {
    expirationTtl: 60 * 60, // 60 minutes
  });

  const verifyUrl = `${env.APP_BASE_URL || "https://builder.vibescript.online"}/api/verify?token=${encodeURIComponent(token)}`;

  const html = `
    <div style="font-family:Inter,system-ui,Segoe UI,Arial,sans-serif">
      <h2>Confirm your email</h2>
      <p>Tap the button below to confirm your email for VibeScript Builder.</p>
      <p><a href="${verifyUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;padding:12px 16px;border-radius:10px;text-decoration:none">Confirm email</a></p>
      <p style="font-size:12px;color:#667;word-break:break-all">${verifyUrl}</p>
      <p style="font-size:12px;color:#667">This link expires in 60 minutes.</p>
    </div>
  `;

  // Requires RESEND_API_KEY in Pages → Settings → Variables (Secret)
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "VibeScript <no-reply@vibescript.online>",
      to: [email],
      subject: "Confirm your email — VibeScript Builder",
      html,
    }),
  });
}
