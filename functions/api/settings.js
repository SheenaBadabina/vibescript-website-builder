export async function onRequestGet({ env }) {
  const raw = await env.VIBESCRIPT_SETTINGS.get("site");
  const data = raw ? JSON.parse(raw) : {
    title: "VibeScript",
    tagline: "Turn one idea into momentum.",
    primaryColor: "#7c3aed",
    ctaText: "Get Started",
    ctaLink: "https://vibescript.online",
    features: [
      { title: "Fast",     text: "Launch a clean page in minutes." },
      { title: "Flexible", text: "Tweak colors, copy, and layout." },
      { title: "Hosted",   text: "Served on Cloudflare’s global edge." }
    ]
  };
  return new Response(JSON.stringify(data), { headers: { "content-type": "application/json" } });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();
  await env.VIBESCRIPT_SETTINGS.put("site", JSON.stringify(body));
  return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
}
