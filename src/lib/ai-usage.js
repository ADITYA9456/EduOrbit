import { rateLimit } from '@/lib/memory-cache';

const HOURLY_LIMIT = { chat: 20, hint: 30 };

// Counts the user's recent AI calls in the database so the limit holds across serverless instances.
// If ai_usage does not exist yet (migration 004 not applied) it falls back to an in-memory limit.
export async function checkAiQuota(admin, userId, kind) {
  const limit = HOURLY_LIMIT[kind] || 20;
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count, error } = await admin
    .from('ai_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', since);

  if (error) {
    const r = rateLimit(`ai:${kind}:${userId}`, limit, 3_600_000);
    return { ok: r.ok, limit, retryAfter: r.retryAfter, persisted: false };
  }
  return { ok: (count || 0) < limit, limit, retryAfter: 600, persisted: true };
}

export async function recordAiUse(admin, userId, kind) {
  const { error } = await admin.from('ai_usage').insert({ user_id: userId, kind });
  if (error && !/does not exist|schema cache/i.test(error.message)) console.error('ai_usage insert failed:', error.message);
}
