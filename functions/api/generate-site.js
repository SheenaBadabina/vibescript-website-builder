// functions/api/generate-site.js
// Uses your GENESIS meta-prompt and returns { html }.
// Requires Cloudflare Secret: OPENAI_API_KEY

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const prompt = (body.prompt||"").toString().slice(0, 8000);
    const refine = (body.refine||"").toString().slice(0, 2000);
    const blocks = Array.isArray(body.blocks) ? body.blocks.slice(0, 20) : [];
    const theme  = (body.theme||"minimal").toString();

    if(!prompt) return json({ success:false, error:"Missing prompt" }, 400);
    if(!env.OPENAI_API_KEY) return json({ success:false, error:"OPENAI_API_KEY not set" }, 500);

    const metaPrompt = `
You are GENESIS AI - The Ultimate Website Creation Engine. You can build ANY website for ANY purpose.

# CORE DIRECTIVE
Transform ANY idea into a fully functional, professional website that drives results.

# CONTEXT
Original request: "${prompt}"
Refinements: "${refine}"
Requested blocks: ${JSON.stringify(blocks)}
Theme preset: ${theme}

# REQUIREMENTS
- Mobile-first, accessible, SEO-aware.
- Chakra-gradient ONLY for primary CTA emphasis.
- Output MUST be a COMPLETE, valid HTML5 document (single file) with embedded CSS + minimal JS.
- Include semantic structure: header, main sections, footer.
- Include relevant sections from requested blocks (hero, features, gallery, testimonials, pricing, faq, contact).
- Include a prominent CTA above the fold.
- Add basic contact form (name, email, message) with client-side validation.
- Use clean, modern typography and spacing.
- DO NOT include explanations. Return ONLY the HTML.

# STYLE GUIDES
- Keep CSS scoped in <style> in head.
- Use CSS variables for theme; ensure strong contrast.
- For CTA button, use gradient: linear-gradient(90deg,#ef4444,#f97316,#eab308,#22c55e,#3b82f6,#6366f1,#8b5cf6)

# DELIVER
Return ONLY:
<!DOCTYPE html>...full site...
    `.trim();

    const openaiEndpoint = "https://api.openai.com/v1/chat/completions";
    const res = await fetch(openaiEndpoint, {
      method: "POST",
      headers: {
        "content-type":"application/json",
        "authorization":`Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.15,
        top_p: 0.9,
        max_tokens: 3500,
        messages: [
          { role:"system", content:"You are GENESIS AI, the ultimate website creation engine. Respond with a single complete HTML document, nothing else." },
          { role:"user", content: metaPrompt }
        ]
      })
    });

    if(!res.ok){
      const txt = await res.text();
      return json({ success:false, error:"OpenAI error", details: txt }, 500);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    if(!content.includes("<!DOCTYPE html")) {
      return json({ success:false, error:"Invalid HTML returned" }, 500);
    }

    return json({ success:true, html: content });
  } catch (e) {
    return json({ success:false, error: e.message || "Server error" }, 500);
  }
}

function json(obj, status=200){
  return new Response(JSON.stringify(obj), { status, headers:{ "content-type":"application/json; charset=utf-8", "cache-control":"no-store" }});
}
