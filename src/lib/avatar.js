export function getAvatarUrl(user, profile) {
  const meta = user?.user_metadata || {};
  return meta.avatar_url || meta.picture || profile?.avatar_url || null;
}

export function getDisplayName(user, profile) {
  const meta = user?.user_metadata || {};
  return profile?.full_name || meta.full_name || meta.name || profile?.username || user?.email?.split('@')[0] || 'User';
}

export function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}
