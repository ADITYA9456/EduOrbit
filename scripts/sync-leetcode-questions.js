/* eslint-disable no-console */

// Syncs LeetCode question list into Supabase table `questions`.
// This is the same idea as the Next.js route `/api/sync-leetcode`, but runnable as a script.
// Safe to re-run: uses upsert on (source, slug).

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

const PROBLEMSET_QUESTION_LIST_QUERY = `
  query problemsetQuestionListV2($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionFilterInput) {
    problemsetQuestionListV2(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      totalLength
      hasMore
      questions {
        title
        difficulty
        titleSlug
        topicTags {
          name
          slug
        }
      }
    }
  }
`;

function normalizeDifficulty(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  const lower = v.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  if (!hit) return fallback;
  return hit.slice(prefix.length);
}

function clampInt(value, { min, max, fallback }) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function formatQuestionRow(q) {
  const title = q?.title?.trim() || '';
  const difficulty = normalizeDifficulty(q?.difficulty);
  const slug = q?.titleSlug || '';

  const tags = Array.isArray(q?.topicTags)
    ? q.topicTags.map((t) => t?.name).filter(Boolean)
    : [];

  if (!title || !slug || !difficulty) return null;

  return {
    title,
    difficulty,
    slug,
    tags,
    source: 'leetcode',
  };
}

async function fetchLeetCodePage({ skip, limit }) {
  const res = await fetch(LEETCODE_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'EduOrbitSync/1.0',
      Referer: 'https://leetcode.com/problemset/',
      Origin: 'https://leetcode.com',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      operationName: 'problemsetQuestionListV2',
      query: PROBLEMSET_QUESTION_LIST_QUERY,
      variables: {
        categorySlug: '',
        skip,
        limit,
        filters: { filterCombineType: 'ALL' },
      },
    }),
    cache: 'no-store',
  });

  const text = await res.text();

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: `LeetCode GraphQL request failed (${res.status}).`,
      raw: text.slice(0, 2000),
    };
  }

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return {
      ok: false,
      status: 502,
      error: 'LeetCode response was not valid JSON.',
      raw: text.slice(0, 2000),
    };
  }

  if (json?.errors?.length) {
    return {
      ok: false,
      status: 502,
      error: json.errors?.[0]?.message || 'LeetCode GraphQL returned errors.',
      raw: json.errors,
    };
  }

  const list = json?.data?.problemsetQuestionListV2;
  const questions = list?.questions || [];

  return {
    ok: true,
    total: list?.totalLength ?? null,
    hasMore: list?.hasMore ?? null,
    questions,
  };
}

async function main() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exitCode = 1;
    return;
  }

  const limit = clampInt(getArg('limit', '50'), { min: 1, max: 200, fallback: 50 });
  const pages = clampInt(getArg('pages', '1'), { min: 1, max: 50, fallback: 1 });
  let skip = clampInt(getArg('skip', '0'), { min: 0, max: 100000, fallback: 0 });

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let totalSynced = 0;
  let knownTotal = null;
  let lastHasMore = null;

  for (let p = 0; p < pages; p++) {
    const page = await fetchLeetCodePage({ skip, limit });
    if (!page.ok) {
      console.error('Fetch failed:', page.error);
      if (page.raw) console.error('Raw:', typeof page.raw === 'string' ? page.raw : JSON.stringify(page.raw).slice(0, 1200));
      process.exitCode = 1;
      return;
    }

    if (knownTotal == null && typeof page.total === 'number') knownTotal = page.total;
    lastHasMore = page.hasMore;

    const rows = (page.questions || []).map(formatQuestionRow).filter(Boolean);

    if (rows.length === 0) {
      console.log('No rows returned. Stopping.');
      break;
    }

    const { error } = await supabase
      .from('questions')
      .upsert(rows, { onConflict: 'source,slug' });

    if (error) {
      console.error('Supabase upsert failed:', error.message);
      process.exitCode = 1;
      return;
    }

    totalSynced += rows.length;
    skip += limit;

    console.log(`Page ${p + 1}/${pages}: synced ${rows.length} (skip=${skip - limit} limit=${limit})`);
  }

  const moreInfo = typeof lastHasMore === 'boolean' ? ` (hasMore=${lastHasMore})` : '';
  console.log(`Done. Total synced: ${totalSynced}${knownTotal ? ` / total reported by LeetCode: ${knownTotal}` : ''}${moreInfo}`);
}

main().catch((err) => {
  console.error('Unexpected error:', err?.message || err);
  process.exitCode = 1;
});
