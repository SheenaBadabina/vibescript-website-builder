// functions/_utils/db.js
// Tiny KV helpers. Requires KV bindings: USERS, VERIFY.

export async function getUser(env, email) {
  const key = `user:${email}`;
  const txt = await env.USERS.get(key);
  return txt ? JSON.parse(txt) : null;
}

export async function putUser(env, user) {
  const key = `user:${user.email}`;
  await env.USERS.put(key, JSON.stringify(user));
}

export async function putToken(env, token, data, ttlSeconds = 60 * 60) {
  await env.VERIFY.put(`token:${token}`, JSON.stringify(data), { expirationTtl: ttlSeconds });
}

export async function takeToken(env, token) {
  const key = `token:${token}`;
  const txt = await env.VERIFY.get(key);
  if (!txt) return null;
  await env.VERIFY.delete(key);
  return JSON.parse(txt);
}

export function newToken(len = 32) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}
