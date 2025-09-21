// functions/dashboard.js
// Server-protected dashboard. Redirects to /signin if no session.
// Renders tier-aware UI. Admin has full access by default.

import { COOKIE, parseCookies, verify } from "./_utils/session.js";

const HTML = ({ email, admin, tier }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Dashboard — VibeScript Builder</title>
  <meta name="theme-color" content="#0b1220"/>
  <link rel="stylesheet" href="/styles.css"/>
  <style>
    .card{background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.1);border-radius:1rem;box-shadow:0 10px 30px rgba(0,0,0,.35);backdrop-filter:blur(8px)}
    .btn{border-radius:.75rem;padding:.7rem 1rem;font-weight:700}
    .btn-primary{background:linear-gradient(90deg,#ec4899,#f59e0b,#2dd4bf);color:#000}
    .btn-ghost{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff}
    .tag{font-size:11px;padding:.15rem .45rem;border-radius:9999px;border:1px solid rgba(255,255,255,.15);color:#cbd5e1}
    .lock{opacity:.45;filter:grayscale(20%)}
    .stat-dot{width:.6rem;height:.6rem;border-radius:9999px}
    .dot-green{background:#10b981}.dot-red{background:#ef4444}.dot-gray{background:#6b7280}
    canvas#waveform{width:100%;height:96px;display:block}
    .section-title{display:flex;align-items:center;gap:.5rem}
  </style>
</head>
<body class="min-h-screen w-full text-gray-200"
  style="background:radial-gradient(120% 120% at 50% -10%, #0b1220 0%, #020409 60%, #000 100%)">

<main class="mx-auto max-w-5xl px-4 py-6 sm:py-10">
  <header class="mb-6 sm:mb-10">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-white">VibeScript Builder — Dashboard</h1>
        <p class="text-sm sm:text-base text-gray-400">Signed in as <span class="font-semibold">${email}</span></p>
      </div>
      <div class="flex items-center gap-2">
        ${admin ? `<span class="tag">Admin</span>` : ""}
        <span class="tag">Tier: ${tier}</span>
        <a class="btn btn-ghost" href="/api/signout">Sign out</a>
      </div>
    </div>
  </header>

  <!-- Admin controls -->
  ${admin ? `
  <section class="card p-4 sm:p-6 mb-6">
    <div class="section-title"><h2 class="text-lg font-semibold text-white">Admin controls</h2><span class="tag">session-scoped</span></div>
    <p class="text-xs text-gray-400 mb-3">Quick tier switch for your current session (Stripe/KV integration coming next).</p>
    <div class="flex flex-wrap gap-2">
      <button class="btn btn-ghost" onclick="upgrade('free')">Set tier: free</button>
      <button class="btn btn-ghost" onclick="upgrade('pro')">Set tier: pro</button>
      <button class="btn btn-ghost" onclick="upgrade('studio')">Set tier: studio</button>
    </div>
    <p id="upgradeStatus" class="mt-2 text-xs text-gray-400"></p>
  </section>` : ``}

  <!-- Recorder & Controls (locked for free unless admin/studio/pro) -->
  <section class="card p-4 sm:p-6 mb-6 ${(!admin && tier==='free') ? 'lock' : ''}">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div class="flex items-center gap-2">
        <span id="statusDot" class="stat-dot dot-gray"></span>
        <span id="statusText" class="text-sm text-gray-300">Idle</span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button id="btnStart" class="btn btn-primary"${(!admin && tier==='free') ? ' disabled title="Pro feature"' : ''}>Start Recording</button>
        <button id="btnStop"  class="btn btn-ghost" disabled>Stop</button>
        <button id="btnReset" class="btn btn-ghost" disabled>Reset</button>
        <span id="timer" class="ml-2 text-xs text-gray-400">00:00</span>
      </div>
    </div>

    <div class="mt-4 rounded-lg border border-white/10 overflow-hidden">
      <canvas id="waveform" width="1200" height="180" aria-label="Audio waveform visualization"></canvas>
    </div>

    <div class="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <audio id="preview" controls class="w-full sm:w-auto hidden"></audio>
      <div class="flex flex-wrap gap-2">
        <button id="btnCopy" class="btn btn-ghost"${(!admin && tier==='free') ? ' disabled title="Pro feature"' : ''}>Copy Transcript</button>
        <button id="btnSave" class="btn btn-ghost" disabled>Save Audio</button>
      </div>
    </div>

    ${(!admin && tier==='free') ? `<p class="mt-3 text-xs text-pink-300">Pro/Studio feature preview — upgrade to unlock.</p>` : ``}
  </section>

  <!-- Transcript -->
  <section class="card p-4 sm:p-6">
    <div class="flex items-center justify-between mb-2">
      <h2 class="text-lg font-semibold text-white">Transcript</h2>
      <span id="srBadge" class="tag">Speech: unknown</span>
    </div>
    <textarea id="transcript" rows="8" class="w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-100 placeholder:text-gray-400 focus:outline-none focus:border-teal-400" placeholder="Your words will appear here in real time when transcription is supported."></textarea>
    <p class="mt-2 text-xs text-gray-400">Tip: On Android/Chrome, Web Speech API usually works. If you see “Speech: unavailable,” waveform + recording still work; you can save audio.</p>
  </section>
</main>

<script>window.__SESSION__=${JSON.stringify({ email, admin, tier })};</script>
<script src="/scripts/dashboard.js"></script>
<script>
async function upgrade(tier){
  const res = await fetch('/api/upgrade?tier='+encodeURIComponent(tier));
  const el = document.getElementById('upgradeStatus');
  if(res.ok){ el.textContent = 'Tier set to ' + tier + '. Reloading…'; setTimeout(()=>location.reload(), 600); }
  else { el.textContent = 'Failed to set tier.'; }
}
</script>
<script src="/scripts/footer-loader.js"></script>
</body>
</html>`;

export async function onRequest({ request, env }) {
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const token = cookies[COOKIE];
  const session = await verify(env, token);
  if (!session) {
    const headers = new Headers({ Location: "/signin" });
    return new Response(null, { status: 302, headers });
  }
  return new Response(HTML(session), { headers: { "content-type": "text/html; charset=UTF-8" }});
}
