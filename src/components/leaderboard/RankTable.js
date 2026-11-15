'use client';

import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Table from '@/components/ui/Table';
import { getDisplayName } from '@/lib/avatar';

function Who({ row }) {
  return (
    <span className="lb-user">
      <Avatar profile={row} size={28} />
      <span className="table__primary">{getDisplayName(null, row)}</span>
      {row.is_me && <Badge tone="accent">You</Badge>}
    </span>
  );
}

function Row({ row, variant, pinned = false }) {
  return (
    <tr className={`${row.is_me ? 'row--me' : ''} ${pinned ? 'row--pinned' : ''}`} aria-current={row.is_me ? 'true' : undefined}>
      <td className="lb-rank">#{row.rank}</td>
      <td><Who row={row} /></td>
      {variant === 'contest' ? (
        <>
          <td className="lb-score">{row.score}</td>
          <td>{row.solved}</td>
          <td className="text-muted">{Number(row.penalty_minutes).toFixed(0)} min</td>
        </>
      ) : (
        <>
          <td className="lb-score">{row.points}</td>
          <td>{row.solved}</td>
        </>
      )}
    </tr>
  );
}

const COLUMNS = {
  global: [
    { key: 'rank', label: 'Rank' },
    { key: 'user', label: 'User' },
    { key: 'points', label: 'Points' },
    { key: 'solved', label: 'Solved' },
  ],
  contest: [
    { key: 'rank', label: 'Rank' },
    { key: 'user', label: 'User' },
    { key: 'score', label: 'Score' },
    { key: 'solved', label: 'Solved' },
    { key: 'penalty', label: 'Penalty' },
  ],
};

/**
 * Paginated standings. `me` is the signed-in user's own ranked row (from the server), shown
 * pinned under the table whenever it is not on the visible page.
 */
export default function RankTable({ variant, rows, me, page, pageSize, total, onPage, caption }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const meVisible = me && rows.some((r) => r.user_id === me.user_id);
  const myPage = me ? Math.floor((me.rank - 1) / pageSize) : null;

  return (
    <div className="rank-table">
      {me && (
        <p className="rank-table__me" role="status">
          Your rank: <strong>#{me.rank}</strong> of {total}
          {variant === 'contest' ? ` · ${me.score} pts · ${me.solved} solved` : ` · ${me.points} pts · ${me.solved} solved`}
          {myPage !== page && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onPage(myPage)}>Show my page</button>
          )}
        </p>
      )}

      <Table caption={caption} columns={COLUMNS[variant]} className="lb-table">
        {rows.map((row) => <Row key={row.user_id} row={row} variant={variant} />)}
        {me && !meVisible && <Row row={{ ...me, is_me: true }} variant={variant} pinned />}
      </Table>

      <nav className="rank-table__pager" aria-label="Pagination">
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => onPage(page - 1)} disabled={page <= 0}>
          Previous
        </button>
        <span aria-live="polite">Page {page + 1} of {pages}</span>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => onPage(page + 1)} disabled={page + 1 >= pages}>
          Next
        </button>
      </nav>
    </div>
  );
}
