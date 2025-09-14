export interface Env {
  VIBESCRIPT_PROJECTS: KVNamespace;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const keys = await env.VIBESCRIPT_PROJECTS.list({ prefix: "project:" });
  const items = await Promise.all(
    keys.keys.map(async (k) => {
      const v = await env.VIBESCRIPT_PROJECTS.get(k.name, { type: "json" });
      return v;
    })
  );
  return json({ items });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const input = await request.json();
  const id = crypto.randomUUID();
  const rec = {
    id,
    name: input.name ?? "Untitled",
    status: input.status ?? "draft",
    description: input.description ?? "",
    createdAt: new Date().toISOString(),
  };
  await env.VIBESCRIPT_PROJECTS.put(`project:${id}`, JSON.stringify(rec));
  return json(rec, 201);
};
