'use client';

import GlassPanel from '@/components/ui/GlassPanel';
import { formatCount, timeAgo } from '@/lib/utils';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { HiExternalLink, HiPlay } from 'react-icons/hi';
import { HiBookOpen, HiHashtag, HiSparkles } from 'react-icons/hi2';

function generateSummary(video) {
  if (!video) return null;

  const desc = video.description || '';
  const title = video.title || '';
  const tags = video.tags || [];

  // Extract meaningful sentences from description
  const sentences = desc
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 300 && !s.startsWith('http'));

  const summaryLines = sentences.slice(0, 4);

  // Extract timestamps from description
  const timestamps = [];
  const tsRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s*[-\u2013\u2014]?\s*(.+)/g;
  let match;
  while ((match = tsRegex.exec(desc)) !== null && timestamps.length < 8) {
    timestamps.push({ time: match[1], label: match[2].trim().slice(0, 60) });
  }

  // Extract key topics from title and tags
  const topics = [];
  if (tags.length > 0) {
    topics.push(...tags.slice(0, 6));
  } else {
    // Extract meaningful words from title
    const words = title
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3);
    topics.push(...words.slice(0, 5));
  }

  return { summaryLines, timestamps, topics };
}

// compact: used beside the player, so the preview and watch actions are dropped.
export default function AISummaryPanel({ video, compact = false }) {
  const summary = useMemo(() => generateSummary(video), [video]);
  const [imgError, setImgError] = useState(false);

  // Reset imgError when video changes
  const videoId = video?.youtube_id || video?.id;
  const prevVideoIdRef = useRef(null);
  if (videoId !== prevVideoIdRef.current) {
    prevVideoIdRef.current = videoId;
    if (imgError) setImgError(false);
  }

  if (!video) {
    return (
      <GlassPanel as="aside" padded={false} className="ai-panel ai-panel--empty" aria-label="Video summary">
        <div className="ai-panel__empty-icon">
          <HiSparkles size={48} aria-hidden="true" />
        </div>
        <h3>Video Summary</h3>
        <p>Select a video from the list to see a summary built from its description, topics and chapters.</p>
      </GlassPanel>
    );
  }

  const thumbnail = video.thumbnail_url || video.thumbnail || '';
  const views = video.view_count || 0;

  return (
    <GlassPanel
      as="aside"
      padded={false}
      className={`ai-panel animate-fade-in${compact ? ' ai-panel--compact' : ''}`}
      aria-label="Video summary"
    >
      {!compact && (
        <Link href={`/video/${videoId}`} className="ai-panel__preview" aria-label={`Watch ${video.title}`}>
          {thumbnail && !imgError ? (
            <img
              src={thumbnail}
              alt=""
              onError={() => setImgError(true)}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}
          <div className="ai-panel__play-overlay">
            <div className="ai-panel__play-btn">
              <HiPlay size={32} aria-hidden="true" />
            </div>
          </div>
        </Link>
      )}

      {!compact && (
        <div className="ai-panel__header">
          <h3 className="ai-panel__title">{video.title}</h3>
          <div className="ai-panel__meta">
            {video.channel_title && <span className="ai-panel__channel">{video.channel_title}</span>}
            {views > 0 && <span>{formatCount(views)} views</span>}
            {video.published_at && <span>{timeAgo(video.published_at)}</span>}
          </div>
        </div>
      )}

      <div className="ai-panel__section">
        <div className="ai-panel__section-header">
          <HiSparkles size={16} aria-hidden="true" />
          <span>Summary</span>
        </div>
        <div className="ai-panel__summary">
          {summary?.summaryLines?.length > 0 ? (
            summary.summaryLines.map((line, i) => <p key={i}>{line}</p>)
          ) : (
            <p className="text-muted">
              This video covers &ldquo;{video.title}&rdquo;
              {video.channel_title ? ` by ${video.channel_title}` : ''}.
              Watch the full video for detailed content and explanations.
            </p>
          )}
        </div>
      </div>

      {summary?.timestamps?.length > 0 && (
        <div className="ai-panel__section">
          <div className="ai-panel__section-header">
            <HiBookOpen size={16} aria-hidden="true" />
            <span>Chapters</span>
          </div>
          <div className="ai-panel__timestamps" tabIndex={0} role="region" aria-label="Video timestamps">
            {summary.timestamps.map((ts, i) => (
              <div key={i} className="ai-panel__ts-item">
                <span className="ai-panel__ts-time">{ts.time}</span>
                <span className="ai-panel__ts-label">{ts.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary?.topics?.length > 0 && (
        <div className="ai-panel__section">
          <div className="ai-panel__section-header">
            <HiHashtag size={16} aria-hidden="true" />
            <span>Key Topics</span>
          </div>
          <div className="ai-panel__topics">
            {summary.topics.map((topic, i) => (
              <span key={i} className="ai-panel__topic-tag">{topic}</span>
            ))}
          </div>
        </div>
      )}

      {!compact && (
        <div className="ai-panel__actions">
          <Link href={`/video/${videoId}`} className="btn btn--primary btn--sm" style={{ flex: 1 }}>
            <HiPlay size={16} aria-hidden="true" /> Watch Now
          </Link>
          <a
            href={`https://youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--secondary btn--sm"
          >
            <HiExternalLink size={16} aria-hidden="true" /> YouTube
          </a>
        </div>
      )}
    </GlassPanel>
  );
}