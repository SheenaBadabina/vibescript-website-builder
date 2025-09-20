// functions/api/generate-site.js
//
// AI Website Generator Endpoint
// Usage: GET /api/generate-site?prompt=hello
// Later: replace dummy generator with actual AI call (OpenAI/Claude).
//

export async function onRequestGet(context) {
  const { request } = context
  const url = new URL(request.url)
  const prompt = url.searchParams.get("prompt") || "default website"

  // TODO: connect to AI provider here (OpenAI, Claude, etc.)
  // For now, return dummy HTML so flow is testable.
  const generatedHTML = `
    <!doctype html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Generated Site</title>
      <style>
        body { font-family: sans-serif; padding: 2rem; background: #0b1220; color: #fff; }
        h1 { color: #22c55e; }
      </style>
    </head>
    <body>
      <h1>Generated Site for: ${prompt}</h1>
      <p>This is a placeholder site generated on ${new Date().toLocaleString()}.</p>
    </body>
    </html>
  `

  return new Response(generatedHTML, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" }
  })
}
