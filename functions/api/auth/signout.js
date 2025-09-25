export async function onRequestGet() {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Set-Cookie": "vs_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers
  });
}
