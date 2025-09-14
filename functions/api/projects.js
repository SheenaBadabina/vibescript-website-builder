async function guard(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if (!env.PAGES_BUILDER_TOKEN) {
    return new Response('Server missing PAGES_BUILDER_TOKEN', { status: 500 });
  }
  if (auth !== `Bearer ${env.PAGES_BUILDER_TOKEN}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  return null; // ok
}

export async function onRequest(context) {
  const { request, env } = context;

  const block = await guard(request, env);
  if (block) return block;

  // … your existing handler (list/create projects) …
  return new Response(JSON.stringify({ ok: true, items: [] }), {
    headers: { 'content-type': 'application/json' },
  });
}
