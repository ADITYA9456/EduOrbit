'use client';

import EmptyState from '@/components/ui/EmptyState';
import VideoCard, { VideoCardSkeleton } from './VideoCard';

export default function VideoGrid({ videos = [], loading = false }) {
  if (loading) {
    return (
      <div className="video-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!videos.length) {
    return <EmptyState title="No videos found" message="Try another category or a different search." />;
  }

  return (
    <div className="video-grid">
      {videos.map((video) => (
        <VideoCard key={video.id || video.youtube_id} video={video} />
      ))}
    </div>
  );
}
