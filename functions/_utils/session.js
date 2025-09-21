// functions/_utils/session.js
// Simple HMAC-signed cookie sessions for Cloudflare Pages Functions.
//
// ENV:
// - SESSION_SECRET (recommended): random 32+ char string in Cloudflare Pages → Settings → Environment Variables

const COOKIE = "vs_session";
const ONE_WEEK = 7 * 24 * 60 * 60;

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map(v => v.trim().split("=").map(decodeURIComponent)).filter(x=>x[0]));
}

async function sign(env, payload) {
  const data = btoa(JSON.stringify(payload));
  const sig = await hmac(env.SESSION_SECRET || "dev-secret-change-me", data);
  return `${data}.${sig}`;
}

async function verify(env, token) {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expect = await hmac(env.SESSION_SECRET || "dev-secret-change-me", data);
  if (sig !== expect) return null;
  try { return JSON.parse(atob(data)); } catch { return null; }
}

function setCookieHeader(value) {
  const secure = "Secure"; // CF Pages = HTTPS
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_WEEK}; ${secure}`;
}

function clearCookieHeader() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`;
}

export { COOKIE, parseCookies, sign, verify, setCookieHeader, clearCookieHeader };
