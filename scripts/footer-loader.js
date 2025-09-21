// scripts/footer-loader.js
// Injects /components/footer.html at the end of <body> on any page.
// No placeholders needed; nothing to paste per-page.

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const resp = await fetch("/components/footer.html", { credentials: "same-origin" });
    if (!resp.ok) throw new Error("Footer load failed: " + resp.status);
    const html = await resp.text();

    const mount = document.createElement("div");
    mount.id = "footer-root";
    mount.innerHTML = html;
    document.body.appendChild(mount);
  } catch (err) {
    console.error("Footer injection error:", err);
  }
});
