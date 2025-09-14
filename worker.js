// worker.js
// --- Bindings expected ---
// KV: VIBESCRIPT_SETTINGS, VIBESCRIPT_PROJECTS
// Secret: ADMIN_KEY  (add in Workers -> Settings -> Variables & Secrets)

// Default site settings used if KV empty
const DEFAULT_SETTINGS = {
  title: "VibeScript Demo",
  tagline: "Turn one idea into momentum.",
  primaryColor: "#7c3aed",
  ctaText: "Get Started",
  ctaLink: "https://vibescript.online",
  features: [
    { title: "Fast", text: "Launch a clean page in minutes." },
    { title: "Flexible", text: "Tweak colors, copy, and layout." },
    { title: "Hosted", text: "Served on Cloudflare’s global edge." },
  ],
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      // Routes
      if (url.pathname === "/") {
        const settings = await getSettings(env);
        return renderPublicSite(settings);
      }

      if (url.pathname === "/edit") {
        // optional soft gate: require header or preview subdomain if you want
        const settings = await getSettings(env);
        return renderEditor(settings);
      }

      // API: settings
      if (url.pathname === "/api/settings") {
        if (request.method === "GET") {
          const settings = await getSettings(env);
          return json(settings);
        }
        if (request.method === "POST" || request.method === "PUT") {
          await requireAdmin(request, env);
          const payload = await readJson(request);
          validateSettings(payload);
          await env.VIBESCRIPT_SETTINGS.put("site", JSON.stringify(payload));
          return json({ ok: true });
        }
      }

      // API: projects
      if (url.pathname === "/api/projects") {
        if (request.method === "GET") {
          const list = await listProjects(env, url.searchParams);
          return json(list);
        }
        if (request.method === "POST") {
          await requireAdmin(request, env);
          const incoming = await readJson(request);
          const saved = await saveProject(env, incoming);
          return json(saved, 201);
        }
      }

      // 404
      return new Response("Not found", { status: 404 });
    } catch (err) {
      // Log to help debug
      console.error("Worker error:", err?.stack || err);
      return new Response("Internal Error", { status: 500 });
    }
  },
};

/* ----------------- Helpers ----------------- */

