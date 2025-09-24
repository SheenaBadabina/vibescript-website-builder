export async function onRequestGet({ env }) {
  const ok = !!(env && env.USERS && env.VERIFY);
  return new Response(JSON.stringify({ ok }), {
    headers: { "content-type": "application/json", "cache-control":"no-store" }
  });
}
