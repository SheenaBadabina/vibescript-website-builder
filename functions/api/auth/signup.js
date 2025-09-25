export async function onRequestPost({ request, env }) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return new Response("Missing fields.", { status: 400 });
    }

    // Demo only — replace with D1 later
    const DEMO_EMAIL = (env.DEMO_EMAIL || "admin@vibescript.online").toLowerCase();

    if (email.toLowerCase() === DEMO_EMAIL) {
      return new Response("User already exists.", { status: 409 });
    }

    // Pretend to create user, set cookie
    const headers = new Headers({
      "Content-Type": "application/json",
      "Set-Cookie": `vs_session=demo; Path=/; HttpOnly; SameSite=Lax`
    });

    return new Response(JSON.stringify({ success: true }), { status: 201, headers });
  } catch {
    return new Response("Bad request.", { status: 400 });
  }
}

export async function onRequest({ request }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
}
