import { NextResponse } from 'next/server';

// IMPORTANT
// - This route runs on the server.
// - It fetches LeetCode questions and caches them into Supabase (Postgres).
// - The frontend never calls LeetCode directly.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

// LeetCode supports pagination via skip+limit.
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// LeetCode query used by their problemset (2026+).
// NOTE: The older `problemsetQuestionList` field was removed; use `problemsetQuestionListV2`.
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
  // LeetCode returns EASY/MEDIUM/HARD; our DB constraint expects Easy/Medium/Hard.
  const lower = v.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function clampInt(value, { min, max, fallback }) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

async function isAuthorized(request) {
  // Option A (recommended): protect with a shared secret header for Cron/manual use.
  const secret = process.env.LEETCODE_SYNC_SECRET;
  if (secret) {
    const provided = request.headers.get('x-sync-secret');
    if (provided && provided === secret) return true;
  }

  // Option B: allow signed-in admins to trigger sync.
  // Reads Supabase session from cookies (SSR auth).
  try {
    const { createServerSupabase } = await import('@/lib/supabase/server');
    const { supabase } = createServerSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return profile?.role === 'admin';
  } catch {
    return false;
  }
}

function formatQuestionRow(q) {
  const title = q?.title?.trim() || '';
  const difficulty = normalizeDifficulty(q?.difficulty);
  const slug = q?.titleSlug || '';

  // Store tag names as a simple text[] for easy display/filtering.
  const tags = Array.isArray(q?.topicTags)
    ? q.topicTags.map((t) => t?.name).filter(Boolean)
    : [];

  // Skip malformed rows.
  if (!title || !slug) return null;

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

      // LeetCode can reject requests that look "bot-like".
      // These headers make this request closer to a normal browser GraphQL call.
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

// GET: self-documenting help endpoint
export async function GET() {
  return NextResponse.json({
    ok: true,
    message:
      'POST to this endpoint to sync LeetCode questions into Supabase. Use x-sync-secret header (recommended) or be logged in as admin.',
    example: {
      method: 'POST',
      url: '/api/sync-leetcode?skip=0&limit=50',
      headers: { 'x-sync-secret': '<LEETCODE_SYNC_SECRET>' },
    },
  });
}

// POST /api/sync-leetcode
// - Fetches a page of LeetCode problems
// - Upserts into Supabase table `questions`
export async function POST(request) {
  try {
    // Basic env sanity checks
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Missing env: NEXT_PUBLIC_SUPABASE_URL' },
        { status: 500 }
      );
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Missing env: SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const allowed = await isAuthorized(request);
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            'Unauthorized. Provide x-sync-secret header (LEETCODE_SYNC_SECRET) or sign in as an admin.',
        },
        { status: 401 }
      );
    }

    // Read pagination from query string (preferred)
    const url = new URL(request.url);
    let skip = clampInt(url.searchParams.get('skip'), {
      min: 0,
      max: 100000,
      fallback: 0,
    });
    let limit = clampInt(url.searchParams.get('limit'), {
      min: 1,
      max: MAX_LIMIT,
      fallback: DEFAULT_LIMIT,
    });

    // Also accept JSON body (optional)
    // Example: { "skip": 0, "limit": 50 }
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json();
        if (body?.skip !== undefined) {
          skip = clampInt(body.skip, { min: 0, max: 100000, fallback: skip });
        }
        if (body?.limit !== undefined) {
          limit = clampInt(body.limit, { min: 1, max: MAX_LIMIT, fallback: limit });
        }
      } catch {
        // ignore invalid body
      }
    }

    // 1) Fetch from LeetCode
    const page = await fetchLeetCodePage({ skip, limit });
    if (!page.ok) {
      return NextResponse.json(
        { error: page.error, status: page.status, raw: page.raw },
        { status: page.status || 502 }
      );
    }

    // 2) Format rows for our DB schema
    const rows = (page.questions || []).map(formatQuestionRow).filter(Boolean);

    // 3) Upsert into Supabase using service role
    //    (service role bypasses RLS and is safe here because this code runs server-side)
    const { createAdminSupabase } = await import('@/lib/supabase/server');
    const supabaseAdmin = createAdminSupabase();

    // Chunk writes so we don't hit request size limits.
    const CHUNK_SIZE = 500;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabaseAdmin
        .from('questions')
        .upsert(chunk, { onConflict: 'source,slug' });

      if (error) {
        return NextResponse.json(
          { error: `Supabase upsert failed: ${error.message}` },
          { status: 500 }
        );
      }
    }

    const nextSkip = skip + limit;
    const done = page.hasMore === null ? rows.length < limit : !page.hasMore;

    return NextResponse.json({
      ok: true,
      source: 'leetcode',
      synced: rows.length,
      total: page.total,
      skip,
      limit,
      nextSkip,
      done,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}
