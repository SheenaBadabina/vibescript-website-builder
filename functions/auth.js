// POST /auth
export async function onRequestPost({ request, env }) {
  // 1) read token from form
  const form = await request.formData();
  const token = (form.get('token') || '').trim();

  // 2) expected token: prefer KV, fall back to Pages secret
  let expected = '';
  try {
    if (env.VIBESCRIPT_SETTINGS) {
      expected = (await env.VIBESCRIPT_SETTINGS.get('ACCESS_TOKEN')) || '';
    }
  } catch (_) {}
  if (!expected && env.ACCESS_TOKEN) expected = env.ACCESS_TOKEN;

  // 3) validate
  if (!token || !expected || token !== expected) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid' }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }

  // 4) set cookie + redirect to /edit
  const headers = new Headers();
  headers.set(
    'Set-Cookie',
    [
      `vs_admin=1`,
      `Path=/`,
      `HttpOnly`,
      `Secure`,
      `SameSite=Lax`,
      `Max-Age=${60 * 60 * 24 * 30}` // 30 days
    ].join('; ')
  );
  headers.set('Location', '/edit');
  return new Response(null, { status: 303, headers });
}
