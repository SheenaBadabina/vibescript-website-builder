// functions/_middleware.js
// Global gate: keep selected routes public; require session for everything else.
import { COOKIE, parseCookies, verify } from "./_utils/session.js";

const PUBLIC_PREFIXES = [
  "/components/", "/scripts/", "/assets/", "/images/", "/favicon", "/robots.txt", "/sitemap.xml", "/styles.css",
  "/api/signin", "/api/signup", "/api/signout" // auth endpoints must be public
];

const PUBLIC_EXACT = new Set([
  "/", "/signin", "/signup", "/terms.html", "/privacy.html"
]);

export async function onRequest({ request, env, next }) {
  const { pathname } = new URL(request.url);

  // Allow if public exact or under public prefixes
  if (PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return next();
  }

  // Allow files with extensions (static) to pass
  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return next();
  }

  // Otherwise: require session
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const token = cookies[COOKIE];
  const session = await verify(env, token);
  if (!session) {
    const headers = new Headers({ Location: "/signin" });
    return new Response(null, { status: 302, headers });
  }

  // Session exists — continue
  return next();
}
