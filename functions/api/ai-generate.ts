export const onRequestPost: PagesFunction<{ OPENAI_API_KEY: string }> = async ({ request, env }) => {
  try {
    const { prompt, system, temperature = 0.7, max_tokens = 600 } = await request.json();

    if (!prompt || !String(prompt).trim()) {
      return new Response(JSON.stringify({ ok: false, error: "prompt required" }), { status: 400 });
    }
    const sys =
      system?.toString().trim() ||
      "You are a precise, conversion-focused content strategist. Keep copy concise, energetic, and brand-safe.";

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: String(prompt) },
        ],
        temperature: Number(temperature),
        max_tokens: Number(max_tokens),
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      return new Response(JSON.stringify({ ok: false, error: `OpenAI ${r.status}: ${txt}` }), { status: 502 });
    }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content || "";
    return Response.json({ ok: true, content });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "AI error" }), { status: 500 });
  }
};
