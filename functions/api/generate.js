// Cloudflare Pages Function: POST /api/generate
// Needs env var: OPENAI_API_KEY

const MODEL = "gpt-4o-mini";

export async function onRequestPost({ request, env }) {
  try {
    const { spec } = await request.json();
    if (!spec) return new Response("Missing spec", { status: 400 });

    const system =
      "You are VibeScript. Generate a single mobile-first HTML page named index.html. " +
      "Use semantic HTML and an inline <style>. Include a nav with About, Privacy, Terms (links can be #). " +
      "If products are requested, include a simple Products section with Buy buttons (no real checkout). " +
      "Avoid external assets and scripts. Keep it clean and fast.";

    const body = JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `User website request: ${spec}` }
      ],
      temperature: 0.4
    });

    const ai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body
    });

    if (!ai.ok) {
      const t = await ai.text();
      return new Response(`OpenAI error: ${t}`, { status: 502 });
    }

    const data = await ai.json();
    const indexHtml =
      data?.choices?.[0]?.message?.content ||
      "<!doctype html><meta charset='utf-8'><title>VibeScript</title><h1>Empty</h1>";

    return new Response(JSON.stringify({ indexHtml }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch {
    return new Response("Bad request", { status: 400 });
  }
}