async function getSettings(env) {
  const raw = await env.VIBESCRIPT_SETTINGS.get("site");
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    // fill any missing keys with defaults so UI never breaks
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function validateSettings(obj) {
  if (!obj || typeof obj !== "object") throw new Error("Invalid settings");
  if (!Array.isArray(obj.features)) obj.features = [];
  // Basic safety trims
  obj.title = String(obj.title || "").slice(0, 120);
  obj.tagline = String(obj.tagline || "").slice(0, 240);
  obj.primaryColor = String(obj.primaryColor || DEFAULT_SETTINGS.primaryColor);
  obj.ctaText = String(obj.ctaText || "");
  obj.ctaLink = String(obj.ctaLink || "");
  obj.features = obj.features.map((f) => ({
    title: String(f.title || "").slice(0, 80),
    text: String(f.text || "").slice(0, 500),
  }));
}

async function requireAdmin(request, env) {
  const key = request.headers.get("X-Admin-Key") || "";
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

async function readJson(request) {
  const text = await request.text();
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new Response("Bad JSON", { status: 400 });
  }
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

/* -------- Projects (KV) --------
   Stored as keys: project:<id>  value: JSON
   plus an index list under key: project_index (array of ids)
---------------------------------- */

async function listProjects(env, params) {
  const prefix = "project:";
  const list = await env.VIBESCRIPT_PROJECTS.list({ prefix });
  const ids = list.keys.map((k) => k.name.slice(prefix.length));
  // Fetch brief records; for large sets you’d paginate
  const items = [];
  for (const id of ids) {
    const raw = await env.VIBESCRIPT_PROJECTS.get(prefix + id);
    if (!raw) continue;
    try {
      const p = JSON.parse(raw);
      items.push({ id, name: p.name, createdAt: p.createdAt });
    } catch {}
  }
  // optional basic sort newest first
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return { items };
}

async function saveProject(env, incoming) {
  const now = Date.now();
  const id = String(incoming.id || cryptoRandomId());
  const project = {
    id,
    name: String(incoming.name || "Untitled").slice(0, 120),
    settings: incoming.settings && typeof incoming.settings === "object" ? incoming.settings : null,
    createdAt: incoming.createdAt || now,
    updatedAt: now,
  };
  await env.VIBESCRIPT_PROJECTS.put("project:" + id, JSON.stringify(project));
  return project;
}

function cryptoRandomId() {
  // 16 chars base36
  const a = crypto.getRandomValues(new Uint32Array(2));
  return (a[0].toString(36) + a[1].toString(36)).slice(0, 16);
}

/* --------------- HTML --------------- */

function renderPublicSite(s) {
  const feat = (s.features || [])
    .map(
      (f) => `
        <div class="card">
          <div class="card-title">${escapeHtml(f.title)}</div>
          <div class="card-text">${escapeHtml(f.text)}</div>
        </div>`
    )
    .join("");

  const btnStyle = `--accent:${s.primaryColor || "#7c3aed"};`;

  return htmlPage(
    `${escapeHtml(s.title)}`,
    `
    <header class="brand">VibeScript</header>
    <main class="container">
      <section class="hero">
        <h1>${escapeHtml(s.title)}</h1>
        <p class="tagline">${escapeHtml(s.tagline)}</p>
        <a class="cta" style="${btnStyle}" href="${escapeAttr(s.ctaLink)}">${escapeHtml(s.ctaText)}</a>
      </section>

      <section class="features">
        ${feat}
      </section>
    </main>`,
    baseStyles()
  );
}

function renderEditor(s) {
  // Simple, thumb-friendly editor; posts JSON to /api/settings with X-Admin-Key
  const safe = escapeHtml(JSON.stringify(s, null, 2));
  return htmlPage(
    "VibeScript Builder",
    `
    <a class="chip" href="/">● VibeScript Builder</a>
    <h1>Edit Site Settings</h1>
    <p class="muted">Update content and colors, then <b>Save</b>. Changes apply immediately.</p>

    <form id="form" class="form">
      <label>Site title
        <input name="title" value="${escapeAttr(s.title)}" required />
      </label>

      <label>Primary color
        <input name="primaryColor" value="${escapeAttr(s.primaryColor)}" placeholder="#7c3aed" />
      </label>

      <label>Tagline
        <input name="tagline" value="${escapeAttr(s.tagline)}" />
      </label>

      <label>CTA text
        <input name="ctaText" value="${escapeAttr(s.ctaText)}" />
      </label>

      <label>CTA link
        <input name="ctaLink" value="${escapeAttr(s.ctaLink)}" />
      </label>

      <h2>Features</h2>
      <div id="features"></div>
      <button class="btn ghost" id="addFeature" type="button">+ Add Feature</button>

      <details class="raw">
        <summary>Raw JSON (advanced)</summary>
        <textarea id="raw" rows="12">${safe}</textarea>
        <button class="btn ghost" id="applyRaw" type="button">Apply JSON above</button>
      </details>

      <div class="actions">
        <button class="btn" id="save" type="submit">Save</button>
        <a class="btn link" href="/">View Site</a>
      </div>
    </form>

    <script type="module">
      const adminKey = localStorage.getItem("vs_admin_key") || "";
      const form = document.querySelector("#form");
      const feats = document.querySelector("#features");
      const raw = document.querySelector("#raw");
      const addBtn = document.querySelector("#addFeature");
      const applyRaw = document.querySelector("#applyRaw");

      let state = ${JSON.stringify(s)};

      function renderFeatures(){
        feats.innerHTML = "";
        state.features.forEach((f, i)=>{
          const wrap = document.createElement("div");
          wrap.className = "feature";
          wrap.innerHTML = \`
            <label>Title<input data-i="\${i}" data-k="title" value="\${escape(f.title)}"/></label>
            <label>Description<textarea data-i="\${i}" data-k="text" rows="3">\${escape(f.text)}</textarea></label>
            <div class="row">
              <button class="btn ghost danger" data-del="\${i}" type="button">Delete</button>
            </div>
          \`;
          feats.appendChild(wrap);
        });
      }

      function escape(str){ return String(str ?? "").replace(/[&<>"']/g, s=>({ "&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;" }[s])); }

      feats.addEventListener("input", (e)=>{
        const i = +e.target.dataset.i; const k = e.target.dataset.k;
        if(!Number.isInteger(i)) return;
        state.features[i][k] = e.target.value;
        raw.value = JSON.stringify(state, null, 2);
      });

      feats.addEventListener("click",(e)=>{
        const idx = e.target.dataset.del;
        if(idx===undefined) return;
        state.features.splice(+idx,1);
        raw.value = JSON.stringify(state, null, 2);
        renderFeatures();
      });

      addBtn.addEventListener("click", ()=>{
        state.features.push({ title: "New Feature", text: "Describe it…" });
        raw.value = JSON.stringify(state, null, 2);
        renderFeatures();
      });

      applyRaw.addEventListener("click", ()=>{
        try{
          state = JSON.parse(raw.value);
          if(!Array.isArray(state.features)) state.features = [];
          bindForm(state);
          renderFeatures();
        }catch(err){ alert("Bad JSON"); }
      });

      function bindForm(s){
        form.title.value = s.title || "";
        form.primaryColor.value = s.primaryColor || "";
        form.tagline.value = s.tagline || "";
        form.ctaText.value = s.ctaText || "";
        form.ctaLink.value = s.ctaLink || "";
      }

      form.addEventListener("input", ()=>{
        state.title = form.title.value;
        state.primaryColor = form.primaryColor.value;
        state.tagline = form.tagline.value;
        state.ctaText = form.ctaText.value;
        state.ctaLink = form.ctaLink.value;
        raw.value = JSON.stringify(state, null, 2);
      });

      form.addEventListener("submit", async (e)=>{
        e.preventDefault();
        const key = adminKey || prompt("Admin key (saved to device):") || "";
        if(!key) return;
        localStorage.setItem("vs_admin_key", key);
        const res = await fetch("/api/settings", {
          method: "POST",
          headers: { "content-type": "application/json", "X-Admin-Key": key },
          body: JSON.stringify(state),
        });
        if(res.ok){ alert("Saved!"); }
        else { alert("Save failed: " + (await res.text())); }
      });

      // init
      bindForm(state);
      renderFeatures();
      raw.value = JSON.stringify(state, null, 2);
    </script>
    `,
    editorStyles()
  );
}

function htmlPage(title, body, css) {
  return new Response(
    `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${title}</title>
<style>${css}</style>
<body>
${body}
</body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}

/* ---- Styles (hard-coded gradient kept) ---- */

function baseStyles() {
  return `
:root { --bg1:#0b0b12; --bg2:#141427; --card:#1b1b33; --text:#e7e7f0; --muted:#a9a9c6; }
*{box-sizing:border-box} body{margin:0;color:var(--text);font:16px/1.5 system-ui,Segoe UI,Roboto,Arial}
.brand{position:fixed;top:10px;left:14px;font-weight:700;opacity:.7}
.container{max-width:960px;margin:0 auto;padding:72px 20px}
body{background:linear-gradient(180deg,#0a0812 0%, #17142a 40%, #0a0812 100%) fixed}
.hero h1{font-size:clamp(32px,6vw,48px);margin:0 0 8px}
.tagline{color:var(--muted);margin:0 0 18px}
.cta{display:inline-block;padding:12px 18px;border-radius:12px;background:var(--accent,#7c3aed);color:white;text-decoration:none;font-weight:700}
.features{display:grid;gap:14px;margin-top:28px}
.card{background:var(--card);border:1px solid #2b2b4a;border-radius:14px;padding:16px}
.card-title{font-weight:800;margin:0 0 6px}
.card-text{color:var(--muted)}
@media(min-width:720px){ .features{grid-template-columns:1fr;}}
`;
}

function editorStyles() {
  return `
:root{--bg1:#0a0a14;--panel:#14142a;--ink:#ececf3;--muted:#a9a9c6;--accent:#7c3aed}
*{box-sizing:border-box} body{margin:0;background:linear-gradient(180deg,#0a0812 0%, #17142a 40%, #0a0812 100%) fixed;color:var(--ink);font:16px/1.5 system-ui,Segoe UI,Roboto,Arial}
.container{max-width:960px;margin:0 auto;padding:24px}
h1{font-size:clamp(26px,5vw,34px);margin:12px 12px 8px}
.muted{color:var(--muted);margin:0 12px 16px}
.chip{display:inline-block;margin:16px 12px;background:#1d1b32;border:1px solid #2b2b4a;color:#cfcff6;text-decoration:none;padding:8px 10px;border-radius:14px}
.form{background:transparent;padding:12px 12px 80px}
label{display:block;margin:12px 0;color:#cfcff6}
input,textarea{width:100%;background:#14132a;border:1px solid #2b2b4a;color:var(--ink);border-radius:12px;padding:12px 12px}
textarea{resize:vertical}
.feature{background:#121126;border:1px solid #2b2b4a;border-radius:14px;padding:12px;margin:12px 0}
.btn{appearance:none;border:0;border-radius:14px;background:var(--accent);color:white;padding:12px 16px;font-weight:700;cursor:pointer}
.btn.ghost{background:transparent;border:1px solid #2b2b4a;color:#d9d9ff}
.btn.ghost.danger{border-color:#513; color:#fcd}
.btn.link{background:transparent;color:#cfcff6;text-decoration:none;border:1px solid #2b2b4a}
.actions{display:flex;gap:12px;align-items:center;margin:16px 0}
.raw{margin-top:18px}
.summary{cursor:pointer}
`;
}

/* ---- tiny HTML escaping ---- */
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
}
function escapeAttr(s){ return escapeHtml(s); }
