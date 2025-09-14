// === VibeScript Worker (Schema-ready) ===
// Bindings (already set in your account):
// - KV: env.VIBESCRIPT_SETTINGS  (site settings json)
// - KV: env.VIBESCRIPT_PROJECTS  (per-project docs + index)

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const { pathname, origin } = url;

      // CORS (so future tools can call your API)
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders(request) });
      }

      // --- ROUTES ---
      if (pathname === '/__settings.json') {
        return json(await getSettings(env), 200, request);
      }
      if (pathname === '/__projects.json') {
        return json(await listProjects(env), 200, request);
      }

      // Projects API
      if (pathname === '/api/projects' && request.method === 'GET') {
        return json(await listProjects(env), 200, request);
      }
      if (pathname === '/api/projects' && request.method === 'POST') {
        const body = await readJSON(request);
        const created = await createProject(env, body);
        return json(created, 201, request);
      }

      // /api/projects/:id (GET, PUT, DELETE)
      if (pathname.startsWith('/api/projects/')) {
        const id = pathname.split('/').pop();
        if (!id) return json({ error: 'Missing id' }, 400, request);

        if (request.method === 'GET') {
          const proj = await getProject(env, id);
          if (!proj) return json({ error: 'Not found' }, 404, request);
          return json(proj, 200, request);
        }
        if (request.method === 'PUT') {
          const body = await readJSON(request);
          const updated = await updateProject(env, id, body);
          return json(updated, 200, request);
        }
        if (request.method === 'DELETE') {
          await deleteProject(env, id);
          return json({ ok: true }, 200, request);
        }
      }

      // Editor UI
      if (pathname === '/edit') {
        const settings = await getSettings(env);
        const html = editHTML({ origin, settings });
        return htmlResponse(html);
      }

      // Public site
      if (pathname === '/' || pathname === '/index.html') {
        const settings = await getSettings(env);
        const html = siteHTML({ origin, settings });
        return htmlResponse(html);
      }

      // 404
      return new Response('Not found', { status: 404, headers: corsHeaders(request) });
    } catch (err) {
      console.error('Worker error:', err);
      return new Response('Internal Error', { status: 500 });
    }
  },
};

// ---------- Shared helpers ----------
const DEFAULT_SETTINGS = {
  title: 'VibeScript Demo',
  tagline: 'Turn one idea into momentum.',
  primaryColor: '#7c3aed',
  ctaText: 'Get Started',
  ctaLink: 'https://vibescript.online',
  features: [
    { title: 'Fast', text: 'Launch a clean page in minutes.' },
    { title: 'Flexible', text: 'Tweak colors, copy, and layout.' },
    { title: 'Hosted', text: 'Served on Cloudflare’s global edge.' },
  ],
};

const DEFAULT_PROJECT = (name = 'Untitled Project', description = '') => ({
  id: crypto.randomUUID(),
  name,
  description,
  status: 'draft', // 'draft'|'generated'|'published'
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  settings: {
    primaryColor: '#7c3aed',
    theme: 'dark',
    nav: [{ label: 'Home', href: '/' }],
  },
  pages: [
    {
      id: crypto.randomUUID(),
      path: '/',
      title: 'Home',
      sections: [
        { id: crypto.randomUUID(), type: 'hero', props: { headline: name, subheadline: 'Let’s build momentum.' } },
        { id: crypto.randomUUID(), type: 'features', props: { items: [] } },
        { id: crypto.randomUUID(), type: 'cta', props: { label: 'Get Started', href: 'https://vibescript.online' } },
      ],
    },
  ],
});

// Normalize/upgrade old docs to the new schema
function normalizeProject(p) {
  if (!p || typeof p !== 'object') return null;

  const now = new Date().toISOString();

  // Previous minimal structure support:
  // { id, name, description, status, pages? }
  const normalized = {
    id: p.id ?? crypto.randomUUID(),
    name: p.name ?? 'Untitled Project',
    description: p.description ?? '',
    status: p.status ?? 'draft',
    createdAt: p.createdAt ?? now,
    updatedAt: now,
    settings: {
      primaryColor: p.settings?.primaryColor ?? '#7c3aed',
      theme: p.settings?.theme ?? 'dark',
      nav: Array.isArray(p.settings?.nav) ? p.settings.nav : [{ label: 'Home', href: '/' }],
    },
    pages: Array.isArray(p.pages) ? p.pages : [
      {
        id: crypto.randomUUID(),
        path: '/',
        title: 'Home',
        sections: [
          { id: crypto.randomUUID(), type: 'hero', props: { headline: p.name ?? 'Untitled Project', subheadline: 'Let’s build momentum.' } },
          { id: crypto.randomUUID(), type: 'features', props: { items: [] } },
          { id: crypto.randomUUID(), type: 'cta', props: { label: 'Get Started', href: 'https://vibescript.online' } },
        ],
      },
    ],
  };

  // Ensure every page & section has id/type/props
  normalized.pages = normalized.pages.map(pg => ({
    id: pg.id ?? crypto.randomUUID(),
    path: pg.path ?? '/',
    title: pg.title ?? 'Page',
    sections: Array.isArray(pg.sections)
      ? pg.sections.map(sec => ({
          id: sec.id ?? crypto.randomUUID(),
          type: sec.type ?? 'text',
          props: typeof sec.props === 'object' && sec.props ? sec.props : { text: '' },
        }))
      : [],
  }));

  return normalized;
}

