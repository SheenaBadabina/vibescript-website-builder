export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json();

    // Demo credentials (replace with D1 DB later)
    const DEMO_EMAIL = (env.DEMO_EMAIL || "admin@vibescript.online").toLowerCase();
    const DEMO_PASS  = (env.DEMO_PASS  || "changeme");

    const ok = email?.toLowerCase() === DEMO_EMAIL && password === DEMO_PASS;

    if (!ok) {
      return new Response("Invalid email or password.", { status: 401 });
    }

    const headers = new Headers({
      "Content-Type": "application/json",
      "Set-Cookie": `vs_session=demo; Path=/; HttpOnly; SameSite=Lax`,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch {
    return new Response("Malformed request.", { status: 400 });
  }
}

export async function onRequest({ request }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
}
