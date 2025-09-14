export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === "GET") {
    // List all projects
    const list = await env.VIBESCRIPT_PROJECTS.list();
    const projects = await Promise.all(
      list.keys.map(async (k) => {
        const v = await env.VIBESCRIPT_PROJECTS.get(k.name, { type: "json" });
        return { id: k.name, ...v };
      })
    );
    return Response.json(projects);
  }

  if (request.method === "POST") {
    const body = await request.json();
    if (!body.name) {
      return new Response("Project name required", { status: 400 });
    }
    const id = crypto.randomUUID();
    const project = { name: body.name, status: "draft", created: Date.now() };
    await env.VIBESCRIPT_PROJECTS.put(id, JSON.stringify(project));
    return Response.json({ id, ...project });
  }

  return new Response("Method not allowed", { status: 405 });
}
