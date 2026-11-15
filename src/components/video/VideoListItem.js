'use client';

import Skeleton from '@/components/ui/Skeleton';
import { formatCount, parseDuration, timeAgo, truncate } from '@/lib/utils';
import { useState } from 'react';

export default function VideoListItem({ video, isSelected, onSelect, index = 0 }) {
  const thumbnail = video.thumbnail_url || video.thumbnail || '';
  const title = video.title || '';
  const channel = video.channel_title || video.channel_name || '';
  const duration = parseDuration(video.duration);
  const category = video.category || '';
  const createdAt = video.published_at || video.created_at;
  const views = video.view_count || 0;
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className={`vlist-item vlist-item--entering ${isSelected ? 'vlist-item--active' : ''}`}
      style={{ '--i': index % 10 }}
      onClick={() => onSelect(video)}
      role="button"
      tabIndex={0}
      aria-pressed={!!isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(video);
        }
      }}
    >
      <div className="vlist-item__thumb">
        {thumbnail && !imgError ? (
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div className="vlist-item__no-thumb">No Thumbnail</div>
        )}
        {duration && <span className="vlist-item__duration">{duration}</span>}
      </div>
      <div className="vlist-item__info">
        <h3 className="vlist-item__title">{truncate(title, 70)}</h3>
        <p className="vlist-item__channel">{channel}</p>
        <div className="vlist-item__meta">
          {views > 0 && <span>{formatCount(views)} views</span>}
          {createdAt && <span>{timeAgo(createdAt)}</span>}
          {category && category !== 'other' && (
            <span className="badge badge--accent">{category}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function VideoListItemSkeleton() {
  return (
    <div className="vlist-item vlist-item--skeleton" aria-hidden="true">
      <div className="vlist-item__thumb">
        <Skeleton height="100%" radius={0} />
      </div>
      <div className="vlist-item__info">
        <Skeleton height={14} width="80%" />
        <Skeleton height={12} width="50%" />
        <Skeleton height={10} width="40%" />
      </div>
    </div>
  );
}
