// worker.js — VibeScript + Projects (KV-backed) — drop-in full file

/**
 * Bindings expected:
 * - VIBESCRIPT_SETTINGS  (KV)  — already set up
 * - VIBESCRIPT_PROJECTS  (KV)  — you created this
 * - ADMIN_KEY            (secret) — for write access
 *
 * Routes:
 *   GET    /              -> Landing page (gradient UI)
 *   GET    /edit          -> Builder UI (edits site settings)
 *   GET    /api/settings  -> JSON settings
 *   PUT    /api/settings  -> Save settings (auth)
 *
 *   GET    /projects      -> Minimal projects UI (list + create)
 *   GET    /api/projects  -> List projects (JSON)
 *   POST   /api/projects  -> Create project (auth)
 *   PUT    /api/projects/:id     -> Update (auth)
 *   DELETE /api/projects/:id     -> Delete (auth)
 */

const DEFAULT_SETTINGS_KEY = "site";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization, x-admin-key",
  "access-control-allow-methods": "GET,PUT,POST,DELETE,OPTIONS",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS });
    }

    // Router
    if (pathname === "/") return landing(env);
    if (pathname === "/edit") return builderUI(env);

    if (pathname === "/api/settings") {
      if (request.method === "GET") return getSettings(env);
      if (request.method === "PUT") return requireAdmin(env, request, saveSettings);
    }

    if (pathname === "/projects") return projectsPage(env, request);

    if (pathname === "/api/projects") {
      if (request.method === "GET") return listProjects(env, request);
      if (request.method === "POST") return requireAdmin(env, request, createProject);
    }

    const projIdMatch = pathname.match(/^\/api\/projects\/([a-zA-Z0-9_-]+)$/);
    if (projIdMatch) {
      const id = projIdMatch[1];
      if (request.method === "PUT") return requireAdmin(env, request, (env2, req2) => updateProject(env2, req2, id));
      if (request.method === "DELETE") return requireAdmin(env, request, (env2, req2) => deleteProject(env2, req2, id));
    }

    return new Response("Not found", { status: 404, headers: { "content-type": "text/plain", ...CORS } });
  },
};

/* ------------------- Auth helper ------------------- */
function requireAdmin(env, request, handler) {
  const headerKey = request.headers.get("x-admin-key") || "";
  const auth = request.headers.get("authorization") || ""; // allow "Bearer <key>"
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const cookie = (request.headers.get("cookie") || "").split(/;\s*/).find(c => c.startsWith("admin_key="));
  const cookieVal = cookie ? decodeURIComponent(cookie.split("=")[1]) : "";

  const provided = headerKey || bearer || cookieVal;
  if (!provided || provided !== env.ADMIN_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json", ...CORS },
    });
  }
  return handler(env, request);
}

