import { getUser } from "../_utils/db.js";
import { sign, setCookieHeader } from "../_utils/session.js";

export async function onRequestPost({ request, env }) {
  const ct = request.headers.get("content-type") || "";
  let email = "", password = "";
  if (ct.includes("application/json")) {
    const body = await request.json().catch(()=>({}));
    email = String(body.email || "").trim().toLowerCase();
    password = String(body.password || "");
  } else {
    const form = await request.formData();
    email = String(form.get("email") || "").trim().toLowerCase();
    password = String(form.get("password") || "");
  }
  if (!email || !password) return html(400, page("Sign in error", msg("Missing credentials.")));

  const user = await getUser(env, email);

  // Not found OR not verified → go straight to resend with email prefilled
  if (!user || !user.verified) {
    const headers = new Headers();
    headers.set("Location", `/resend?email=${encodeURIComponent(email)}`);
    return new Response(null, { status: 302, headers });
  }

  if (user.password !== password) {
    return html(400, page("Sign in error", msg("Incorrect password.")));
  }

  const token = await sign(env, { email: user.email, admin: !!user.admin, tier: user.tier || "free", iat: Date.now() });
  const headers = new Headers({ "Set-Cookie": setCookieHeader(token) });
  headers.set("Location", "/dashboard");
  return new Response(null, { status: 302, headers });
}

export function onRequestGet(){ return html(405, page("Sign in", msg("Use POST."))); }

function html(s, c){ return new Response(c,{status:s,headers:{ "content-type":"text/html; charset=UTF-8"}}); }
function page(t,i){ return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${t} — VibeScript</title><link rel="stylesheet" href="/styles.css"/></head><body class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black"><div class="w-full max-w-md p-6 rounded-2xl bg-black/30 border border-white/10 shadow-xl backdrop-blur">${i}</div><script src="/scripts/footer-loader.js"></script></body></html>`; }
function msg(t){ return `<p class="text-sm text-gray-300 mb-4">${t}</p><a href="/signin" class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Back</a>`; }
