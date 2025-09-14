export interface Env {
  VIBESCRIPT_SETTINGS: KVNamespace;
}

const DEFAULT_SETTINGS = {
  title: "VibeScript Demo",
  tagline: "Turn one idea into momentum.",
  primaryColor: "#7c3aed",
  ctaText: "Get Started",
  ctaLink: "https://vibescript.online",
  features: [
    { title: "Fast", text: "Launch a clean page in minutes." },
    { title: "Flexible", text: "Tweak colors, copy, and layout." },
    { title: "Hosted", text: "Served on Cloudflare’s global edge." },
  ],
};

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const data = await env.VIBESCRIPT_SETTINGS.get("site", { type: "json" });
  return new Response(JSON.stringify(data ?? DEFAULT_SETTINGS), {
    headers: { "content-type": "application/json" },
  });
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json();
  await env.VIBESCRIPT_SETTINGS.put("site", JSON.stringify(body));
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
};
