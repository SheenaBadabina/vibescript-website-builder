// Protect /edit (and anything under it) by requiring the vs_admin cookie
export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const protectedPaths = url.pathname === '/edit' || url.pathname.startsWith('/edit/');

  if (!protectedPaths) return next();

  const cookie = request.headers.get('Cookie') || '';
  const authed = /(?:^|;\s*)vs_admin=1(?:;|$)/.test(cookie);
  if (authed) return next();

  // Not authed → send to login
  return Response.redirect(`${url.origin}/`, 302);
}
