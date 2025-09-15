export async function onRequest() {
  return new Response(null, {
    status: 303,
    headers: {
      'Location': '/',
      'Set-Cookie': 'vs_admin=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
    }
  });
}
