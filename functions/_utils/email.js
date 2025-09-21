// Minimal Resend sender; requires env.RESEND_API_KEY and a verified sending domain.
export async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "VibeScript <noreply@vibescript.online>", to: [to], subject, html })
  });
  if (!res.ok) {
    const text = await res.text().catch(()=> "");
    throw new Error(`Resend error: ${res.status} ${text}`);
  }
  return res.json();
}
