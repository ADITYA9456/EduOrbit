'use client';

import RankTable from '@/components/leaderboard/RankTable';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/context/AuthProvider';
import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState } from 'react';
import { HiTrophy } from 'react-icons/hi2';

const PAGE_SIZE = 25;

export default function LeaderboardPage() {
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [me, setMe] = useState(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (pageIndex) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('global_leaderboard', {
        p_limit: PAGE_SIZE,
        p_offset: pageIndex * PAGE_SIZE,
      });
      if (rpcError) throw rpcError;
      setRows(data || []);
      setTotal(Number(data?.[0]?.total_count ?? 0));
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError(/function|schema cache/i.test(err.message || '')
        ? 'The leaderboard is not set up on this database yet (migration 002 is missing).'
        : 'Could not load the leaderboard. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { load(page); }, [load, page]);

  useEffect(() => {
    if (authLoading) return;
    if (!userId) { setMe(null); return; }
    supabase.rpc('global_my_rank').then(({ data }) => setMe(data?.[0] ?? null));
  }, [userId, authLoading, supabase]);

  const goTo = (next) => setPage(Math.max(0, next));

  return (
    <div className="leaderboard animate-fade-in">
      <PageHeader
        title="Leaderboard"
        description="Ranked by points from problems solved. Ties go to whoever got there first."
      />

      {error ? (
        <EmptyState icon={<HiTrophy size={48} />} title="Leaderboard unavailable" message={error} />
      ) : loading && rows.length === 0 ? (
        <div className="route-loading">
          <div className="skeleton route-loading__card" />
          <div className="skeleton route-loading__card" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<HiTrophy size={48} />} title="No solves yet" message="Solve a problem to take the first spot." />
      ) : (
        <RankTable
          variant="global"
          caption="Global leaderboard"
          rows={rows}
          me={me}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onPage={goTo}
        />
      )}
    </div>
  );
}
