export const onRequestGet = () =>
  new Response(JSON.stringify({ ok: true, service: "pages-functions" }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
