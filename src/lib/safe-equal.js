import { timingSafeEqual } from 'node:crypto';

// Constant-time string comparison for shared secrets. Length differences return false without leaking timing.
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}
