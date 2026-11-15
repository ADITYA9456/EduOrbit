'use client';

import { useAuth } from '@/context/AuthProvider';
import { CATEGORIES } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import GlassPanel from '@/components/ui/GlassPanel';
import Skeleton from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { HiCheckCircle, HiClock, HiLightningBolt, HiLink, HiUpload, HiXCircle } from 'react-icons/hi';

const STEPS = ['Enter URL', 'Details', 'Submit'];

const STATUS = {
  pending: { tone: 'medium', label: 'Pending review', Icon: HiClock, color: 'var(--warning)', text: 'Waiting for an admin to review it. This page updates on its own.' },
  approved: { tone: 'success', label: 'Approved', Icon: HiCheckCircle, color: 'var(--success)', text: 'Live on EduOrbit. Thanks for contributing.' },
  rejected: { tone: 'danger', label: 'Rejected', Icon: HiXCircle, color: 'var(--danger)', text: 'It did not meet the guidelines, so it was not published. You can submit a different video.' },
};

export default function UploadPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');

  // AI verification result
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // Submission tracking
  const [submitted, setSubmitted] = useState(null);
  const [mine, setMine] = useState([]);
  const [mineLoading, setMineLoading] = useState(true);
  const [urlError, setUrlError] = useState('');

  const loadMine = useCallback(async () => {
    if (!user) return;
    const { data } = await createClient()
      .from('videos')
      .select('id, youtube_id, title, thumbnail_url, status, created_at')
      .eq('submitted_by', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    const rows = data || [];
    setMine(rows);
    setMineLoading(false);
    setSubmitted((prev) => {
      const fresh = prev && rows.find((r) => r.id === prev.id);
      return fresh ? { ...prev, status: fresh.status } : prev;
    });
  }, [user]);

  useEffect(() => { loadMine(); }, [loadMine]);

  // Poll while something is pending so approval or rejection shows without a reload.
  const anyPending = mine.some((v) => v.status === 'pending');
  useEffect(() => {
    if (!anyPending) return undefined;
    const t = setInterval(loadMine, 20000);
    return () => clearInterval(t);
  }, [anyPending, loadMine]);

  // Extract YouTube video ID from URL
  const extractVideoId = (url) => {
    const patterns = [
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };

  const handleUrlSubmit = async () => {
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      setUrlError('Please enter a valid YouTube URL');
      return toast.error('Please enter a valid YouTube URL');
    }
    setUrlError('');

    setVerifying(true);
    try {
      const res = await fetch('/api/videos/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeUrl, videoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      setVerification(data);
      // Pre-fill from YouTube metadata
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description.slice(0, 500));
      if (data.tags?.length) setTags(data.tags.join(', '));
      setStep(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Title is required');
    if (!category) return toast.error('Please select a category');

    const videoId = extractVideoId(youtubeUrl);
    setSubmitting(true);

    try {
      const res = await fetch('/api/videos/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeUrl,
          videoId,
          title: title.trim(),
          description: description.trim(),
          category,
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          channelTitle: verification?.channelTitle || '',
          thumbnailUrl: verification?.thumbnailUrl || '',
          duration: verification?.duration || '',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSubmitted(data.video || { status: 'pending' });
      setStep(2);
      loadMine();
      toast.success('Video submitted for review!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="upload animate-fade-in">
        <div className="upload__header">
          <h1>Upload Video</h1>
          <p className="text-muted">Sign in to submit educational videos</p>
        </div>
        <button className="btn btn--primary" onClick={() => router.push('/login')}>Sign In</button>
      </div>
    );
  }

  return (
    <div className="upload animate-fade-in">
      <div className="upload__header">
        <h1><HiUpload size={28} /> Submit a Video</h1>
        <p className="text-muted">Share educational content with the community</p>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-md" style={{ marginBottom: 'var(--space-xl)', justifyContent: 'center' }}>
        {STEPS.map((label, i) => (
          <div key={label} className="flex gap-sm" style={{ alignItems: 'center', opacity: step >= i ? 1 : 0.4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: step > i ? 'var(--success)' : step === i ? 'var(--accent)' : 'var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontWeight: 600, fontSize: '0.85rem',
            }}>
              {step > i ? <HiCheckCircle size={18} /> : i + 1}
            </div>
            <span className="text-sm" style={{ fontWeight: step === i ? 600 : 400 }}>{label}</span>
            {i < STEPS.length - 1 && <div style={{ width: 40, height: 2, background: step > i ? 'var(--success)' : 'var(--border)' }} />}
          </div>
        ))}
      </div>

      {/* Step 0 - URL */}
      {step === 0 && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <h3 style={{ marginBottom: 'var(--space-md)' }}>
            <HiLink size={20} /> Paste YouTube URL
          </h3>
          <div className="input-group">
            <label className="input-label" htmlFor="upload-url">YouTube URL</label>
            <input
              id="upload-url"
              className="input"
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => { setYoutubeUrl(e.target.value); setUrlError(''); }}
              aria-invalid={urlError ? 'true' : undefined}
              aria-describedby={urlError ? 'upload-url-error' : undefined}
            />
            {urlError && <p id="upload-url-error" className="field-msg field-msg--error" role="alert">{urlError}</p>}
          </div>
          <button
            className="btn btn--primary"
            onClick={handleUrlSubmit}
            disabled={verifying || !youtubeUrl.trim()}
            style={{ marginTop: 'var(--space-md)', width: '100%' }}
          >
            {verifying ? (
              <><HiLightningBolt className="spin" size={16} /> Verifying with AI...</>
            ) : (
              <>Verify & Continue</>
            )}
          </button>

          {verification === false && (
            <div className="card" style={{ marginTop: 'var(--space-md)', border: '1px solid var(--danger)' }}>
              <p style={{ color: 'var(--danger)' }}><HiXCircle size={18} /> AI verification failed. The content may not be educational.</p>
            </div>
          )}
        </div>
      )}

      {/* Step 1 - Details */}
      {step === 1 && (
        <form className="card" style={{ maxWidth: 700, margin: '0 auto' }} onSubmit={handleSubmit}>
          {/* Verification result banner */}
          {verification && (
            <div className="card" style={{
              border: `1px solid ${verification.isEducational ? 'var(--success)' : 'var(--warning)'}`,
              marginBottom: 'var(--space-lg)',
              background: verification.isEducational ? 'rgba(0,206,201,0.05)' : 'rgba(253,203,110,0.05)',
            }}>
              <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                {verification.isEducational ?
                  <HiCheckCircle size={20} color="var(--success)" /> :
                  <HiXCircle size={20} color="var(--warning)" />
                }
                <strong>{verification.isEducational ? 'Educational Content Detected' : 'Warning: May Not Be Educational'}</strong>
              </div>
              <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                Confidence: {Math.round((verification.confidence || 0) * 100)}%
                {verification.reason && ` — ${verification.reason}`}
              </p>
            </div>
          )}

          {/* Thumbnail preview */}
          {verification?.thumbnailUrl && (
            <div style={{ marginBottom: 'var(--space-lg)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <img src={verification.thumbnailUrl} alt="Thumbnail" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
            </div>
          )}

          <div className="input-group">
            <label className="input-label" htmlFor="upload-title">Title *</label>
            <input id="upload-title" className="input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="upload-description">Description</label>
            <textarea id="upload-description" className="input" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} maxLength={2000} />
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="upload-category">Category *</label>
            <select id="upload-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="">Select a category</option>
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="upload-tags">Tags (comma-separated)</label>
            <input id="upload-tags" className="input" type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="react, javascript, tutorial" />
          </div>

          <div className="flex gap-sm" style={{ marginTop: 'var(--space-lg)' }}>
            <button type="button" className="btn btn--ghost" onClick={() => setStep(0)}>Back</button>
            <button type="submit" className="btn btn--primary" disabled={submitting} style={{ flex: 1 }}>
              {submitting ? 'Submitting...' : 'Submit Video'}
            </button>
          </div>
        </form>
      )}

      {/* Step 2 - Success */}
      {step === 2 && (() => {
        const s = STATUS[submitted?.status] || STATUS.pending;
        return (
          <GlassPanel className="upload-status text-center" style={{ maxWidth: 500, margin: '0 auto', padding: 'var(--space-2xl)' }}>
            <s.Icon size={64} color={s.color} aria-hidden="true" style={{ margin: '0 auto var(--space-lg)' }} />
            <h2>{submitted?.status === 'approved' ? 'Video approved' : submitted?.status === 'rejected' ? 'Video rejected' : 'Video submitted'}</h2>
            <p style={{ marginTop: 'var(--space-sm)' }}>
              <Badge tone={s.tone} role="status">{s.label}</Badge>
            </p>
            <p className="text-muted" style={{ marginTop: 'var(--space-sm)' }}>{s.text}</p>
            <div className="flex gap-sm" style={{ justifyContent: 'center', marginTop: 'var(--space-xl)' }}>
              <button className="btn btn--primary" onClick={() => router.push('/home')}>Go Home</button>
              <button className="btn btn--secondary" onClick={() => { setStep(0); setYoutubeUrl(''); setVerification(null); setTitle(''); setDescription(''); setCategory(''); setTags(''); setSubmitted(null); }}>
                Submit Another
              </button>
            </div>
          </GlassPanel>
        );
      })()}

      {/* Your submissions */}
      <section className="upload-mine" aria-labelledby="upload-mine-title">
        <h2 id="upload-mine-title" className="upload-mine__title">Your submissions</h2>
        {mineLoading ? (
          <div className="upload-mine__list" aria-busy="true">
            <Skeleton height={64} />
            <Skeleton height={64} />
          </div>
        ) : mine.length === 0 ? (
          <EmptyState title="No submissions yet" message="Videos you submit will show up here with their review status." />
        ) : (
          <ul className="upload-mine__list">
            {mine.map((v) => {
              const s = STATUS[v.status] || STATUS.pending;
              return (
                <li key={v.id} className="upload-mine__item glass-panel">
                  <s.Icon size={22} color={s.color} aria-hidden="true" />
                  <div className="upload-mine__info">
                    <span className="upload-mine__name">{v.title}</span>
                    <span className="text-muted text-sm">{s.text}</span>
                  </div>
                  <Badge tone={s.tone}>{s.label}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
