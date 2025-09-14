/* edit/app.js — FULL FILE (replace entire file)
   Calls same-origin Pages Functions at /api/settings and /api/projects
*/

const API_BASE = ""; // same-origin

// -------- DOM HELPERS --------
const $ = (sel) => document.querySelector(sel);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

// Inputs (exist if the section is present in the HTML)
const elTitle        = $("#siteTitle");
const elPrimaryColor = $("#primaryColor");
const elTagline      = $("#tagline");
const elCtaText      = $("#ctaText");
const elCtaLink      = $("#ctaLink");

const elFeaturesWrap = $("#featuresWrap");
const elAddFeature   = $("#addFeature");
const elSave         = $("#saveBtn");
const elRaw          = $("#rawJsonBtn");

const elProjectsWrap = $("#projectsWrap");
const elProjName     = $("#projName");
const elProjStatus   = $("#projStatus");
const elProjDesc     = $("#projDesc");
const elProjCreate   = $("#projCreateBtn");
const elProjList     = $("#projListBtn");

// -------- SETTINGS --------
async function fetchSettings() {
  const r = await fetch(`${API_BASE}/api/settings`, { headers: { "accept": "application/json" }});
  if (!r.ok) throw new Error(`GET /api/settings ${r.status}`);
  return r.json();
}

async function saveSettings(data) {
  const r = await fetch(`${API_BASE}/api/settings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`POST /api/settings ${r.status}`);
  return r.json();
}

function getSettingsFromUI() {
  const features = [...elFeaturesWrap.querySelectorAll(".feature-card")].map(card => ({
    title: card.querySelector(".f-title").value.trim(),
    text:  card.querySelector(".f-text").value.trim(),
  }));
  return {
    title:        elTitle?.value?.trim() || "VibeScript",
    tagline:      elTagline?.value?.trim() || "",
    primaryColor: elPrimaryColor?.value?.trim() || "#7c3aed",
    ctaText:      elCtaText?.value?.trim() || "Get Started",
    ctaLink:      elCtaLink?.value?.trim() || "",
    features
  };
}

function applySettingsToUI(s) {
  if (elTitle)        elTitle.value        = s.title ?? "";
  if (elTagline)      elTagline.value      = s.tagline ?? "";
  if (elPrimaryColor) elPrimaryColor.value = s.primaryColor ?? "#7c3aed";
  if (elCtaText)      elCtaText.value      = s.ctaText ?? "";
  if (elCtaLink)      elCtaLink.value      = s.ctaLink ?? "";
  renderFeatures(s.features ?? []);
}

function renderFeatures(list) {
  if (!elFeaturesWrap) return;
  elFeaturesWrap.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) list = [{ title: "Fast", text: "Launch a clean page in minutes." }];

  list.forEach((f, idx) => elFeaturesWrap.appendChild(featureCard(f, idx)));
}

function featureCard(f = {}, idx = 0) {
  const card = document.createElement("div");
  card.className = "feature-card";
  card.innerHTML = `
    <div class="row">
      <input class="f-title"   placeholder="Title" value="${escapeHtml(f.title || "")}">
    </div>
    <div class="row">
      <textarea class="f-text" rows="3" placeholder="Text">${escapeHtml(f.text || "")}</textarea>
    </div>
    <div class="row buttons">
      <button type="button" class="up">▲</button>
      <button type="button" class="down">▼</button>
      <button type="button" class="remove">Remove</button>
    </div>
    <hr>
  `;

  on(card.querySelector(".up"),    "click", () => moveCard(card, -1));
  on(card.querySelector(".down"),  "click", () => moveCard(card,  1));
  on(card.querySelector(".remove"),"click", () => card.remove());
  return card;
}

function moveCard(card, dir) {
  const sib = dir < 0 ? card.previousElementSibling : card.nextElementSibling;
  if (!sib) return;
  if (dir < 0) card.parentNode.insertBefore(card, sib);
  else        card.parentNode.insertBefore(sib, card);
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

// -------- PROJECTS --------
async function listProjects() {
  const r = await fetch(`${API_BASE}/api/projects`, { headers: { "accept":"application/json" }});
  if (!r.ok) throw new Error(`GET /api/projects ${r.status}`);
  return r.json();
}

async function createProject(payload) {
  const r = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`POST /api/projects ${r.status}`);
  return r.json();
}

function renderProjectsTable(items) {
  if (!elProjectsWrap) return;
  elProjectsWrap.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    elProjectsWrap.innerHTML = `<p>No projects yet.</p>`;
    return;
  }
  const table = document.createElement("table");
  table.className = "proj-table";
  table.innerHTML = `
    <thead><tr>
      <th>Name</th><th>Status</th><th>Description</th><th>Created</th>
    </tr></thead>
    <tbody></tbody>`;
  const tb = table.querySelector("tbody");
  items.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.status || "")}</td>
      <td>${escapeHtml(p.description || "")}</td>
      <td>${escapeHtml(p.createdAt || "")}</td>`;
    tb.appendChild(tr);
  });
  elProjectsWrap.appendChild(table);
}

// -------- BOOT --------
async function boot() {
  // Load settings into the form (if present)
  try {
    const s = await fetchSettings();
    applySettingsToUI(s);
  } catch (e) {
    console.error(e);
    toast("Could not load settings (see console).");
  }

  // Wire buttons if present
  on(elAddFeature, "click", () => {
    elFeaturesWrap && elFeaturesWrap.appendChild(featureCard({ title: "", text: "" }));
    toast("Added feature block.");
  });

  on(elSave, "click", async () => {
    try {
      const s = getSettingsFromUI();
      await saveSettings(s);
      toast("Saved. Changes apply immediately.");
    } catch (e) {
      console.error(e);
      toast("Save failed (see console).");
    }
  });

  on(elRaw, "click", async () => {
    try {
      const s = getSettingsFromUI();
      const blob = new Blob([JSON.stringify(s, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "vibescript-settings.json"; a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast("Could not export JSON.");
    }
  });

  // Projects section (if present)
  on(elProjCreate, "click", async () => {
    const name = (elProjName?.value || "").trim();
    const status = (elProjStatus?.value || "draft").trim();
    const description = (elProjDesc?.value || "").trim();
    if (!name) return toast("Enter a project name.");
    try {
      await createProject({ name, status, description });
      toast("Project created.");
      const items = await listProjects();
      renderProjectsTable(items);
    } catch (e) {
      console.error(e);
      toast("Create failed (see console).");
    }
  });

  on(elProjList, "click", async () => {
    try {
      const items = await listProjects();
      renderProjectsTable(items);
    } catch (e) {
      console.error(e);
      toast("List failed (see console).");
    }
  });

  // Auto-load project list if the container exists
  if (elProjectsWrap) {
    try { renderProjectsTable(await listProjects()); } catch {}
  }
}

// -------- UX toast --------
function toast(msg) {
  let bar = $("#toast");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "toast";
    bar.style.position = "fixed";
    bar.style.bottom = "14px";
    bar.style.left = "50%";
    bar.style.transform = "translateX(-50%)";
    bar.style.padding = "10px 14px";
    bar.style.borderRadius = "10px";
    bar.style.background = "rgba(124,58,237,.95)";
    bar.style.color = "white";
    bar.style.fontSize = "14px";
    bar.style.zIndex = "9999";
    document.body.appendChild(bar);
  }
  bar.textContent = msg;
  bar.style.opacity = "1";
  setTimeout(() => { bar.style.opacity = "0"; }, 1800);
}

document.addEventListener("DOMContentLoaded", boot);
