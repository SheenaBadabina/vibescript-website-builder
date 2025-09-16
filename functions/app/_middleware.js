// Runs before serving any /app/* page.
// Allows through only if we can validate the access token with Supabase.
export async function onRequest(context) {
  const { request, env, next } = context;

  // Allow non-GETs to pass (you can tighten later)
  if (request.method !== "GET") return next();

  const cookie = request.headers.get("cookie") || "";
  const token = readCookie(cookie, "vs_session");
  if (!token) {
    return redirectTo("/", 302);
  }

  // Validate with Supabase Auth: GET /auth/v1/user
  const url = `${env.SUPABASE_URL}/auth/v1/user`;
  const resp = await fetch(url, {
    method: "GET",
    headers: {
      "authorization": `Bearer ${token}`,
      "apikey": env.SUPABASE_ANON_KEY
    }
  });

  if (resp.ok) {
    return next(); // user is valid
  } else {
    // Purge bad cookie and bounce to sign-in
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/",
        "Set-Cookie": clearCookie("vs_session")
      }
    });
  }
}

// --- helpers ---
function readCookie(all, name) {
  const m = all.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function redirectTo(path, code) {
  return new Response(null, { status: code, headers: { Location: path } });
}
function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
