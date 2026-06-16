'use client';

import AISummaryPanel from '@/components/video/AISummaryPanel';
import CategoryPills from '@/components/video/CategoryPills';
import VideoListItem, { VideoListItemSkeleton } from '@/components/video/VideoListItem';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function ShortsPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState('All');
  const [nextPageToken, setNextPageToken] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [error, setError] = useState(null);

  const sentinelRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fetchingRef = useRef(false);
  const pageRef = useRef(0);
  const seenIdsRef = useRef(new Set());
  const emptyFetchCount = useRef(0);
  const MAX_EMPTY_FETCHES = 3;

  const fetchVideos = useCallback(async (append = false, token = '') => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    if (!append) {
      setLoading(true);
      pageRef.current = 0;
      seenIdsRef.current = new Set();
      emptyFetchCount.current = 0;
    } else {
      setLoadingMore(true);
    }

    try {
      let url = '/api/youtube/search';
      const params = ['shorts=1'];
      if (searchQuery) params.push(`q=${encodeURIComponent(searchQuery)}`);
      if (category && category !== 'All') params.push(`category=${encodeURIComponent(category)}`);
      if (token) params.push(`pageToken=${encodeURIComponent(token)}`);
      params.push(`page=${pageRef.current}`);
      url += `?${params.join('&')}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      let res;
      try {
        res = await fetch(url, { cache: 'no-store', signal: controller.signal });
      } finally {
        clearTimeout(timer);
      }

      const data = await res.json();

      if (res.ok && data.videos) {
        const newVideos = data.videos.filter((v) => {
          const id = v.youtube_id || v.id;
          if (seenIdsRef.current.has(id)) return false;
          seenIdsRef.current.add(id);
          return true;
        });

        if (newVideos.length > 0) {
          setVideos(append ? (prev) => [...prev, ...newVideos] : newVideos);
          emptyFetchCount.current = 0;
        } else {
          emptyFetchCount.current += 1;
        }

        setNextPageToken(data.nextPageToken || '');
        setHasMore(!!data.nextPageToken && emptyFetchCount.current < MAX_EMPTY_FETCHES);
        setError(null);
        pageRef.current += 1;

        if (!append && newVideos.length > 0) {
          setSelectedVideo(newVideos[0]);
        }
      } else {
        if (!append) setVideos([]);
        setHasMore(false);
      }
    } catch {
      if (!append) setVideos([]);
      setHasMore(false);
      setError('Failed to load shorts. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [searchQuery, category]);

  useEffect(() => {
    setNextPageToken('');
    setHasMore(true);
    setSelectedVideo(null);
    fetchVideos(false, '');
  }, [category, searchQuery, fetchVideos]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!sentinel || !scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !fetchingRef.current) {
          fetchVideos(true, nextPageToken);
        }
      },
      { root: scrollContainer, rootMargin: '600px' }
    );

    observer.observe(sentinel);

    const handleScroll = () => {
      if (!hasMore || fetchingRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (scrollHeight - scrollTop - clientHeight < 800) {
        fetchVideos(true, nextPageToken);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, nextPageToken, fetchVideos]);

  const handleCategoryChange = (cat) => setCategory(cat);

  return (
    <div className="animate-fade-in">
      <h2 style={{ marginBottom: 'var(--space-lg)' }}>Shorts</h2>

      <CategoryPills active={category} onChange={handleCategoryChange} />

      <div className="home-split" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="vlist" ref={scrollContainerRef}>
          {loading && videos.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => <VideoListItemSkeleton key={i} />)
          ) : error && videos.length === 0 ? (
            <div className="loading-container" style={{ minHeight: 200, textAlign: 'center' }}>
              <p className="text-muted">{error}</p>
              <button
                className="btn btn--primary"
                style={{ marginTop: 'var(--space-md)' }}
                onClick={() => {
                  setError(null);
                  fetchVideos(true);
                }}
              >
                Retry
              </button>
            </div>
          ) : videos.length === 0 ? (
            <div className="loading-container" style={{ minHeight: 200 }}>
              <p className="text-muted">No shorts found</p>
            </div>
          ) : (
            videos.map((video) => (
              <VideoListItem
                key={video.id || video.youtube_id}
                video={video}
                isSelected={(selectedVideo?.youtube_id || selectedVideo?.id) === (video.youtube_id || video.id)}
                onSelect={setSelectedVideo}
              />
            ))
          )}

          {loadingMore && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-md)' }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          )}

          {hasMore && <div ref={sentinelRef} style={{ height: 10 }} />}
        </div>

        <AISummaryPanel video={selectedVideo} />
      </div>
    </div>
  );
}
