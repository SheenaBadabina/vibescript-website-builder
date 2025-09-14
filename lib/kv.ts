// Tiny KV helpers used by functions (optional)

export async function kvGetJSON<T>(
  ns: KVNamespace,
  key: string,
  fallback: T,
): Promise<T> {
  const raw = await ns.get(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function kvPutJSON(
  ns: KVNamespace,
  key: string,
  value: unknown,
): Promise<void> {
  await ns.put(key, JSON.stringify(value));
}
