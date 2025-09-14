export async function onRequest(context) {
  const { request, env } = context;
  const auth = request.headers.get('Authorization') || '';
  const expected = `Bearer ${env.PAGES_BUILDER_TOKEN}`;

  if (!env.PAGES_BUILDER_TOKEN) {
    return new Response('Server missing PAGES_BUILDER_TOKEN', { status: 500 });
  }
  if (auth !== expected) {
    return new Response('Unauthorized', { status: 401 });
  }
  return new Response('ok', { status: 200 });
}
