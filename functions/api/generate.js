export async function onRequest(context) {
  const { request, env } = context;

  // Optional bearer check (same token as the builder gate)
  const needToken = env.PAGES_BUILDER_TOKEN && env.PAGES_BUILDER_TOKEN.length > 0;
  if (needToken) {
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== env.PAGES_BUILDER_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!env.OPENAI_API_KEY) {
    return new Response("Missing OPENAI_API_KEY", { status: 500 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    return new Response("Invalid JSON", { status: 400 });
  }

  const {
    input = "",
    style = "",
    temperature = 0.7,
    maxTokens = 600,
    model = "gpt-4o-mini"
  } = body;

  if (!input.trim()) {
    return new Response("`input` is required", { status: 400 });
  }

  const sys = style?.trim()
    ? style.trim()
    : "You are a precise, conversion-focused content strategist who writes clear, crisp copy for landing pages.";

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: Number(temperature) || 0.7,
        max_tokens: Number(maxTokens) || 600,
        messages: [
          { role: "system", content: sys },
          {
            role: "user",
            content:
              `Create landing-page copy blocks from this business input. ` +
              `Return short sections: headline, subheadline, bullets (3-5), CTA suggestions.\n\nInput:\n${input}`
          }
        ]
      })
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(`OpenAI error: ${t}`, { status: 502 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    return Response.json({ text, model: data.model, usage: data.usage || null });
  } catch (err) {
    return new Response(`Server error: ${err.message}`, { status: 500 });
  }
}
