// Bounded, per-instance cache. Cold starts refetch data.
const active = new Map<string, Promise<unknown>>();
const entries = new Map<string, {expires: number; data: unknown}>();
export async function cached<T>(key: string, seconds: number, load: () => Promise<T>): Promise<T> {
  const found = entries.get(key);
  if (found && found.expires > Date.now()) return found.data as T;
  entries.delete(key);
  const running = active.get(key);
  if (running) return running as Promise<T>;
  if (active.size >= 16) throw new Error('Der er mange samtidige opslag. Prøv igen om lidt.');
  const operation = Promise.resolve().then(load).then(data => {
    if (entries.size >= 256) entries.delete(entries.keys().next().value!);
    entries.set(key, {expires: Date.now() + seconds * 1000, data});
    return data;
  });
  active.set(key, operation);
  try { return await operation; } finally { active.delete(key); }
}
