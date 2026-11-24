import { NextResponse } from 'next/server';
import { cacheGet, cacheSet, clientIp, rateLimit } from '@/lib/memory-cache';

export const dynamic = 'force-dynamic';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export async function GET(request) {
  try {
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json({ error: 'YouTube API key not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';

    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
      return NextResponse.json({ error: 'A valid video ID is required' }, { status: 400 });
    }

    const cached = cacheGet(`yt-video:${id}`);
    if (cached) return NextResponse.json(cached);

    const limit = rateLimit(`yt-video:${clientIp(request)}`, 60, 60_000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } });
    }

    // Fetch video details
    const videoUrl = new URL(`${BASE_URL}/videos`);
    videoUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
    videoUrl.searchParams.set('id', id);
    videoUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    let videoRes;
    try {
      videoRes = await fetch(videoUrl.toString(), { cache: 'no-store', signal: controller.signal });
    } catch (e) {
      return NextResponse.json({ error: 'YouTube API timeout' }, { status: 504 });
    } finally {
      clearTimeout(timer);
    }
    if (!videoRes.ok) {
      return NextResponse.json({ error: 'YouTube API error' }, { status: videoRes.status });
    }

    const videoData = await videoRes.json();
    const item = videoData.items?.[0];

    if (!item) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const snippet = item.snippet || {};
    const stats = item.statistics || {};
    const content = item.contentDetails || {};

    const video = {
      youtube_id: item.id,
      title: snippet.title || '',
      description: snippet.description || '',
      channel_title: snippet.channelTitle || '',
      thumbnail_url: snippet.thumbnails?.high?.url || '',
      published_at: snippet.publishedAt || '',
      duration: content.duration || '',
      view_count: parseInt(stats.viewCount, 10) || 0,
      like_count: parseInt(stats.likeCount, 10) || 0,
      tags: snippet.tags?.slice(0, 10) || [],
      category: '',
    };

    // YouTube removed `relatedToVideoId`; approximate "related" with a topic search instead.
    const topic = [snippet.title, ...(snippet.tags || []).slice(0, 2)].join(' ').slice(0, 120);
    const relatedUrl = new URL(`${BASE_URL}/search`);
    relatedUrl.searchParams.set('part', 'snippet');
    relatedUrl.searchParams.set('type', 'video');
    relatedUrl.searchParams.set('q', topic);
    relatedUrl.searchParams.set('maxResults', '10');
    relatedUrl.searchParams.set('key', YOUTUBE_API_KEY);
    relatedUrl.searchParams.set('safeSearch', 'strict');

    const relController = new AbortController();
    const relTimer = setTimeout(() => relController.abort(), 5000);
    let relatedRes;
    try {
      relatedRes = await fetch(relatedUrl.toString(), { cache: 'no-store', signal: relController.signal });
    } catch {
      relatedRes = null;
    } finally {
      clearTimeout(relTimer);
    }
    let relatedVideos = [];

    if (relatedRes?.ok) {
      const relatedData = await relatedRes.json();
      const relIds = relatedData.items
        ?.map((i) => i.id?.videoId)
        .filter(Boolean) || [];

      if (relIds.length > 0) {
        // Fetch details for related videos
        const relDetailsUrl = new URL(`${BASE_URL}/videos`);
        relDetailsUrl.searchParams.set('part', 'snippet,contentDetails,statistics');
        relDetailsUrl.searchParams.set('id', relIds.join(','));
        relDetailsUrl.searchParams.set('key', YOUTUBE_API_KEY);

        const detController = new AbortController();
        const detTimer = setTimeout(() => detController.abort(), 5000);
        let relDetailsRes;
        try {
          relDetailsRes = await fetch(relDetailsUrl.toString(), { cache: 'no-store', signal: detController.signal });
        } catch {
          relDetailsRes = null;
        } finally {
          clearTimeout(detTimer);
        }
        if (relDetailsRes?.ok) {
          const relDetailsData = await relDetailsRes.json();
          relatedVideos = (relDetailsData.items || []).map((r) => ({
            youtube_id: r.id,
            title: r.snippet?.title || '',
            channel_title: r.snippet?.channelTitle || '',
            thumbnail_url: r.snippet?.thumbnails?.medium?.url || '',
            published_at: r.snippet?.publishedAt || '',
            duration: r.contentDetails?.duration || '',
            view_count: parseInt(r.statistics?.viewCount, 10) || 0,
          }));
        }
      }
    }

    const payload = { video, related: relatedVideos };
    cacheSet(`yt-video:${id}`, payload, 30 * 60_000);
    return NextResponse.json(payload);
  } catch (err) {
    console.error('YouTube video route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
