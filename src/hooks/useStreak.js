'use client';

import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState } from 'react';

const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const toState = (row) => ({ current: row?.current_streak ?? 0, longest: row?.longest_streak ?? 0, activeToday: !!row?.active_today });

/**
 * Daily streak. The database owns the calculation: the browser only asks for it
 * (my_streak) or reports activity (record_activity). A streak that missed yesterday reads 0.
 */
export function useStreak(userId) {
  const supabase = createClient();
  const [streak, setStreak] = useState({ current: 0, longest: 0, activeToday: false });

  useEffect(() => {
    if (!userId) return;
    supabase
      .rpc('my_streak', { p_tz: timeZone() })
      .then(({ data, error }) => {
        if (error) console.error('Failed to load streak:', error.message);
        else if (data?.[0]) setStreak(toState(data[0]));
      });
  }, [userId, supabase]);

  const recordActivity = useCallback(async (type = 'activity') => {
    if (!userId) return;
    const { data, error } = await supabase.rpc('record_activity', { p_type: type, p_tz: timeZone() });
    if (error) console.error('Failed to record activity:', error.message);
    else if (data?.[0]) setStreak(toState(data[0]));
  }, [userId, supabase]);

  return { ...streak, recordActivity };
}
