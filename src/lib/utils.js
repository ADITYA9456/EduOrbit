// Shared utility functions
import { clsx } from 'clsx';

/** Merge class names (falsy values are ignored) */
export function cn(...classes) {
  return clsx(...classes);
}

/** Format a number with K/M suffixes */
export function formatCount(num) {
  if (!num) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

/** Format ISO date to relative time */
export function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];
  for (const i of intervals) {
    const count = Math.floor(seconds / i.seconds);
    if (count >= 1) return `${count} ${i.label}${count > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}

/** Slugify a string */
export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** ISO 8601 duration → readable */
export function parseDuration(iso) {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}:` : '';
  const m = match[2] ? match[2].padStart(2, '0') : '00';
  const s = match[3] ? match[3].padStart(2, '0') : '00';
  return `${h}${m}:${s}`;
}

/** ISO 8601 duration (PT#H#M#S) or hh:mm:ss/mm:ss → seconds */
export function durationToSeconds(input) {
  if (input == null) return 0;
  if (typeof input === 'number') {
    return Number.isFinite(input) ? Math.max(0, Math.floor(input)) : 0;
  }
  if (typeof input !== 'string') return 0;

  const value = input.trim();
  if (!value) return 0;

  // ISO 8601: PT#H#M#S
  const isoMatch = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (isoMatch) {
    const hours = isoMatch[1] ? parseInt(isoMatch[1], 10) : 0;
    const minutes = isoMatch[2] ? parseInt(isoMatch[2], 10) : 0;
    const seconds = isoMatch[3] ? parseInt(isoMatch[3], 10) : 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  // Common formatted strings: mm:ss or hh:mm:ss
  if (/^\d+(?::\d{1,2}){1,2}$/.test(value)) {
    const parts = value.split(':').map((p) => parseInt(p, 10));
    if (parts.some((n) => Number.isNaN(n))) return 0;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  // Plain seconds, as a string
  if (/^\d+$/.test(value)) return parseInt(value, 10);

  return 0;
}

/** Truncate text */
export function truncate(str, len = 100) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}
