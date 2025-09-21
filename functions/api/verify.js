import { takeToken, getUser, putUser } from "../_utils/db.js";
import { sign, setCookieHeader } from "../_utils/session.js";

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!token) return html(400, page("Invalid link", msg("Missing token.")));

  const data = await takeToken(env, token);
  if (!data || !data.email) return html(400, page("Invalid or expired", msg(`The link is invalid or expired. <a class="underline" href="/resend">Resend confirmation</a>.`)));

  const user = await getUser(env, data.email);
  if (!user) return html(400, page("Account not found", msg(`<a class="underline" href="/signup">Create account</a>.`)));

  user.verified = true;
  await putUser(env, user);

  const session = await sign(env, { email: user.email, admin: !!user.admin, tier: user.tier || "free", iat: Date.now() });
  const headers = new Headers({ "Set-Cookie": setCookieHeader(session) });
  headers.set("Location", "/dashboard");
  return new Response(null, { status: 302, headers });
}

function html(s, c){ return new Response(c, { status:s, headers:{ "content-type":"text/html; charset=UTF-8"}});}
function page(t,i){ return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${t} — VibeScript</title><link rel="stylesheet" href="/styles.css"/></head><body class="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-black"><div class="w-full max-w-md p-6 rounded-2xl bg-black/30 border border-white/10 shadow-xl backdrop-blur">${i}</div><script src="/scripts/footer-loader.js"></script></body></html>`;}
function msg(t){ return `<p class="text-sm text-gray-300 mb-4">${t}</p><a href="/signin" class="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white">Back to sign in</a>`; }
