import { COOKIE, parseCookies, verify } from "./_utils/session.js";

const PUBLIC_PREFIXES = [
  "/components/", "/scripts/", "/assets/", "/images/", "/favicon", "/robots.txt", "/sitemap.xml", "/styles.css",
  "/api/signin", "/api/signup", "/api/signout", "/api/verify", "/api/resend-confirmation"
];

const PUBLIC_EXACT = new Set([
  "/", "/signin", "/signup", "/resend", "/terms.html", "/privacy.html"
]);

export async function onRequest({ request, env, next }) {
  const { pathname } = new URL(request.url);

  if (PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return next();
  if (/\.[a-z0-9]+$/i.test(pathname)) return next(); // static files

  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const token = cookies[COOKIE];
  const session = await verify(env, token);
  if (!session) return new Response(null, { status: 302, headers: { Location: "/signin" } });

  return next();
}
