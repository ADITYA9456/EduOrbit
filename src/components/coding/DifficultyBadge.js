import Badge from '@/components/ui/Badge';

const TONES = { easy: 'easy', medium: 'medium', hard: 'hard' };

// Accepts "Easy" or "easy". Unknown values fall back to a neutral badge.
export default function DifficultyBadge({ difficulty }) {
  if (!difficulty) return null;
  const tone = TONES[String(difficulty).toLowerCase()] || 'neutral';
  return <Badge tone={tone}>{difficulty}</Badge>;
}
