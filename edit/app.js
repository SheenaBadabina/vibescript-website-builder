// ---- QUICK CONFIG ----
const API_BASE = 'https://buildervibescriptonline.knowlessknowledge.workers.dev'; // change if different
// ----------------------

const $ = (sel) => document.querySelector(sel);
const featuresBox = $('#features');
const rawBox = $('#raw');

function featureRow(f = { title: '', text: '' }) {
  const wrap = document.createElement('div');
  wrap.className = 'feature';
  wrap.innerHTML = `
    <div class="feature-head">
      <span class="chip">Feature</span>
      <button class="btn" style="background:#1f2937; box-shadow:none" data-move="up">▲</button>
      <button class="btn" style="background:#1f2937; box-shadow:none" data-move="down">▼</button>
      <button class="btn" style="background:#7f1d1d; box-shadow:none" data-remove>Remove</button>
    </div>
    <div>
      <label>Title</label>
      <input class="f-title" placeholder="Fast" value="${f.title || ''}">
    </div>
    <div>
      <label>Text</label>
      <textarea class="f-text" placeholder="Launch a clean page in minutes.">${f.text || ''}</textarea>
    </div>
  `;
  wrap.querySelector('[data-remove]').onclick = () => wrap.remove();
  wrap.querySelector('[data-move="up"]').onclick = () => {
    const prev = wrap.previousElementSibling; if (prev) wrap.parentNode.insertBefore(wrap, prev);
  };
  wrap.querySelector('[data-move="down"]').onclick = () => {
    const next = wrap.nextElementSibling; if (next) wrap.parentNode.insertBefore(next, wrap);
  };
  return wrap;
}

function collectSettings() {
  const features = [...featuresBox.children].map(el => ({
    title: el.querySelector('.f-title').value.trim(),
    text : el.querySelector('.f-text').value.trim()
  })).filter(f => f.title || f.text);

  return {
    title: $('#title').value.trim() || 'VibeScript',
    tagline: $('#tagline').value.trim() || 'Turn one idea into momentum.',
    primaryColor: $('#primaryColor').value.trim() || '#7c3aed',
    ctaText: $('#ctaText').value.trim() || 'Get Started',
    ctaLink: $('#ctaLink').value.trim() || 'https://vibescript.online',
    features
  };
}

function fillForm(data) {
  $('#title').value = data.title ?? '';
  $('#tagline').value = data.tagline ?? '';
  $('#primaryColor').value = data.primaryColor ?? '#7c3aed';
  $('#ctaText').value = data.ctaText ?? '';
  $('#ctaLink').value = data.ctaLink ?? '';
  featuresBox.innerHTML = '';
  (data.features ?? []).forEach(f => featuresBox.appendChild(featureRow(f)));
  if ((data.features ?? []).length === 0) {
    ['Fast','Flexible','Hosted'].forEach((t,i)=>{
      const defaults = [
        'Launch a clean page in minutes.',
        'Tweak colors, copy, and layout.',
        'Served on Cloudflare’s global edge.'
      ];
      featuresBox.appendChild(featureRow({title:t, text:defaults[i]}));
    });
  }
  rawBox.textContent = JSON.stringify(data, null, 2);
  document.documentElement.style.setProperty('--primary', data.primaryColor || '#7c3aed');
}

async function loadSettings() {
  const r = await fetch(`${API_BASE}/api/settings`, { cache:'no-store' });
  if (!r.ok) throw new Error(`Load failed: ${r.status}`);
  const data = await r.json();
  fillForm(data);
}

async function saveSettings() {
  const body = collectSettings();
  const r = await fetch(`${API_BASE}/api/settings`, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`Save failed: ${r.status}`);
  const data = await r.json();
  fillForm(data);
  alert('Saved!');
}

async function createProject() {
  const name = $('#projName').value.trim();
  const status = $('#projStatus').value.trim() || 'draft';
  if (!name) return alert('Give your project a name');
  const r = await fetch(`${API_BASE}/api/projects`, {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify({ name, status })
  });
  if (!r.ok) throw new Error(`Create failed: ${r.status}`);
  alert('Project created');
}

async function listProjects() {
  const r = await fetch(`${API_BASE}/api/projects`, { cache:'no-store' });
  if (!r.ok) throw new Error(`List failed: ${r.status}`);
  const data = await r.json();
  $('#projectsOut').textContent = JSON.stringify(data, null, 2);
}

// UI hooks
$('#addFeature').onclick = () => featuresBox.appendChild(featureRow());
$('#saveBtn').onclick = saveSettings;
$('#rawBtn').onclick = () => {
  const v = collectSettings();
  rawBox.textContent = JSON.stringify(v, null, 2);
  rawBox.style.display = rawBox.style.display === 'none' ? 'block' : 'none';
};
$('#createProject').onclick = createProject;
$('#listProjects').onclick = listProjects;

// bootstrap
loadSettings().catch(() => {
  // Seed with defaults if not found yet
  fillForm({
    title: 'VibeScript Demo',
    tagline: 'Turn one idea into momentum.',
    primaryColor: '#7c3aed',
    ctaText: 'Get Started',
    ctaLink: 'https://vibescript.online',
    features: [
      { title:'Fast', text:'Launch a clean page in minutes.' },
      { title:'Flexible', text:'Tweak colors, copy, and layout.' },
      { title:'Hosted', text:'Served on Cloudflare’s global edge.' }
    ]
  });
});
