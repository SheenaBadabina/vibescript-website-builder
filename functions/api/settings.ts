// Cloudflare Pages Function: /api/settings
// Supports: GET (read), PUT (replace), PATCH (merge)

type Settings = {
  siteTitle?: string;
  primaryColor?: string;
  tagline?: string;
  ctaText?: string;
  ctaLink?: string;
  features?: { title: string; body: string }[];
};

const KEY = "settings:global";

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

export const onRequestGet: PagesFunction<{
  VIBESCRIPT_SETTINGS: KVNamespace;
}> = async ({ env }) => {
  const raw = (await env.VIBESCRIPT_SETTINGS.get(KEY)) ?? "{}";
  return json(JSON.parse(raw));
};

export const onRequestPut: PagesFunction<{
  VIBESCRIPT_SETTINGS: KVNamespace;
}> = async ({ request, env }) => {
  const body = (await readJson<Settings>(request)) || {};
  await env.VIBESCRIPT_SETTINGS.put(KEY, JSON.stringify(body));
  return json({ ok: true });
};

export const onRequestPatch: PagesFunction<{
  VIBESCRIPT_SETTINGS: KVNamespace;
}> = async ({ request, env }) => {
  const current = JSON.parse(
    (await env.VIBESCRIPT_SETTINGS.get(KEY)) ?? "{}",
  ) as Settings;
  const patch = await readJson<Partial<Settings>>(request);
  const merged = { ...current, ...patch };
  await env.VIBESCRIPT_SETTINGS.put(KEY, JSON.stringify(merged));
  return json({ ok: true });
};
