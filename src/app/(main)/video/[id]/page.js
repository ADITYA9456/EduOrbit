'use client';

import EmptyState from '@/components/ui/EmptyState';
import GlassPanel from '@/components/ui/GlassPanel';
import Skeleton from '@/components/ui/Skeleton';
import AISummaryPanel from '@/components/video/AISummaryPanel';
import VideoCard from '@/components/video/VideoCard';
import { formatCount, timeAgo } from '@/lib/utils';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HiChevronDown, HiChevronUp, HiExternalLink } from 'react-icons/hi';

export default function VideoPage() {
  const { id } = useParams();

  const [video, setVideo] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/youtube/video?id=${encodeURIComponent(id)}`);
        if (res.ok) {
          const data = await res.json();
          setVideo(data.video);
          setRelated(data.related || []);
        } else {
          // Fallback: just embed the video
          setVideo({
            youtube_id: id,
            title: 'Video',
            description: '',
            channel_title: '',
            tags: [],
            category: '',
            view_count: 0,
          });
        }
      } catch {
        setVideo({
          youtube_id: id,
          title: 'Video',
          description: '',
          channel_title: '',
          tags: [],
          category: '',
          view_count: 0,
        });
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="video-player" aria-busy="true">
        <div className="video-player__main">
          <div className="video-player__iframe-wrap">
            <Skeleton height="100%" radius={0} style={{ position: 'absolute', inset: 0 }} />
          </div>
          <Skeleton height={28} width="70%" />
          <Skeleton height={40} width="40%" />
          <Skeleton height={96} />
        </div>
        <div className="video-player__sidebar">
          <Skeleton height={20} width="50%" />
          <Skeleton height={180} />
          <Skeleton height={180} />
        </div>
      </div>
    );
  }
  if (!video) return <EmptyState title="Video not found" message="It may have been removed." />;

  return (
    <div className="video-player animate-fade-in">
      {/* Main Column */}
      <div className="video-player__main">
        {/* Embedded Player */}
        <div className="video-player__iframe-wrap">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtube_id}?autoplay=1&rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.title}
          />
        </div>

        {/* Info */}
        <GlassPanel as="section" className="video-player__info" aria-label="Video details">
          <h1 className="video-player__title">{video.title}</h1>

          <div className="video-player__byline">
            <div className="video-player__channel">
              <div className="video-player__avatar" aria-hidden="true">
                {(video.channel_title || 'C')[0]}
              </div>
              <div>
                <div className="video-player__channel-name">{video.channel_title}</div>
                <div className="text-muted text-sm">{formatCount(video.view_count)} views &middot; {timeAgo(video.published_at)}</div>
              </div>
            </div>

            <a
              href={`https://youtube.com/watch?v=${video.youtube_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--secondary btn--sm"
            >
              <HiExternalLink size={16} aria-hidden="true" /> YouTube
            </a>
          </div>

          {/* Description */}
          {video.description && (
            <div className="video-player__desc-box">
              <div id="video-description" className={`video-player__description ${descExpanded ? 'video-player__description--expanded' : ''}`}>
                {video.description}
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-expanded={descExpanded}
                aria-controls="video-description"
                onClick={() => setDescExpanded(!descExpanded)}
              >
                {descExpanded ? <><HiChevronUp size={16} aria-hidden="true" /> Show less</> : <><HiChevronDown size={16} aria-hidden="true" /> Show more</>}
              </button>
            </div>
          )}

          {/* Tags */}
          {video.tags?.length > 0 && (
            <div className="video-player__tags">
              {video.tags.map((tag) => (
                <span key={tag} className="badge badge--accent">{tag}</span>
              ))}
            </div>
          )}
        </GlassPanel>

        <AISummaryPanel video={video} compact />
      </div>

      {/* Sidebar - Related */}
      <div className="video-player__sidebar">
        <h2 className="video-player__sidebar-title">Related Videos</h2>
        {related.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {related.map((v) => (
              <VideoCard key={v.youtube_id} video={v} compact />
            ))}
          </div>
        ) : (
          <EmptyState title="No related videos" message="Nothing similar to show yet." />
        )}
      </div>
    </div>
  );
}