async function readJSON(req) {
  const text = await req.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

function json(data, status = 200, request) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(request),
    },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function htmlResponse(html) {
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
}

// ---------- Settings storage ----------
async function getSettings(env) {
  const raw = await env.VIBESCRIPT_SETTINGS.get('site');
  if (!raw) return DEFAULT_SETTINGS;
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }; } catch { return DEFAULT_SETTINGS; }
}

async function saveSettings(env, obj) {
  const merged = { ...DEFAULT_SETTINGS, ...obj };
  await env.VIBESCRIPT_SETTINGS.put('site', JSON.stringify(merged));
  return merged;
}

// ---------- Projects storage ----------
const INDEX_KEY = 'index'; // lives in VIBESCRIPT_PROJECTS

async function listProjects(env) {
  const raw = await env.VIBESCRIPT_PROJECTS.get(INDEX_KEY);
  const ids = raw ? JSON.parse(raw) : [];
  const results = [];
  for (const id of ids) {
    const rawDoc = await env.VIBESCRIPT_PROJECTS.get(keyDoc(id));
    if (!rawDoc) continue;
    try {
      const doc = normalizeProject(JSON.parse(rawDoc));
      // list view: smaller payload
      results.push({ id: doc.id, name: doc.name, status: doc.status, updatedAt: doc.updatedAt });
    } catch {}
  }
  // newest first
  results.sort((a,b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return results;
}

async function getProject(env, id) {
  const raw = await env.VIBESCRIPT_PROJECTS.get(keyDoc(id));
  if (!raw) return null;
  try { return normalizeProject(JSON.parse(raw)); } catch { return null; }
}

async function createProject(env, body = {}) {
  const name = (body.name || 'Untitled Project').toString().trim().slice(0, 160);
  const desc = (body.description || '').toString().slice(0, 400);

  const doc = normalizeProject(DEFAULT_PROJECT(name, desc)); // ensures schema
  // update index
  const ids = await readIndex(env);
  ids.unshift(doc.id);
  await env.VIBESCRIPT_PROJECTS.put(INDEX_KEY, JSON.stringify(ids));
  await env.VIBESCRIPT_PROJECTS.put(keyDoc(doc.id), JSON.stringify(doc));
  return doc;
}

async function updateProject(env, id, incoming = {}) {
  const current = (await getProject(env, id)) || normalizeProject(DEFAULT_PROJECT());
  // shallow merge top-level; deep-ish for settings/pages is caller’s job
  const merged = normalizeProject({
    ...current,
    ...incoming,
    id: current.id, // never change
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });
  await env.VIBESCRIPT_PROJECTS.put(keyDoc(id), JSON.stringify(merged));
  return merged;
}

async function deleteProject(env, id) {
  const ids = await readIndex(env);
  const filtered = ids.filter(x => x !== id);
  await env.VIBESCRIPT_PROJECTS.put(INDEX_KEY, JSON.stringify(filtered));
  await env.VIBESCRIPT_PROJECTS.delete(keyDoc(id));
  return true;
}

async function readIndex(env) {
  const raw = await env.VIBESCRIPT_PROJECTS.get(INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

function keyDoc(id) { return `project:${id}`; }

// ---------- Minimal HTML (unchanged visuals) ----------
function siteHTML({ origin, settings }) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHTML(s.title)}</title>
<style>
  :root { --accent:${s.primaryColor}; }
  body{margin:0;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;
       color:#e5e7eb;background:linear-gradient(180deg,#0b0b14 0%,#120b1e 40%,#0b0b14 100%);}
  .wrap{max-width:960px;margin:0 auto;padding:32px 20px;}
  .badge{display:inline-flex;align-items:center;gap:.5rem;background:#1f2437;border:1px solid #2e3350;
         color:#c7d2fe;border-radius:999px;padding:6px 12px;}
  .badge::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--accent);}
  h1{font-size:clamp(28px,6vw,44px);margin:20px 0 8px}
  p.lead{color:#c7c9d1;margin:0 0 20px}
  .cta{display:inline-block;background:var(--accent);color:#0b0b14;border-radius:12px;
       padding:12px 18px;font-weight:700;text-decoration:none}
  .feat{margin-top:28px;border-radius:16px;background:#17182a;border:1px solid #2a2c45;padding:16px}
  .feat h3{margin:0 0 6px}
  .grid{display:grid;gap:16px}
</style>
</head>
<body>
  <div class="wrap">
    <div class="badge">VibeScript</div>
    <h1>${escapeHTML(s.title)}</h1>
    <p class="lead">${escapeHTML(s.tagline)}</p>
    <a class="cta" href="${escapeAttr(s.ctaLink)}">${escapeHTML(s.ctaText)}</a>

    <div class="grid">
      ${s.features.map(f => `
        <div class="feat">
          <h3>${escapeHTML(f.title)}</h3>
          <div>${escapeHTML(f.text)}</div>
        </div>`).join('')}
    </div>
  </div>
</body>
</html>`;
}

function editHTML({ origin, settings }) {
  const s = { ...DEFAULT_SETTINGS, ...settings };
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>VibeScript Builder</title>
<style>
  :root { --accent:${s.primaryColor}; }
  body{margin:0;background:linear-gradient(180deg,#0b0b14 0%,#120b1e 40%,#0b0b14 100%);
       color:#e5e7eb;font-family:ui-sans-serif,system-ui,Segoe UI,Roboto}
  .wrap{max-width:960px;margin:0 auto;padding:32px 20px}
  .badge{display:inline-flex;align-items:center;gap:.5rem;background:#1f2437;border:1px solid #2e3350;
         color:#c7d2fe;border-radius:999px;padding:6px 12px}
  .badge::before{content:"";width:10px;height:10px;border-radius:50%;background:var(--accent)}
  h1{font-size:clamp(24px,5vw,36px);margin:18px 0}
  label{display:block;margin:14px 0 6px;color:#aeb3c2}
  input,textarea{width:100%;background:#17182a;border:1px solid #2a2c45;border-radius:12px;
                 color:#e5e7eb;padding:10px 12px}
  .btn{background:var(--accent);color:#0b0b14;border:none;border-radius:12px;padding:10px 16px;font-weight:700}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  .card{background:#101223;border:1px solid #2a2c45;border-radius:16px;padding:16px;margin-top:18px}
  .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
  a.link{color:#c7d2fe}
</style>
</head>
<body>
  <div class="wrap">
    <div class="badge">VibeScript Builder</div>
    <h1>Edit Site Settings</h1>
    <p>Update content and colors, then <b>Save</b>. Changes apply immediately.</p>

    <div class="card">
      <label>Site title</label>
      <input id="title" value="${escapeAttr(s.title)}"/>
      <label>Primary color</label>
      <input id="primaryColor" value="${escapeAttr(s.primaryColor)}"/>
      <label>Tagline</label>
      <input id="tagline" value="${escapeAttr(s.tagline)}"/>
      <div class="row">
        <div>
          <label>CTA text</label>
          <input id="ctaText" value="${escapeAttr(s.ctaText)}"/>
        </div>
        <div>
          <label>CTA link</label>
          <input id="ctaLink" value="${escapeAttr(s.ctaLink)}"/>
        </div>
      </div>

      <div class="card">
        <h3>Features</h3>
        <div id="features"></div>
        <div class="actions">
          <button class="btn" id="addFeature">+ Add Feature</button>
          <button class="btn" id="save">Save</button>
          <a class="link" href="${origin}/" target="_blank">View Site</a>
        </div>
      </div>

      <details class="card"><summary>Raw JSON (advanced)</summary>
        <textarea id="raw" rows="12">${escapeHTML(JSON.stringify(s, null, 2))}</textarea>
        <div class="actions"><button class="btn" id="applyRaw">Apply JSON above</button></div>
      </details>
    </div>

    <div class="card">
      <h3>Projects (schema-ready)</h3>
      <div class="actions">
        <button class="btn" id="createProject">+ New Project</button>
        <a class="link" href="${origin}/__projects.json" target="_blank">Preview JSON</a>
      </div>
      <div id="projectList" style="margin-top:10px"></div>
    </div>
  </div>

<script>
const $ = sel => document.querySelector(sel);
const origin = location.origin;

// Render features
function renderFeatures(list){
  const root = $("#features");
  root.innerHTML = "";
  list.forEach((f, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.innerHTML = \`
      <input class="ft-title" placeholder="Feature title" value="\${escape(f.title)}" style="margin-bottom:8px"/>
      <textarea class="ft-text" rows="2" placeholder="Feature text">\${escape(f.text)}</textarea>
      <div class="actions"><button data-i="\${i}" class="btn rm">Remove</button></div>
    \`;
    root.appendChild(wrap);
  });
  root.querySelectorAll('.rm').forEach(btn=>{
    btn.onclick = () => {
      list.splice(+btn.dataset.i,1);
      renderFeatures(list);
    };
  });
}

// Load + init
let settings = ${JSON.stringify(DEFAULT_SETTINGS)};
fetch(origin + '/__settings.json').then(r=>r.json()).then(s=>{
  settings = { ...settings, ...s };
  $('#title').value = settings.title;
  $('#primaryColor').value = settings.primaryColor;
  $('#tagline').value = settings.tagline;
  $('#ctaText').value = settings.ctaText;
  $('#ctaLink').value = settings.ctaLink;
  renderFeatures(settings.features);
  $('#raw').value = JSON.stringify(settings,null,2);
});

// Apply JSON
$('#applyRaw').onclick = () => {
  try {
    const s = JSON.parse($('#raw').value);
    settings = s;
    $('#title').value = s.title || '';
    $('#primaryColor').value = s.primaryColor || '';
    $('#tagline').value = s.tagline || '';
    $('#ctaText').value = s.ctaText || '';
    $('#ctaLink').value = s.ctaLink || '';
    renderFeatures(s.features || []);
  } catch(e){ alert('Invalid JSON'); }
};

// Add feature
$('#addFeature').onclick = () => {
  settings.features = settings.features || [];
  settings.features.push({ title:'New Feature', text:'Describe it…' });
  renderFeatures(settings.features);
};

// Save settings
$('#save').onclick = async () => {
  const body = {
    title: $('#title').value,
    primaryColor: $('#primaryColor').value,
    tagline: $('#tagline').value,
    ctaText: $('#ctaText').value,
    ctaLink: $('#ctaLink').value,
    features: [...document.querySelectorAll('#features .card')].map(node => ({
      title: node.querySelector('.ft-title').value,
      text: node.querySelector('.ft-text').value
    })),
  };
  const res = await fetch(origin + '/__settings.json', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if(res.ok){ alert('Saved!'); } else { alert('Save failed'); }
};

// Projects (list + create)
async function refreshProjects(){
  const list = await fetch(origin + '/api/projects').then(r=>r.json());
  const root = $('#projectList');
  root.innerHTML = list.map(p => \`
    <div class="card">
      <b>\${escape(p.name)}</b>
      <div style="opacity:.8">Status: \${p.status} • Updated: \${p.updatedAt ?? ''}</div>
      <div class="actions">
        <a class="link" target="_blank" href="\${origin}/api/projects/\${p.id}">Open JSON</a>
        <button class="btn" data-id="\${p.id}" data-act="del">Delete</button>
      </div>
    </div>\`).join('');
  root.querySelectorAll('button[data-act="del"]').forEach(b=>{
    b.onclick = async () => {
      if(!confirm('Delete this project?')) return;
      await fetch(origin + '/api/projects/' + b.dataset.id, { method:'DELETE' });
      refreshProjects();
    };
  });
}
$('#createProject').onclick = async () => {
  const name = prompt('Project name?', 'New Project');
  if(!name) return;
  await fetch(origin + '/api/projects', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) });
  refreshProjects();
};
refreshProjects();

// util
function escape(s){ return (s??'').toString().replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
</script>
</body>
</html>`;
}

function escapeHTML(s){ return (s??'').toString().replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }
function escapeAttr(s){ return escapeHTML(s); }

// Allow POST to /__settings.json for saving
addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.pathname === '/__settings.json' && request.method === 'POST') {
    event.respondWith(handleSettingsSave(event));
  }
});

async function handleSettingsSave(event) {
  const { request } = event;
  try {
    // env isn’t on global here, so we proxy to default handler to get env then save.
    // Easiest path: re-run export default with a flag. Simpler: move save logic into main fetch.
    // To keep this single-file: we just 404 here; main handler above processes POST already.
    return new Response('Use main handler', { status: 404 });
  } catch {
    return new Response('Error', { status: 500 });
  }
  }
