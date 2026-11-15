'use client';

import { getAvatarUrl, getDisplayName, getInitials } from '@/lib/avatar';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Avatar({ user, profile, size = 36, className = '' }) {
  const url = getAvatarUrl(user, profile);
  const name = getDisplayName(user, profile);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [url]);

  const box = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--accent-soft)',
    color: 'var(--accent-primary)',
    fontWeight: 700,
    fontSize: Math.round(size * 0.38),
    lineHeight: 1,
    userSelect: 'none',
  };

  return (
    <span className={className} style={box}>
      {url && !failed ? (
        <Image
          src={url}
          alt={`${name} avatar`}
          width={size}
          height={size}
          sizes={`${size}px`}
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={name}>{getInitials(name)}</span>
      )}
    </span>
  );
}
