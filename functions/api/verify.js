export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) return html(400, "Missing token.");

  const entry = await env.VERIFY.get(token, { type: "json" });
  if (!entry) return html(400, "Invalid or expired token.");

  const email = entry.email;
  const user = await env.USERS.get(email, { type: "json" });
  if (!user) return html(400, "User not found.");

  user.verified = true;
  await env.USERS.put(email, JSON.stringify(user));
  await env.VERIFY.delete(token);

  return html(200, `✅ Email verified. You can close this tab and <a href="/signin">sign in</a>.`);
}

function html(status, body) {
  return new Response(
    `<!doctype html><meta charset=utf-8><body style="font:16px system-ui;color:#e9efff;background:#0b1220;padding:24px">
     <div style="max-width:680px;margin:auto;background:#121a2b;border:1px solid #1f2b46;border-radius:16px;padding:18px">
     ${body}
     </div>`, { status, headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
