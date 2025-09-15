// _middleware.js

export async function onRequest(context, next) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Only protect the root / and /edit routes
  if (url.pathname === "/" || url.pathname.startsWith("/edit")) {
    const submittedToken = url.searchParams.get("key") || (await request.formData().then(f => f.get("token")).catch(() => null));

    if (!submittedToken) {
      return new Response(renderLogin(""), { status: 401, headers: { "Content-Type": "text/html" } });
    }

    const validToken = (await env.VIBESCRIPT_SETTINGS.get("ACCESS_TOKEN"))?.trim();
    if (submittedToken.trim() === validToken) {
      return next();
    } else {
      return new Response(renderLogin("Invalid token. Try again."), { status: 403, headers: { "Content-Type": "text/html" } });
    }
  }

  // Pass through for all other routes
  return next();
}

function renderLogin(message) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>VibeScript Builder</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          height: 100vh;
          align-items: center;
          justify-content: center;
          background: #0d1117;
          color: #fff;
        }
        .box {
          background: #161b22;
          padding: 2em;
          border-radius: 8px;
          text-align: center;
        }
        input {
          padding: 0.5em;
          margin: 0.5em 0;
          width: 100%;
        }
        button {
          padding: 0.5em 1em;
          background: #7c3aed;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .error {
          color: #f87171;
          margin-top: 1em;
        }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>🔒 VibeScript Builder</h1>
        <form method="POST">
          <input type="password" name="token" placeholder="Token" required />
          <br/>
          <button type="submit">Continue</button>
        </form>
        <div class="error">${message}</div>
      </div>
    </body>
    </html>
  `;
}
