'use client';

import AISummaryPanel from '@/components/video/AISummaryPanel';
import Typewriter from '@/components/ui/Typewriter';
import CategoryPills from '@/components/video/CategoryPills';
import VideoListItem, { VideoListItemSkeleton } from '@/components/video/VideoListItem';
import { useAuth } from '@/context/AuthProvider';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function HomePage() {
  const { user } = useAuth();
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

  // Ref for infinite scroll sentinel
  const sentinelRef = useRef(null);
  // Ref for the .vlist scroll container
  const scrollContainerRef = useRef(null);
  // Prevent duplicate fetches
  const fetchingRef = useRef(false);
  // Track page number for fallback pagination
  const pageRef = useRef(0);
  // Track seen video IDs to avoid duplicates across pages
  const seenIdsRef = useRef(new Set());
  // Track consecutive empty (all-duplicate) fetches to stop runaway scrolling
  const emptyFetchCount = useRef(0);
  const MAX_EMPTY_FETCHES = 3;

  const fetchVideos = useCallback(async (append = false, token = "") => {
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
      let url = "/api/youtube/search";
      const params = [];
      if (searchQuery) params.push(`q=${encodeURIComponent(searchQuery)}`);
      if (category && category !== 'All') params.push(`category=${encodeURIComponent(category)}`);
      if (token) params.push(`pageToken=${encodeURIComponent(token)}`);
      params.push(`page=${pageRef.current}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      let res;
      try {
        res = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const data = await res.json();

      if (res.ok && data.videos) {
        // Deduplicate videos across pages
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
        setNextPageToken(data.nextPageToken || "");
        setHasMore(!!data.nextPageToken && emptyFetchCount.current < MAX_EMPTY_FETCHES);
        setError(null);
        pageRef.current += 1;

        // Auto-select first video on fresh load
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
      setError('Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [searchQuery, category]);

  // Reset on category or search change
  useEffect(() => {
    setNextPageToken("");
    setHasMore(true);
    setSelectedVideo(null);
    fetchVideos(false, "");
  }, [category, searchQuery, fetchVideos]);

  // Infinite scroll with IntersectionObserver + fallback scroll listener
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
      {
        root: scrollContainer,
        rootMargin: '600px',
      }
    );

    observer.observe(sentinel);

    // Fallback: scroll event on the .vlist container in case IntersectionObserver misses
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

  const handleCategoryChange = (cat) => {
    setCategory(cat);
  };

  return (
    <div className="animate-fade-in">
      {/* Hero — only for guests */}
      {!searchQuery && !user && (
        <section className="lp-hero">
          <div className="lp-hero__grid" aria-hidden="true" />
          <div className="lp-hero__orb lp-hero__orb--a" aria-hidden="true" />
          <div className="lp-hero__orb lp-hero__orb--b" aria-hidden="true" />
          <div className="lp-hero__inner">
            <span className="lp-hero__eyebrow">
              <span className="lp-hero__eyebrow-dot">AI</span>
              Every video is checked before it goes live
            </span>
            <h1 className="lp-hero__title">
              <span className="lp-word" style={{ '--w': 0 }}>Learn.</span>{' '}
              <span className="lp-word" style={{ '--w': 1 }}>Code.</span>{' '}
              <span className="lp-gradient">Level up.</span>
            </h1>
            <Typewriter
              className="lp-hero__sub"
              text="Learning-only videos, a place to practise code, weekly contests and a leaderboard to climb. Where do you want to start?"
            />
            <div className="lp-pills">
              <Link href="/signup" className="lp-pill lp-pill--solid">Get started free</Link>
              <a href="#explore" className="lp-pill lp-pill--solid">Browse videos</a>
              <Link href="/coding" className="lp-pill lp-pill--solid">Try coding practice</Link>
              <Link href="/contests" className="lp-pill lp-pill--solid">See contests</Link>
              <Link href="/leaderboard" className="lp-pill lp-pill--solid">View leaderboard</Link>
              <Link href="/login" className="lp-pill lp-pill--outline">Already a member? Sign in</Link>
            </div>
          </div>
        </section>
      )}

      {searchQuery && (
        <h2 style={{ marginBottom: 'var(--space-lg)' }}>
          Results for &quot;{searchQuery}&quot;
        </h2>
      )}

      {/* Category Filter */}
      <CategoryPills active={category} onChange={handleCategoryChange} />

      {/* Split Layout: Video List + AI Summary */}
      <div id="explore" className="home-split" style={{ marginTop: 'var(--space-lg)', scrollMarginTop: 'calc(var(--header-height) + 16px)' }}>
        {/* Video List */}
        <div className="vlist" ref={scrollContainerRef}>
          {loading && videos.length === 0 ? (
            Array.from({ length: 6 }).map((_, i) => (
              <VideoListItemSkeleton key={i} />
            ))
          ) : error && videos.length === 0 ? (
            <div className="loading-container" style={{ minHeight: 200, textAlign: 'center' }}>
              <p className="text-muted">{error}</p>
              <button
                className="btn btn--primary"
                style={{ marginTop: 'var(--space-md)' }}
                onClick={() => { setError(null); fetchVideos(true); }}
              >
                Retry
              </button>
            </div>
          ) : videos.length === 0 ? (
            <div className="loading-container" style={{ minHeight: 200 }}>
              <p className="text-muted">No videos found</p>
            </div>
          ) : (
            videos.map((video, index) => (
              <VideoListItem
                key={video.id || video.youtube_id}
                index={index}
                video={video}
                isSelected={(selectedVideo?.youtube_id || selectedVideo?.id) === (video.youtube_id || video.id)}
                onSelect={setSelectedVideo}
              />
            ))
          )}

          {/* Loading more indicator */}
          {loadingMore && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-md)' }}>
              <div className="spinner" style={{ width: 28, height: 28 }} />
            </div>
          )}

          {/* Infinite scroll sentinel */}
          {hasMore && <div ref={sentinelRef} style={{ height: 10 }} />}
        </div>

        {/* AI Summary Panel */}
        <AISummaryPanel video={selectedVideo} />
      </div>
    </div>
  );
}
