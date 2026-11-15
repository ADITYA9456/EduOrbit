'use client';

import { useEffect, useRef } from 'react';

const VARIANTS = {
  closing: { spacing: 22, maxRadius: 5.5, minRadius: 0.8, alpha: 0.55, reach: 150 },
  auth: { spacing: 26, maxRadius: 4.5, minRadius: 0.6, alpha: 0.16, reach: 130 },
};

// Dot grid whose dots swell with a slow wave and near the pointer.
// Pointer handling lives on the wrapper, which also holds the content above the canvas.
export default function HalftoneField({ variant = 'closing', className = '', children }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const cfg = VARIANTS[variant] || VARIANTS.closing;
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    let width = 0;
    let height = 0;
    let color = '91, 140, 255';
    let raf = 0;
    let visible = true;
    let reduced = motionQuery.matches;
    const pointer = { x: -9999, y: -9999 };

    const readColor = () => {
      const probe = getComputedStyle(wrap).getPropertyValue('--accent-primary').trim();
      const m = /^#([0-9a-f]{6})$/i.exec(probe);
      if (m) {
        const n = parseInt(m[1], 16);
        color = `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
      }
    };

    const draw = (time) => {
      ctx.clearRect(0, 0, width, height);
      const t = reduced ? 0 : time / 1600;
      const { spacing, maxRadius, minRadius, alpha, reach } = cfg;
      for (let y = spacing / 2; y < height; y += spacing) {
        for (let x = spacing / 2; x < width; x += spacing) {
          const wave = 0.5 + 0.5 * Math.sin(x * 0.011 + y * 0.008 + t);
          let k = 0.25 + 0.5 * wave;
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < reach * reach) k += (1 - Math.sqrt(d2) / reach) * 0.6;
          k = Math.min(k, 1);
          const r = minRadius + (maxRadius - minRadius) * k;
          ctx.fillStyle = `rgba(${color}, ${(alpha * (0.35 + 0.65 * k)).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const frame = (time) => {
      raf = 0;
      draw(time);
      schedule();
    };

    function schedule() {
      if (raf || reduced || !visible || document.hidden) return;
      raf = requestAnimationFrame(frame);
    }

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    };

    const onMove = (e) => {
      if (reduced) return;
      const rect = wrap.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onVisibility = () => (document.hidden ? stop() : schedule());
    const onMotionChange = () => {
      reduced = motionQuery.matches;
      if (reduced) {
        stop();
        onLeave();
        draw(0);
      } else {
        schedule();
      }
    };

    readColor();
    resize();
    schedule();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(wrap);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
      else stop();
    });
    io.observe(wrap);
    const themeObserver = new MutationObserver(() => {
      readColor();
      if (reduced) draw(0);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    motionQuery.addEventListener('change', onMotionChange);

    return () => {
      stop();
      resizeObserver.disconnect();
      io.disconnect();
      themeObserver.disconnect();
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      motionQuery.removeEventListener('change', onMotionChange);
    };
  }, [variant]);

  return (
    <div ref={wrapRef} className={`halftone halftone--${variant} ${className}`.trim()}>
      <canvas ref={canvasRef} className="halftone__canvas" aria-hidden="true" />
      <div className="halftone__content">{children}</div>
    </div>
  );
}
