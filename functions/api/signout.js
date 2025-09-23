import { COOKIE } from "../_utils/session.js";
export async function onRequest() {
  const h = new Headers(); h.set("Set-Cookie", `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  h.set("Location","/signin"); return new Response(null,{status:302, headers:h});
}
