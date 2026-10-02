export const UA = { "User-Agent": "Mozilla/5.0 (SteamCardOptimizer)" };
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function resolveSteamId(input: string): Promise<string> {
  const t = input.trim();
  if (/^\d{17}$/.test(t)) return t;
  const prof = t.match(/steamcommunity\.com\/profiles\/(\d{17})/);
  if (prof) return prof[1];
  const m = t.match(/steamcommunity\.com\/id\/([^/?#]+)/);
  const vanity = m ? m[1] : t;
  if (!/^[\w-]{2,64}$/.test(vanity)) throw new Error("Enter a 17-digit Steam ID or a profile URL.");
  const r = await fetch(`https://steamcommunity.com/id/${vanity}/?xml=1`, { headers: UA });
  const xml = await r.text();
  const id = xml.match(/<steamID64>(\d{17})<\/steamID64>/);
  if (!id) throw new Error("Couldn't find that profile. Check the name or URL.");
  return id[1];
}

// Simple in-memory TTL cache (per server instance)
const cache = new Map<string, { t: number; v: any }>();
export function getCache(k: string, ttl = 10 * 60_000) {
  const e = cache.get(k);
  return e && Date.now() - e.t < ttl ? e.v : null;
}
export const setCache = (k: string, v: any) => cache.set(k, { t: Date.now(), v });
