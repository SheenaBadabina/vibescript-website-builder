// scripts/footer-loader.js
// Automatically load footer.html into any page that has <div id="footer-root"></div>

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const resp = await fetch("/components/footer.html");
    if (!resp.ok) throw new Error("Footer load failed");
    const html = await resp.text();
    const root = document.getElementById("footer-root");
    if (root) root.innerHTML = html;
  } catch (err) {
    console.error("Footer injection error:", err);
  }
});
