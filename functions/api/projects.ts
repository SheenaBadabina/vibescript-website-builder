// Cloudflare Pages Function: /api/projects
// Simple CRUD over KV. Keys are "project:<slug>".
// Endpoints:
//   GET    /api/projects            -> list (ids only)
//   GET    /api/projects?id=slug    -> read one
//   POST   /api/projects            -> create { id, ... }
//   PUT    /api/projects?id=slug    -> replace
//   PATCH  /api/projects?id=slug    -> merge
//   DELETE /api/projects?id=slug    -> delete

type Project = {
  id: string;              // stable id/slug
  name?: string;
  status?: "draft" | "active" | "archived";
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

const prefix = "project:";

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers,
    },
    status: init.status ?? 200,
  });
}

async function readJson<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text);
  } catch {
    throw new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}

function key(id: string) {
  return `${prefix}${id}`;
}

export const onRequestGet: PagesFunction<{
  VIBESCRIPT_PROJECTS: KVNamespace;
}> = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id) {
    const raw = await env.VIBESCRIPT_PROJECTS.get(key(id));
    if (!raw) return json({ error: "Not found" }, { status: 404 });
    return json(JSON.parse(raw));
  }

  // list ids
  const list = await env.VIBESCRIPT_PROJECTS.list({ prefix });
  const ids = list.keys.map((k) => k.name.replace(prefix, ""));
  return json({ ids });
};

export const onRequestPost: PagesFunction<{
  VIBESCRIPT_PROJECTS: KVNamespace;
}> = async ({ request, env }) => {
  const p = await readJson<Project>(request);
  if (!p?.id) return json({ error: "Missing id" }, { status: 400 });
  const now = new Date().toISOString();
  const doc: Project = {
    createdAt: now,
    updatedAt: now,
    status: "draft",
    ...p,
  };
  await env.VIBESCRIPT_PROJECTS.put(key(p.id), JSON.stringify(doc));
  return json({ ok: true, id: p.id });
};

export const onRequestPut: PagesFunction<{
  VIBESCRIPT_PROJECTS: KVNamespace;
}> = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "Missing id" }, { status: 400 });
  const body = await readJson<Project>(request);
  body.id = id;
  body.updatedAt = new Date().toISOString();
  await env.VIBESCRIPT_PROJECTS.put(key(id), JSON.stringify(body));
  return json({ ok: true });
};

export const onRequestPatch: PagesFunction<{
  VIBESCRIPT_PROJECTS: KVNamespace;
}> = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "Missing id" }, { status: 400 });
  const currentRaw = await env.VIBESCRIPT_PROJECTS.get(key(id));
  if (!currentRaw) return json({ error: "Not found" }, { status: 404 });
  const current = JSON.parse(currentRaw) as Project;
  const patch = await readJson<Partial<Project>>(request);
  const merged = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
  await env.VIBESCRIPT_PROJECTS.put(key(id), JSON.stringify(merged));
  return json({ ok: true });
};

export const onRequestDelete: PagesFunction<{
  VIBESCRIPT_PROJECTS: KVNamespace;
}> = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return json({ error: "Missing id" }, { status: 400 });
  await env.VIBESCRIPT_PROJECTS.delete(key(id));
  return json({ ok: true });
};
