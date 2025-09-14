export async function onRequest(context) {
  const { request, env } = context;

  // Simple bearer token gate (optional): set PAGES_BUILDER_TOKEN in Pages > Settings > Environment variables
  const needToken = env.PAGES_BUILDER_TOKEN && env.PAGES_BUILDER_TOKEN.length > 0;
  if (needToken) {
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== env.PAGES_BUILDER_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  if (request.method === "GET") {
    const list = await env.VIBESCRIPT_PROJECTS.list();
    const projects = await Promise.all(
      list.keys.map(async (k) => {
        const v = await env.VIBESCRIPT_PROJECTS.get(k.name, { type: "json" });
        return { id: k.name, ...(v || {}) };
      })
    );
    return Response.json(projects);
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    const name = (body.name || "").trim();
    const status = (body.status || "draft").trim();

    if (!name) return new Response("Project name required", { status: 400 });

    const id = crypto.randomUUID();
    const project = {
      name,
      status,
      createdAt: new Date().toISOString(),
    };

    await env.VIBESCRIPT_PROJECTS.put(id, JSON.stringify(project));
    return Response.json({ id, ...project }, { status: 201 });
  }

  return new Response("Method not allowed", { status: 405 });
}
