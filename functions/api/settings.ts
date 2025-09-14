// functions/api/settings.ts
export interface SiteSettings {
  title: string;
  tagline: string;
  primaryColor: string;
  ctaText: string;
  ctaLink: string;
  features: { title: string; text: string }[];
}

const DEFAULTS: SiteSettings = {
  title: "VibeScript",
  tagline: "Turn one idea into momentum.",
  primaryColor: "#7c3aed",
  ctaText: "Get Started",
  ctaLink: "",
  features: [{ title: "Fast", text: "Launch a clean page in minutes." }],
};

export async function onRequestGet(ctx: EventContext<{
  VIBESCRIPT_SETTINGS: KVNamespace;
}>) {
  const raw = await ctx.env.VIBESCRIPT_SETTINGS.get("site");
  const data = raw ? JSON.parse(raw) : DEFAULTS;
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });
}

export async function onRequestPost(ctx: EventContext<{
  VIBESCRIPT_SETTINGS: KVNamespace;
}>) {
  try {
    const body = (await ctx.request.json()) as Partial<SiteSettings>;
    const merged: SiteSettings = {
      ...DEFAULTS,
      ...body,
      features: Array.isArray(body.features) ? body.features : DEFAULTS.features,
    };
    await ctx.env.VIBESCRIPT_SETTINGS.put("site", JSON.stringify(merged));
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
}
