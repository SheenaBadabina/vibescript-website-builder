/* edit/app.js — FULL FILE (same-origin API) */
const API_BASE = ""; // Pages Functions at /api/*

const $  = (s) => document.querySelector(s);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

// ----- Elements
const elTitle        = $("#siteTitle");
const elPrimaryColor = $("#primaryColor");
const elTagline      = $("#tagline");
const elCtaText      = $("#ctaText");
const elCtaLink      = $("#ctaLink");

const elFeaturesWrap = $("#featuresWrap");
const elAddFeature   = $("#addFeature");
const elSave         = $("#saveBtn");
const elRaw          = $("#rawJsonBtn");

// AI
const elAiPrompt = $("#aiPrompt");
const elAiSystem = $("#aiSystem");
const elAiTemp   = $("#aiTemp");
const elAiMax    = $("#aiMax");
const elAiRun    = $("#aiRun");
const elAiSpin   = $("#aiSpin");
const elAiOut    = $("#aiOut");
const elAiInsert = $("#aiInsert");
const elAiCopy   = $("#aiCopy");

// Projects
const elProjName   = $("#projName");
const elProjStatus = $("#projStatus");
const elProjDesc   = $("#projDesc"); // optional field not in UI; safe
const elProjCreate = $("#projCreateBtn");
const elProjList   = $("#projListBtn");
const elProjects   = $("#projectsWrap");

// ----- API helpers
async function apiGet(path) {
  const r = await fetch(`${API_BASE}${path}`, { headers: { "accept":"application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}
async function apiPost(path, body) {
  const r = await fetch(`${API_BASE}${path}`, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  return r.json();
}

// ----- Settings
async function loadSettings() {
  const s = await apiGet("/api/settings");
  applySettingsToUI(s);
}
function collectSettings() {
  const features = [...elFeaturesWrap.querySelectorAll(".feature-card")].map(card => ({
    title: card.querySelector(".f-title").value.trim(),
    text : card.querySelector(".f-text").value.trim(),
  })).filter(f => f.title || f.text);
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
  document.documentElement.style.setProperty('--primary', s.primaryColor || '#7c3aed');
}

function renderFeatures(list) {
  elFeaturesWrap.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) list = [{ title:"Fast", text:"Launch a clean page in minutes." }];
  list.forEach((f) => elFeaturesWrap.appendChild(featureCard(f)));
}
function featureCard(f = {}) {
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
  card.querySelector(".remove").onclick = () => card.remove();
  card.querySelector(".up").onclick = () => move(card, -1);
  card.querySelector(".down").onclick = () => move(card, 1);
  return card;
}
function move(card, dir) {
  const sib = dir < 0 ? card.previousElementSibling : card.nextElementSibling;
  if (!sib) return;
  if (dir < 0) card.parentNode.insertBefore(card, sib);
  else        card.parentNode.insertBefore(sib, card);
}
function escapeHtml(s) { return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }

// ----- Save / Export
async function saveSettings() {
  const body = collectSettings();
  await apiPost("/api/settings", body);
  toast("Saved.");
}
function exportJson() {
  const s = collectSettings();
  const blob = new Blob([JSON.stringify(s, null, 2)], { type:"application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "vibescript-settings.json"; a.click();
  URL.revokeObjectURL(url);
}

// ----- AI
async function runAI() {
  const prompt = (elAiPrompt?.value || "").trim();
  const system = (elAiSystem?.value || "").trim();
  const temperature = parseFloat(elAiTemp?.value || "0.7");
  const max_tokens  = parseInt(elAiMax?.value || "600", 10);
  if (!prompt) return toast("Enter a business input.");

  elAiSpin.style.display = "inline-block";
  elAiOut.textContent = "";
  try {
    const res = await apiPost("/api/ai-generate", { prompt, system, temperature, max_tokens });
    if (!res.ok) throw new Error(res.error || "AI error");
    elAiOut.textContent = res.content || "";
    toast("AI generated.");
  } catch (e) {
    console.error(e);
    elAiOut.textContent = "Error generating content. Check console.";
    toast("AI failed.");
  } finally {
    elAiSpin.style.display = "none";
  }
}
function insertAiIntoFeatures() {
  const text = elAiOut.textContent.trim();
  if (!text) return toast("Nothing to insert.");
  elFeaturesWrap.appendChild(featureCard({ title: "AI Output", text }));
  toast("Inserted.");
}
async function copyAiOutput() {
  const text = elAiOut.textContent;
  if (!text) return toast("No AI output to copy.");
  await navigator.clipboard.writeText(text);
  toast("Copied.");
}

// ----- Projects
async function listProjects() {
  const items = await apiGet("/api/projects");
  renderProjects(items);
}
async function createProject() {
  const name = (elProjName?.value || "").trim();
  const status = (elProjStatus?.value || "draft").trim();
  const description = (elProjDesc?.value || "").trim();
  if (!name) return toast("Enter a project name.");
  await apiPost("/api/projects", { name, status, description });
  toast("Project created.");
  const items = await apiGet("/api/projects");
  renderProjects(items);
}
function renderProjects(items) {
  elProjects.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    elProjects.innerHTML = "<p>No projects yet.</p>";
    return;
  }
  const table = document.createElement("table");
  table.className = "proj-table";
  table.innerHTML = `
    <thead><tr><th>Name</th><th>Status</th><th>Description</th><th>Created</th></tr></thead>
    <tbody></tbody>`;
  const tb = table.querySelector("tbody");
  items.forEach(p => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.status||"")}</td><td>${escapeHtml(p.description||"")}</td><td>${escapeHtml(p.createdAt||"")}</td>`;
    tb.appendChild(tr);
  });
  elProjects.appendChild(table);
}

// ----- Boot + handlers
function toast(msg) {
  let bar = $("#toast");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "toast";
    bar.style.position="fixed"; bar.style.bottom="14px"; bar.style.left="50%";
    bar.style.transform="translateX(-50%)"; bar.style.padding="10px 14px";
    bar.style.borderRadius="10px"; bar.style.background="rgba(124,58,237,.95)";
    bar.style.color="#fff"; bar.style.fontSize="14px"; bar.style.zIndex="9999";
    document.body.appendChild(bar);
  }
  bar.textContent = msg;
  bar.style.opacity = "1";
  setTimeout(()=>{ bar.style.opacity = "0"; }, 1800);
}

async function boot() {
  try { await loadSettings(); } catch { /* will render defaults on first save */ }
  on(elAddFeature, "click", () => elFeaturesWrap.appendChild(featureCard({ title:"", text:"" })));
  on(elSave, "click", saveSettings);
  on(elRaw, "click", exportJson);

  on(elAiRun, "click", runAI);
  on(elAiInsert, "click", insertAiIntoFeatures);
  on(elAiCopy, "click", copyAiOutput);

  on(elProjCreate, "click", createProject);
  on(elProjList, "click", listProjects);
  try { await listProjects(); } catch {}
}

document.addEventListener("DOMContentLoaded", boot);
