// functions/api/upgrade.js
// Admin-only quick tier switcher (session-scoped) until Stripe/KV is integrated.
import { COOKIE, parseCookies, verify, sign, setCookieHeader } from "../_utils/session.js";

const TIERS = new Set(["free","pro","studio"]);

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const tier = (url.searchParams.get("tier") || "").toLowerCase();
  if (!TIERS.has(tier)) return new Response("invalid tier", { status: 400 });

  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const token = cookies[COOKIE];
  const session = await verify(env, token);
  if (!session) return new Response("unauthorized", { status: 401 });

  if (!session.admin) return new Response("forbidden", { status: 403 });

  // Session-scoped: upgrade current session only. (Real grants will use KV/Stripe webhooks later.)
  const updated = { ...session, tier, iat: Date.now() };
  const newToken = await sign(env, updated);
  const headers = new Headers({ "Set-Cookie": setCookieHeader(newToken) });
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify({ ok:true, tier }), { status: 200, headers });
}
