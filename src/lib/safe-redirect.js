// Only allow same-site relative paths as post-login destinations.
export function safeRedirectPath(value, fallback = '/home') {
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  if (/[\r\n\\]/.test(value)) return fallback;
  if (value.startsWith('/login') || value.startsWith('/signup') || value.startsWith('/api/')) return fallback;
  return value;
}
