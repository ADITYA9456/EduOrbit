// Small per-instance TTL cache and fixed-window rate limiter.
// State lives in the serverless instance, so limits are best-effort per instance, not global.

const stores = (globalThis.__eduorbitMemory ||= { cache: new Map(), hits: new Map() });

export function cacheGet(key) {
  const entry = stores.cache.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    stores.cache.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet(key, value, ttlMs, maxEntries = 300) {
  if (stores.cache.size >= maxEntries) {
    stores.cache.delete(stores.cache.keys().next().value);
  }
  stores.cache.set(key, { value, expires: Date.now() + ttlMs });
}

// Returns { ok, retryAfter } for `limit` calls per `windowMs` per key.
export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const entry = stores.hits.get(key);
  if (!entry || entry.reset < now) {
    if (stores.hits.size > 5000) {
      for (const [k, v] of stores.hits) if (v.reset < now) stores.hits.delete(k);
    }
    stores.hits.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > limit) return { ok: false, retryAfter: Math.ceil((entry.reset - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

export function clientIp(request) {
  const fwd = request.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0].trim() : request.headers.get('x-real-ip')) || 'unknown';
}
