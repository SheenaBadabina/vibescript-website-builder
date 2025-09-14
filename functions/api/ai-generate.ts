// functions/api/ai-generate.ts
// Simple AI endpoint using OpenAI. Expects JSON body: { prompt, system?, temperature?, max_tokens? }
type Env = {
  OPENAI_API_KEY?: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { prompt, system, temperature = 0.7, max_tokens = 600 } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return json({ ok: false, error: "prompt is required" }, 400);
    }
    if (!env.OPENAI_API_KEY) {
      return json({
        ok: false,
        error: "Missing OPENAI_API_KEY in Pages → Settings → Environment variables (Secret).",
      }, 500);
    }

    const body = {
      model: "gpt-4o-mini",
      messages: [
        system ? { role: "system", content: String(system) } : { role: "system", content: "You are a precise, practical content assistant." },
        { role: "user", content: prompt }
      ],
      temperature,
      max_tokens
    };

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return json({ ok: false, error: `OpenAI error ${r.status}`, detail: errText }, r.status);
    }

    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content ?? "";
    return json({ ok: true, content });
  } catch (e: any) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
};

export const onRequestOptions: PagesFunction = async () => {
  // If you later want to call cross-origin, add CORS headers here.
  return new Response(null, {
    headers: {
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-origin": "*",
    }
  });
};
