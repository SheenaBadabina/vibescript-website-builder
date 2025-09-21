// functions/api/signup.js
// Minimal demo signup: validates password confirmation client-side,
// sets a session cookie (admin if email matches), redirects to /dashboard.
import { sign, setCookieHeader } from "../_utils/session.js";

export async function onRequestPost({ request, env }) {
  const contentType = request.headers.get("content-type") || "";
  let email = "", password = "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(()=> ({}));
    email = (body.email || "").trim().toLowerCase();
    password = body.password || "";
  } else {
    const form = await request.formData();
    email = String(form.get("email") || "").trim().toLowerCase();
    password = String(form.get("password") || "");
    // "confirm" is checked in the browser; we don’t re-check here for simplicity.
  }

  if (!email || !password) {
    return new Response("Missing fields", { status: 400 });
  }

  const adminEmail = "admin@vibescript.online";
  const admin = email === adminEmail;
  const tier = admin ? "studio" : "free";

  const token = await sign(env, { email, admin, tier, iat: Date.now() });
  const headers = new Headers({ "Set-Cookie": setCookieHeader(token) });
  headers.set("Location", "/dashboard");
  return new Response(null, { status: 302, headers });
}

export function onRequestGet() {
  return new Response("Use POST", { status: 405 });
}
