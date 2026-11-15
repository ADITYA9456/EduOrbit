import Link from 'next/link';
import { HiFire } from 'react-icons/hi';
import DifficultyBadge from './DifficultyBadge';

export default function DailyChallengeCard({ challenge }) {
  if (!challenge) return null;
  return (
    <Link href={`/coding/${challenge.slug || challenge.id}`} className="daily-card">
      <span className="daily-card__eyebrow"><HiFire size={16} aria-hidden="true" /> Daily challenge</span>
      <h2 className="daily-card__title">{challenge.title}</h2>
      <div className="daily-card__meta">
        <DifficultyBadge difficulty={challenge.difficulty} />
        {challenge.category && <span>{challenge.category}</span>}
        <span className="daily-card__pts">+{challenge.points || 10} pts</span>
      </div>
      <span className="daily-card__cta">Solve it today</span>
    </Link>
  );
}