/* ------------------- Settings ------------------- */
async function getSettings(env) {
  const raw = await env.VIBESCRIPT_SETTINGS.get(DEFAULT_SETTINGS_KEY, "json");
  const settings = raw || {
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
  return json(settings);
}

async function saveSettings(env, request) {
  const body = await safeJSON(request);
  if (!body) return bad("Invalid JSON");

  // very light validation
  body.title = String(body.title ?? "").slice(0, 120) || "VibeScript Demo";
  body.tagline = String(body.tagline ?? "").slice(0, 240);
  body.primaryColor = String(body.primaryColor ?? "#7c3aed");
  body.ctaText = String(body.ctaText ?? "Get Started").slice(0, 40);
  body.ctaLink = String(body.ctaLink ?? "").slice(0, 2048);
  if (!Array.isArray(body.features)) body.features = [];
  body.features = body.features.slice(0, 12).map(f => ({
    title: String(f.title ?? "").slice(0, 60),
    text: String(f.text ?? "").slice(0, 280),
  }));

  await env.VIBESCRIPT_SETTINGS.put(DEFAULT_SETTINGS_KEY, JSON.stringify(body));
  return json({ ok: true });
}

/* ------------------- Projects (KV) ------------------- */

const PROJECT_INDEX = "project_index"; // stores list of IDs

async function listProjects(env) {
  const ids = (await env.VIBESCRIPT_PROJECTS.get(PROJECT_INDEX, "json")) || [];
  const items = [];
  for (const id of ids) {
    const p = await env.VIBESCRIPT_PROJECTS.get(`project:${id}`, "json");
    if (p) items.push(p);
  }
  return json({ items });
}

async function createProject(env, request) {
  const input = await safeJSON(request);
  if (!input || !input.name) return bad("Missing 'name'");

  const id = slug(`${input.name}-${Date.now()}`);
  const project = {
    id,
    name: String(input.name).slice(0, 120),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "draft",
    // room for prompts, page schema, etc.
    data: input.data || {},
  };

  let ids = (await env.VIBESCRIPT_PROJECTS.get(PROJECT_INDEX, "json")) || [];
  if (!ids.includes(id)) {
    ids.unshift(id);
    ids = ids.slice(0, 500); // cap list
  }

  await Promise.all([
    env.VIBESCRIPT_PROJECTS.put(`project:${id}`, JSON.stringify(project)),
    env.VIBESCRIPT_PROJECTS.put(PROJECT_INDEX, JSON.stringify(ids)),
  ]);

  return json({ ok: true, project });
}

async function updateProject(env, request, id) {
  const existing = await env.VIBESCRIPT_PROJECTS.get(`project:${id}`, "json");
  if (!existing) return notFound();

  const patch = await safeJSON(request);
  if (!patch) return bad("Invalid JSON");

  const updated = {
    ...existing,
    name: patch.name ? String(patch.name).slice(0, 120) : existing.name,
    status: patch.status ?? existing.status,
    data: patch.data ?? existing.data,
    updatedAt: new Date().toISOString(),
  };

  await env.VIBESCRIPT_PROJECTS.put(`project:${id}`, JSON.stringify(updated));
  return json({ ok: true, project: updated });
}

async function deleteProject(env, _request, id) {
  let ids = (await env.VIBESCRIPT_PROJECTS.get(PROJECT_INDEX, "json")) || [];
  ids = ids.filter(x => x !== id);
  await Promise.all([
    env.VIBESCRIPT_PROJECTS.delete(`project:${id}`),
    env.VIBESCRIPT_PROJECTS.put(PROJECT_INDEX, JSON.stringify(ids)),
  ]);
  return json({ ok: true, id });
}

/* ------------------- HTML UIs ------------------- */

async function landing(env) {
  const res = await getSettings(env);
  const s = await res.json();

  const color = s.primaryColor || "#7c3aed";
  const featureCards = (s.features || []).map(f => `
    <div class="card">
      <div class="card-title">${escapeHTML(f.title)}</div>
      <div class="card-text">${escapeHTML(f.text)}</div>
    </div>`).join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHTML(s.title)}</title>
<style>
:root { --accent: ${color}; }
*{box-sizing:border-box}body{margin:0;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;color:#e9e7f7;background:#0b0c12}
.hero{
  min-height:60vh;padding:64px 24px;background:
  radial-gradient(1200px 600px at -10% -10%, #2a1a55 0%, transparent 60%),
  radial-gradient(1000px 500px at 110% -20%, #1b2b59 0%, transparent 60%),
  linear-gradient(180deg, #0b0c12 0%, #0b0c12 60%, #0b0c12 100%);
}
.container{max-width:1000px;margin:0 auto}
.badge{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;
  background:#16182a;border:1px solid #252645;border-radius:999px;color:#bdb9ff;font-weight:600}
.edit{margin-left:auto}
h1{margin:24px 0 8px;font-size:48px;line-height:1.05}
p.lead{margin:0 0 24px;color:#cac7f4;font-size:18px}
.button{display:inline-block;padding:12px 18px;border-radius:12px;background:var(--accent);color:white;font-weight:700;text-decoration:none}
.grid{display:grid;gap:16px;margin-top:28px}
@media (min-width:700px){.grid{grid-template-columns:repeat(3,1fr)}}
.card{padding:18px;border-radius:16px;background:linear-gradient(180deg,#1a1b2a, #171827);box-shadow: inset 0 0 0 1px #252645}
.card-title{font-weight:800;margin-bottom:6px}
.card-text{color:#bdb9ff}
.nav{display:flex;align-items:center;gap:12px}
.nav a{color:#bdb9ff;text-decoration:underline}
</style>
</head>
<body>
  <section class="hero">
    <div class="container">
      <div class="nav">
        <span class="badge">● VibeScript</span>
        <a href="/projects">Projects</a>
        <a href="/edit" class="edit">Edit</a>
      </div>
      <h1>${escapeHTML(s.title)}</h1>
      <p class="lead">${escapeHTML(s.tagline)}</p>
      <a class="button" href="${escapeAttr(s.ctaLink || "#")}">${escapeHTML(s.ctaText || "Get Started")}</a>
      <div class="grid">${featureCards}</div>
    </div>
  </section>
</body>
</html>`;
  return htmlRes(html);
}

function builderUI(env) {
  // A lightweight builder that reads/writes /api/settings
  const html = `<!doctype html><html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>VibeScript Builder</title>
<style>
body{margin:0;background:#0b0c12;color:#e9e7f7;font-family:ui-sans-serif,system-ui}
.wrap{max-width:900px;margin:0 auto;padding:28px}
h1{font-size:36px;margin:12px 0 4px}
p.muted{color:#bdb9ff}
.card{background:linear-gradient(180deg,#171827,#141524);border:1px solid #252645;border-radius:16px;padding:16px;margin:16px 0}
.row{display:grid;gap:12px}
@media(min-width:720px){.row{grid-template-columns:1fr 1fr}}
label{display:block;font-weight:700;margin-bottom:4px}
input,textarea{width:100%;background:#0f1020;border:1px solid #2a2b44;color:#e9e7f7;border-radius:10px;padding:10px}
.small{font-size:12px;color:#9a98c9}
.btns{display:flex;gap:12px;margin-top:12px}
button,a.btn{background:#7c3aed;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:800;text-decoration:none;display:inline-flex;align-items:center;gap:8px}
.feature{border:1px dashed #2a2b44;border-radius:12px;padding:12px;margin:10px 0}
</style>
</head><body>
  <div class="wrap">
    <a href="/" class="btn">← View Site</a>
    <h1>Edit Site Settings</h1>
    <p class="muted">Update content and colors, then <b>Save</b>. Changes apply immediately.</p>

    <div class="card">
      <div class="row">
        <div>
          <label>Site title</label>
          <input id="title" />
        </div>
        <div>
          <label>Primary color</label>
          <input id="primaryColor" placeholder="#7c3aed"/>
        </div>
      </div>
      <div class="row">
        <div>
          <label>Tagline</label>
          <input id="tagline"/>
        </div>
        <div>
          <label>CTA link</label>
          <input id="ctaLink" placeholder="https://..."/>
        </div>
      </div>
      <div class="row">
        <div>
          <label>CTA text</label>
          <input id="ctaText" placeholder="Get Started"/>
        </div>
        <div>
          <label class="small">Admin key (for saving)</label>
          <input id="adminKey" placeholder="Paste ADMIN_KEY to save"/>
        </div>
      </div>

      <h3>Features</h3>
      <div id="features"></div>
      <div class="btns">
        <button id="addFeature">+ Add Feature</button>
        <button id="save">Save</button>
      </div>
    </div>

    <details class="card"><summary>Raw JSON (advanced)</summary>
      <textarea id="json" rows="12" spellcheck="false"></textarea>
      <div class="btns"><button id="apply">Apply JSON above</button></div>
    </details>
  </div>

<script>
const $ = sel => document.querySelector(sel);
const api = p => fetch(p).then(r=>r.json());

function featureBlock(f={}, i){
  return \`<div class="feature" data-i="\${i}">
    <label>Title</label>
    <input class="f-title" value="\${(f.title||"").replace(/"/g,'&quot;')}"/>
    <label>Text</label>
    <textarea class="f-text" rows="2">\${(f.text||"")}</textarea>
  </div>\`;
}

function readUI(){
  const features = [...document.querySelectorAll('.feature')].map(el => ({
    title: el.querySelector('.f-title').value,
    text: el.querySelector('.f-text').value
  }));
  return {
    title: $('#title').value,
    tagline: $('#tagline').value,
    primaryColor: $('#primaryColor').value || '#7c3aed',
    ctaText: $('#ctaText').value || 'Get Started',
    ctaLink: $('#ctaLink').value || '#',
    features
  };
}

function writeUI(s){
  $('#title').value = s.title||'';
  $('#tagline').value = s.tagline||'';
  $('#primaryColor').value = s.primaryColor||'#7c3aed';
  $('#ctaText').value = s.ctaText||'Get Started';
  $('#ctaLink').value = s.ctaLink||'#';
  $('#features').innerHTML = (s.features||[]).map((f,i)=>featureBlock(f,i)).join('');
  $('#json').value = JSON.stringify(s, null, 2);
}

async function load(){
  const s = await api('/api/settings');
  writeUI(s);
}
$('#addFeature').onclick = () => {
  const s = readUI();
  s.features.push({title:'New', text:'Describe it...'});
  writeUI(s);
};
$('#apply').onclick = () => {
  try{ writeUI(JSON.parse($('#json').value)); }catch(e){ alert('Invalid JSON'); }
};
$('#save').onclick = async () => {
  const key = $('#adminKey').value.trim();
  if(!key){ alert('Paste ADMIN_KEY to save.'); return; }
  const s = readUI();
  const res = await fetch('/api/settings', {
    method:'PUT',
    headers: {'content-type':'application/json','x-admin-key': key},
    body: JSON.stringify(s)
  });
  if(res.ok){ alert('Saved!'); } else { alert('Save failed'); }
};
load();
</script>
</body></html>`;
  return htmlRes(html);
}

async function projectsPage(env, request) {
  const list = await listProjects(env, request);
  const { items } = await list.json();

  const rows = items.map(p => `
    <tr>
      <td>${escapeHTML(p.name)}</td>
      <td class="muted">${new Date(p.updatedAt).toLocaleString()}</td>
      <td><code>${p.id}</code></td>
    </tr>`).join("");

  const html = `<!doctype html><html><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Projects • VibeScript</title>
<style>
body{margin:0;background:#0b0c12;color:#e9e7f7;font-family:ui-sans-serif,system-ui}
.wrap{max-width:900px;margin:0 auto;padding:28px}
h1{font-size:32px;margin:0 0 8px}
.muted{color:#9a98c9}
.card{background:linear-gradient(180deg,#171827,#141524);border:1px solid #252645;border-radius:16px;padding:16px;margin:16px 0}
input{width:100%;background:#0f1020;border:1px solid #2a2b44;color:#e9e7f7;border-radius:10px;padding:10px}
button{background:#7c3aed;color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:800}
table{width:100%;border-collapse:collapse}
td,th{padding:10px;border-bottom:1px solid #252645}
a{color:#bdb9ff}
.row{display:grid;gap:12px}
@media(min-width:720px){.row{grid-template-columns:2fr 1fr}}
</style>
</head><body>
  <div class="wrap">
    <a href="/" class="muted">← Back</a>
    <h1>Projects</h1>
    <p class="muted">Quick list of saved ideas.</p>

    <div class="card">
      <div class="row">
        <input id="pname" placeholder="Project name (e.g., ‘Jenna’s Bakery Landing’)"/>
        <input id="akey" placeholder="ADMIN_KEY to create"/>
      </div>
      <div style="margin-top:12px"><button id="create">Create Project</button></div>
    </div>

    <div class="card">
      <table>
        <thead><tr><th>Name</th><th>Updated</th><th>ID</th></tr></thead>
        <tbody>${rows || "<tr><td colspan='3' class='muted'>No projects yet.</td></tr>"}</tbody>
      </table>
    </div>
  </div>
<script>
document.getElementById('create').onclick = async () => {
  const name = document.getElementById('pname').value.trim();
  const key = document.getElementById('akey').value.trim();
  if(!name || !key){ alert('Enter name and ADMIN_KEY'); return; }
  const res = await fetch('/api/projects', {
    method:'POST',
    headers:{'content-type':'application/json','x-admin-key':key},
    body: JSON.stringify({ name })
  });
  if(res.ok){ location.reload(); } else { alert('Create failed'); }
};
</script>
</body></html>`;
  return htmlRes(html);
}

/* ------------------- utils ------------------- */
function json(obj, status=200, extraHeaders={}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", ...CORS, ...extraHeaders },
  });
}
function bad(msg){ return json({ error: msg }, 400); }
function notFound(){ return json({ error: "Not found" }, 404); }
async function safeJSON(req){ try{ return await req.json(); }catch{ return null; } }
function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) || Math.random().toString(36).slice(2,10); }
function escapeHTML(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAttr(s){ return escapeHTML(s); }
function htmlRes(html){ return new Response(html, { headers: { "content-type":"text/html; charset=utf-8", ...CORS } }); }
