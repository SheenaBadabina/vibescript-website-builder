// Protect /edit and any mutating API calls with a single token.
const NEEDS_AUTH = (url: URL, req: Request) => {
  if (url.pathname.startsWith("/edit")) return true;
  if (url.pathname.startsWith("/api/")) {
    if (req.method !== "GET") return true; // POST/PUT/DELETE require auth
  }
  return false;
};

export const onRequest: PagesFunction<{ EDIT_TOKEN: string }> = async (ctx) => {
  const { request, env, next } = ctx;
  const url = new URL(request.url);
  if (!NEEDS_AUTH(url, request)) return next();

  // Accept either: Authorization: Bearer <token> OR ?key=<token>
  const auth = request.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : url.searchParams.get("key") || "";

  if (bearer && env.EDIT_TOKEN && bearer === env.EDIT_TOKEN) {
    return next();
  }

  // Friendly gate for /edit; strict JSON for APIs
  if (url.pathname.startsWith("/edit")) {
    return new Response(
      `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
       <style>body{font-family:system-ui;padding:2rem;background:#0b1020;color:#e5e7eb}
       form{display:flex;gap:.5rem}input{padding:.6rem .8rem;border-radius:.5rem;border:1px solid #334; background:#121933;color:#e5e7eb}</style>
       <h1>🔒 VibeScript Builder</h1>
       <p>Enter your access token to continue.</p>
       <form method="GET">
         <input name="key" placeholder="token" autofocus />
         <button>Continue</button>
       </form>`,
      { status: 401, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
  return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
};
