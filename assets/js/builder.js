/* VibeScript Builder — client-side generator */
const $ = (id) => document.getElementById(id);

async function getBaseTemplate() {
  const res = await fetch('assets/base.html', { cache: 'no-cache' });
  return await res.text();
}

function buildNavHTML(raw) {
  const items = (raw || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!items.length) return '';
  return items.map(label => `<a href="#${label.toLowerCase().replace(/\s+/g,'-')}">${label}</a>`).join('');
}

function fillTemplate(tpl, data) {
  return tpl
    .replace(/{{TITLE}}/g, data.title)
    .replace(/{{TAGLINE}}/g, data.tagline)
    .replace(/{{PRIMARY}}/g, data.primary)
    .replace(/{{CTA_TEXT}}/g, data.ctaText)
    .replace(/{{CTA_HREF}}/g, data.ctaHref || '#')
    .replace(/{{ABOUT}}/g, data.about)
    .replace(/{{NAV}}/g, buildNavHTML(data.nav));
}

async function generateHTML() {
  const tpl = await getBaseTemplate();
  const data = {
    title: $('siteTitle').value || 'My Site',
    tagline: $('siteTagline').value || '',
    primary: $('primaryColor').value || '#7C3AED',
    ctaText: $('ctaText').value || 'Learn more',
    ctaHref: $('ctaHref').value || '#',
    about: $('aboutText').value || '',
    nav: $('navItems').value || ''
  };
  return fillTemplate(tpl, data);
}

async function preview() {
  const html = await generateHTML();
  const iframe = $('previewFrame');
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  iframe.src = url;
}

async function downloadHTML() {
  const html = await generateHTML();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  saveAs(blob, 'index.html');
}

async function downloadZip() {
  const html = await generateHTML();
  const zip = new JSZip();

  // place generated page at root
  zip.file('index.html', html);

  // also include a tiny README
  const readme =
`VibeScript Builder export

Files:
- index.html  : Your generated landing page

How to host:
- Drop these files into any static host (Cloudflare Pages, GitHub Pages, Netlify, etc.)
`;
  zip.file('README.txt', readme);

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'vibescript-site.zip');
}

/* Bind actions */
window.addEventListener('DOMContentLoaded', () => {
  $('previewBtn').addEventListener('click', preview);
  $('downloadHtmlBtn').addEventListener('click', downloadHTML);
  $('downloadZipBtn').addEventListener('click', downloadZip);

  // auto preview on load for nice UX
  preview();
});
