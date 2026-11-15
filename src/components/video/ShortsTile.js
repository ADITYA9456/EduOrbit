'use client';

import Skeleton from '@/components/ui/Skeleton';
import { formatCount, truncate } from '@/lib/utils';
import { useState } from 'react';

// Vertical 9:16 tile for the shorts rail. Selecting it drives the AI summary panel.
export default function ShortsTile({ video, isSelected, onSelect, index = 0 }) {
  const thumbnail = video.thumbnail_url || video.thumbnail || '';
  const title = video.title || '';
  const channel = video.channel_title || video.channel_name || '';
  const views = video.view_count || 0;
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      className={`short-tile vlist-item--entering ${isSelected ? 'short-tile--active' : ''}`}
      style={{ '--i': index % 10 }}
      aria-pressed={!!isSelected}
      onClick={() => onSelect(video)}
    >
      {thumbnail && !imgError ? (
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="short-tile__img"
        />
      ) : (
        <span className="short-tile__none">No Thumbnail</span>
      )}
      <span className="short-tile__scrim" aria-hidden="true" />
      <span className="short-tile__info">
        <span className="short-tile__title">{truncate(title, 60)}</span>
        <span className="short-tile__meta">
          {channel}
          {views > 0 && ` · ${formatCount(views)} views`}
        </span>
      </span>
    </button>
  );
}

export function ShortsTileSkeleton() {
  return (
    <div className="short-tile short-tile--skeleton" aria-hidden="true">
      <Skeleton height="100%" radius={0} style={{ position: 'absolute', inset: 0 }} />
    </div>
  );
}
