// functions/api/signout.js
import { clearCookieHeader } from "../_utils/session.js";

export function onRequest({ request }) {
  const headers = new Headers({ "Set-Cookie": clearCookieHeader() });
  headers.set("Location", "/signin");
  return new Response(null, { status: 302, headers });
}
