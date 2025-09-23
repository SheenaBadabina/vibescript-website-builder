export async function sendEmail(env, { to, subject, html }) {
  if (!env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "VibeScript <noreply@vibescript.online>", to: [to], subject, html })
  });
  if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);
  return res.json();
}
