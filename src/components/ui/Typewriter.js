'use client';

import { useEffect, useState } from 'react';

// Types text out character by character. The full text is always in the DOM for
// screen readers; the animated copy is aria-hidden. Reduced motion shows it instantly.
export default function Typewriter({ text, speed = 28, startDelay = 700, className }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(text.length);
      return;
    }
    let interval;
    const start = setTimeout(() => {
      interval = setInterval(() => {
        setCount((c) => {
          if (c >= text.length) {
            clearInterval(interval);
            return c;
          }
          return c + 1;
        });
      }, speed);
    }, startDelay);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  const done = count >= text.length;

  return (
    <p className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="typewriter">
        {text.slice(0, count)}
        {!done && <span className="typewriter__caret" />}
      </span>
      {/* Reserve the final height so typing never shifts the layout */}
      <span aria-hidden="true" className="typewriter__ghost">{text}</span>
    </p>
  );
}
