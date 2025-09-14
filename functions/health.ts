export const onRequestGet: PagesFunction = () =>
  new Response("ok", { headers: { "content-type": "text/plain" } });
