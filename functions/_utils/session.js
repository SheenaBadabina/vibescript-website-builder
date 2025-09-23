// Minimal HMAC-signed session cookie for Cloudflare Pages Functions.
export const COOKIE = "vs_session";
const SECRET_NAME = "SESSION_SECRET";

// base64url helpers
const b64u = s => btoa(String.fromCharCode(...new Uint8Array(s))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const text = s => new TextEncoder().encode(s);

export async function sign(env, payload){
  const secret = await getKey(env);
  const body = b64u(text(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", secret, text(body));
  return `${body}.${b64u(new Uint8Array(sig))}`;
}
export async function verify(env, token){
  if(!token || !token.includes(".")) return null;
  const [body, sigB64] = token.split(".");
  const secret = await getKey(env);
  const ok = await crypto.subtle.verify("HMAC", secret, base64ToBuf(sigB64), text(body));
  if(!ok) return null;
  try { return JSON.parse(new TextDecoder().decode(base64ToBuf(body))); } catch { return null; }
}
export function setCookieHeader(token){
  const base = `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
  return base;
}
export function parseCookies(header){
  return Object.fromEntries((header||"").split(/;\s*/).map(p=>p.split("=").map(decodeURIComponent)).map(([k,...v])=>[k,(v||[]).join("=")]));
}
function base64ToBuf(s){
  const n = s.replace(/-/g,'+').replace(/_/g,'/'); 
  const bin = atob(n);
  const bytes = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return bytes.buffer;
}
async function getKey(env){
  const raw = env[SECRET_NAME] || "dev-local-secret-please-change";
  const key = await crypto.subtle.importKey("raw", text(raw), {name:"HMAC", hash:"SHA-256"}, false, ["sign","verify"]);
  return key;
}
