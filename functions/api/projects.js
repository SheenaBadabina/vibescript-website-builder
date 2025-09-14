const KEY = (name) => `project:${name}`;

export async function onRequestGet({ env }) {
  const list = await env.VIBESCRIPT_PROJECTS.list({ prefix: "project:" });
  const items = [];
  for (const k of list.keys) {
    const raw = await env.VIBESCRIPT_PROJECTS.get(k.name);
    if (raw) items.push(JSON.parse(raw));
  }
  return Response.json(items);
}

export async function onRequestPost({ request, env }) {
  const { name, status = "draft", description = "" } = await request.json();
  if (!name) return new Response("name required", { status: 400 });
  const obj = { name, status, description, createdAt: new Date().toISOString() };
  await env.VIBESCRIPT_PROJECTS.put(KEY(name), JSON.stringify(obj));
  return Response.json(obj, { status: 201 });
}
