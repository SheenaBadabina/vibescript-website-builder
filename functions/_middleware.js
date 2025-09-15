// functions/_middleware.js
// TEMP DEBUG VERSION — remove debug bits after verifying

export async function onRequest(context, next) {
  const { request, env } = context;
  const url = new URL(request.url);

  // enable logging only if ?debug=1 is present
  const DEBUG = url.searchParams.get("debug") === "1";

  // Only protect "/" and "/edit"
  if (url.pathname === "/" || url.pathname.startsWith("/edit")) {
    // token can arrive via ?key=... or form POST (token=...)
    let submittedToken = url.searchParams.get("key");
    if (!submittedToken && request.method === "POST") {
      try {
        const form = await request.formData();
        submittedToken = form.get("token");
      } catch (_) {}
    }

    const storedTokenRaw = await env.VIBESCRIPT_SETTINGS.get("ACCESS_TOKEN");
    const storedToken = storedTokenRaw?.trim() ?? "";

    const sToken = (submittedToken ?? "").trim();

    if (DEBUG) {
      logTokenDiff("submitted", submittedToken);
      logTokenDiff("submitted-trimmed", sToken);
      logTokenDiff("stored", storedTokenRaw);
      logTokenDiff("stored-trimmed", storedToken);
    }

    if (!sToken) {
      return html(renderLogin(""), 401);
    }

    if (sToken === storedToken) {
      return next();
    } else {
      return html(renderLogin("Invalid token. Try again."), 403);
    }
  }

  return next();
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

function renderLogin(message) {
  return `<!doctype html>
<html><head>
  <meta charset="utf-8"/>
  <title>VibeScript Builder</title>
  <style>
    body{font-family:Inter,system-ui,Arial;background:#0d1117;color:#fff;
         height:100vh;display:flex;align-items:center;justify-content:center;margin:0}
    .box{background:#161b22;padding:24px 28px;border-radius:12px;min-width:320px}
    h1{margin:0 0 12px 0}
    input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #30363d;background:#0d1117;color:#fff}
    button{margin-top:12px;padding:10px 14px;border:0;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer}
    .error{color:#f87171;margin-top:10px;min-height:1.2em}
  </style>
</head>
<body>
  <div class="box">
    <h1>🔒 VibeScript Builder</h1>
    <form method="POST">
      <input type="password" name="token" placeholder="Token" autocomplete="current-password" required />
      <button type="submit">Continue</button>
    </form>
    <div class="error">${message}</div>
  </div>
</body></html>`;
}

/** Debug helper: log length and char codes (first/last few) to spot invisible chars */
function logTokenDiff(label, value) {
  const v = value == null ? "" : String(value);
  const len = v.length;
  const head = [...v].slice(0, 5).map(cc);
  const tail = [...v].slice(-5).map(cc);
  const starts = v.slice(0, 1);
  const ends = v.slice(-1);
  console.log(`[token:${label}] len=${len} starts='${safe(starts)}' ends='${safe(ends)}' headCodes=${JSON.stringify(head)} tailCodes=${JSON.stringify(tail)}`);
}
function cc(ch){ return ch.charCodeAt(0); }
function safe(s){ return s.replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t"); }
