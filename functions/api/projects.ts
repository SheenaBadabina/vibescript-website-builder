type Project = { id: string; name: string; status?: string; description?: string; createdAt: string };

const KEY = "projects";

async function readAll(env: any): Promise<Project[]> {
  return (await env.VIBESCRIPT_PROJECTS.get<Project[]>(KEY, "json")) || [];
}

export const onRequestGet: PagesFunction<{ VIBESCRIPT_PROJECTS: KVNamespace }> = async ({ env }) => {
  const list = await readAll(env);
  return Response.json(list);
};

export const onRequestPost: PagesFunction<{ VIBESCRIPT_PROJECTS: KVNamespace }> = async ({ request, env }) => {
  try {
    const { name, status, description } = await request.json();
    if (!name || !String(name).trim()) throw new Error("name required");
    const list = await readAll(env);
    const p: Project = {
      id: crypto.randomUUID(),
      name: String(name).trim().slice(0, 140),
      status: String(status || "draft").slice(0, 40),
      description: description ? String(description).slice(0, 2000) : "",
      createdAt: new Date().toISOString(),
    };
    list.unshift(p);
    await env.VIBESCRIPT_PROJECTS.put(KEY, JSON.stringify(list));
    return Response.json({ ok: true, project: p });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "bad json" }), { status: 400 });
  }
};
