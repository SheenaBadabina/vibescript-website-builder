// functions/_middleware.js
// Protects /edit behind a simple token, stored as a Pages env var BUILDER_TOKEN.
// Flow:
// - If a valid cookie exists -> allow
// - If ?token=... matches BUILDER_TOKEN -> set cookie, redirect cleanly
// - Otherwise, bounce to "/" (the token screen)

const COOKIE_NAME = "vsb_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const onRequest = async (ctx) => {
  const { request, env, next } = ctx;
  const url = new URL(request.url);

  // Only guard the editor routes
  const needsAuth =
    url.pathname === "/edit" ||
    url.pathname.startsWith("/edit/");

  if (!needsAuth) {
    // also allow token landing page and assets without checks
    return next();
  }

  // If no token configured, fail closed (avoids silent “always invalid”)
  const configured = (env.BUILDER_TOKEN || "").trim();
  if (!configured) {
    return new Response(
      "Builder is locked: missing BUILDER_TOKEN env var.",
      { status: 500 }
    );
  }

  // 1) Cookie check
  const cookieHeader = request.headers.get("Cookie") || "";
  const hasValidCookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .some((c) => c === `${COOKIE_NAME}=${encodeURIComponent(configured)}`);

  if (hasValidCookie) {
    return next();
  }

  // 2) Query param token -> set cookie -> clean redirect
  const attempt = url.searchParams.get("token") || "";
  if (attempt && attempt === configured) {
    const res = new Response(null, {
      status: 302,
      headers: { Location: url.pathname }, // strip ?token
    });
    // Cookie must be available to Pages assets and Functions
    res.headers.append(
      "Set-Cookie",
      `${COOKIE_NAME}=${encodeURIComponent(configured)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; Secure; SameSite=Lax`
    );
    return res;
  }

  // 3) Not authorized -> send back to token page at "/"
  return Response.redirect("/", 302);
};
