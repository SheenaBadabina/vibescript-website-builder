async function getSettings(){
  const r = await fetch('/api/settings'); return r.json();
}
async function putSettings(data){
  const r = await fetch('/api/settings',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
  if(!r.ok) throw new Error('Save failed'); return r.json();
}
async function listProjects(){
  const r = await fetch('/api/projects'); return r.json();
}
async function createProject(p){
  const r = await fetch('/api/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)});
  if(!r.ok) throw new Error('Create failed'); return r.json();
}

function $(id){ return document.getElementById(id); }

async function load(){
  // Settings
  const s = await getSettings();
  $('title').value = s.title ?? '';
  $('tagline').value = s.tagline ?? '';
  $('primaryColor').value = s.primaryColor ?? '#7c3aed';
  $('ctaText').value = s.ctaText ?? 'Get Started';
  $('ctaLink').value = s.ctaLink ?? '';
  $('features').value = JSON.stringify(s.features ?? [], null, 2);

  // Projects
  const list = await listProjects();
  $('projects').textContent = JSON.stringify(list.items ?? [], null, 2);
}

$('saveBtn')?.addEventListener('click', async () => {
  try{
    const data = {
      title: $('title').value.trim(),
      tagline: $('tagline').value.trim(),
      primaryColor: $('primaryColor').value.trim(),
      ctaText: $('ctaText').value.trim(),
      ctaLink: $('ctaLink').value.trim(),
      features: JSON.parse($('features').value || '[]'),
    };
    await putSettings(data);
    alert('Saved!');
  }catch(e){ alert(e.message || 'Save error'); }
});

$('createBtn')?.addEventListener('click', async () => {
  try{
    const rec = await createProject({
      name: $('projName').value.trim(),
      status: $('projStatus').value.trim() || 'draft',
      description: $('projDesc').value.trim(),
    });
    const list = await listProjects();
    $('projects').textContent = JSON.stringify(list.items ?? [], null, 2);
    alert(`Created ${rec.name}`);
  }catch(e){ alert(e.message || 'Create error'); }
});

load();
