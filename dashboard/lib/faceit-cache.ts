const active = new Map<string, Promise<unknown>>();

export async function cached<T>(key: string, seconds: number, load: () => Promise<T>): Promise<T> {
  const cache = await caches.open('faceit-public-v2');
  const request = new Request('https://faceit-cache.invalid/' + encodeURIComponent(key));
  const found = await cache.match(request);
  if (found) return found.json() as Promise<T>;
  const running = active.get(key);
  if (running) return running as Promise<T>;
  if (active.size >= 16) throw new Error('Der er mange samtidige opslag. Prøv igen om lidt.');
  const operation = (async () => {
    const data = await load();
    await cache.put(request, Response.json(data, {headers:{'Cache-Control':`public, max-age=${seconds}`}}));
    return data;
  })();
  active.set(key, operation);
  try { return await operation; } finally { active.delete(key); }
}
