export interface Settings {
  title: string;
  tagline: string;
  primaryColor: string;
  ctaText: string;
  ctaLink: string;
  features: { title: string; text: string }[];
}

const DEFAULTS: Settings = {
  title: "VibeScript",
  tagline: "",
  primaryColor: "#7c3aed",
  ctaText: "Get Started",
  ctaLink: "",
  features: [{ title: "Fast", text: "Launch a clean page in minutes." }],
};

export const onRequestGet: PagesFunction<{ VIBESCRIPT_SETTINGS: KVNamespace }> = async ({ env }) => {
  const s = await env.VIBESCRIPT_SETTINGS.get<Settings>("site", "json");
  return Response.json(s || DEFAULTS);
};

export const onRequestPost: PagesFunction<{ VIBESCRIPT_SETTINGS: KVNamespace }> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as Partial<Settings>;
    const safe: Settings = {
      title: body.title?.slice(0, 120) || DEFAULTS.title,
      tagline: body.tagline?.slice(0, 280) || "",
      primaryColor: body.primaryColor?.slice(0, 16) || DEFAULTS.primaryColor,
      ctaText: body.ctaText?.slice(0, 60) || DEFAULTS.ctaText,
      ctaLink: body.ctaLink?.slice(0, 200) || "",
      features: Array.isArray(body.features)
        ? body.features.slice(0, 24).map(f => ({
            title: (f?.title || "").toString().slice(0, 120),
            text: (f?.text || "").toString().slice(0, 2000),
          }))
        : DEFAULTS.features,
    };
    await env.VIBESCRIPT_SETTINGS.put("site", JSON.stringify(safe));
    return Response.json({ ok: true });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "bad json" }), { status: 400 });
  }
};
