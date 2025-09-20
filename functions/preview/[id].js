export async function onRequest({ params, env }) {
  const id = params.id;
  const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/projects?id=eq.${id}&select=html`, {
    headers:{ "apikey": env.SUPABASE_SERVICE_ROLE_KEY, "authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
  });
  if(!resp.ok) return new Response("Not found", { status:404 });
  const rows = await resp.json();
  const html = rows?.[0]?.html || "<!doctype html><title>Not Found</title><body>Not found</body>";
  return new Response(html, { status:200, headers:{ "content-type":"text/html; charset=utf-8" }});
}
