// functions/api/signin.js
import { parseCookies, sign, setCookieHeader } from "../_utils/session.js";

export async function onRequestPost({ request, env }) {
  // Accept form or JSON. Minimal demo auth: any email/password; admin detected by email.
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
  }

  if (!email || !password) {
    return new Response("Missing credentials", { status: 400 });
  }

  const adminEmail = "admin@vibescript.online";
  const admin = email === adminEmail;
  const tier = admin ? "studio" : "free"; // default free until Stripe/KV

  const token = await sign(env, { email, admin, tier, iat: Date.now() });
  const headers = new Headers({ "Set-Cookie": setCookieHeader(token) });
  headers.set("Location", "/dashboard");
  return new Response(null, { status: 302, headers });
}

export function onRequestGet() {
  return new Response("Use POST", { status: 405 });
}
