// functions/api/projects.ts
type Project = {
  id: string;
  name: string;
  status: string;
  description?: string;
  createdAt: string;
};

const KEY = (id: string) => `p:${id}`;

export async function onRequestGet(ctx: EventContext<{
  VIBESCRIPT_PROJECTS: KVNamespace;
}>) {
  const items: Project[] = [];
  let cursor: string | undefined = undefined;
  do {
    const page = await ctx.env.VIBESCRIPT_PROJECTS.list({ prefix: "p:", cursor });
    for (const k of page.keys) {
      const raw = await ctx.env.VIBESCRIPT_PROJECTS.get(k.name);
      if (raw) items.push(JSON.parse(raw));
    }
    cursor = page.cursor;
  } while (cursor);
  // newest first
  items.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
  return new Response(JSON.stringify(items), {
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost(ctx: EventContext<{
  VIBESCRIPT_PROJECTS: KVNamespace;
}>) {
  try {
    const body = (await ctx.request.json()) as Partial<Project>;
    if (!body.name) throw new Error("name is required");
    const now = new Date().toISOString();
    const id = `${Date.now()}`;
    const proj: Project = {
      id,
      name: body.name,
      status: body.status || "draft",
      description: body.description || "",
      createdAt: now,
    };
    await ctx.env.VIBESCRIPT_PROJECTS.put(KEY(id), JSON.stringify(proj));
    return new Response(JSON.stringify({ ok: true, id }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}
