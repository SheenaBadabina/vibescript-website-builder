// Cloudflare Pages Function: /api/generate
// POST { prompt, system?, temperature?, maxTokens? } -> { text }
// This is a stub that echoes a fake response until we wire a real model.

type GenRequest = {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
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

export const onRequestPost: PagesFunction = async ({ request }) => {
  const body = await readJson<GenRequest>(request);
  if (!body.prompt) return json({ error: "Missing prompt" }, { status: 400 });

  // Placeholder response to keep the UI flowing.
  const text =
    "🤖 (stub) Here’s sample copy based on your prompt:\n\n" +
    `Prompt: "${body.prompt.slice(0, 200)}"...\n\n` +
    "• Benefit-led headline\n• 3 short bullets\n• Simple call-to-action\n\n" +
    "We’ll swap this with a real model next.";

  return json({ text });
};
