export async function getUser(env, email){ const v = await env.USERS.get(`user:${email}`); return v?JSON.parse(v):null; }
export async function putUser(env, user){ await env.USERS.put(`user:${user.email}`, JSON.stringify(user)); }
export async function putToken(env, token, data, ttl){ await env.VERIFY.put(`token:${token}`, JSON.stringify(data), { expirationTtl: ttl }); }
export async function takeToken(env, token){ const k = `token:${token}`; const v = await env.VERIFY.get(k); if(!v) return null; await env.VERIFY.delete(k); return JSON.parse(v); }
export function newToken(len=32){ const b=new Uint8Array(len); crypto.getRandomValues(b); return Array.from(b).map(x=>x.toString(16).padStart(2,"0")).join(""); }
