'use client';

import Link from 'next/link';
import { useState } from 'react';
import HalftoneField from './HalftoneField';
import './guest-home.css';

const FAQ = [
  {
    q: 'How do videos get on EduOrbit?',
    a: 'Each video gets an AI check, then admin approval, before it goes live.',
  },
  {
    q: 'What happens to a video that gets reported?',
    a: 'A video is unpublished after 10 reports.',
  },
  {
    q: 'How do points work?',
    a: 'Coding problems are worth 10, 25, or 50 points depending on difficulty. There are also 10 badges to earn.',
  },
  {
    q: 'Which languages does the code editor support?',
    a: 'JavaScript, Python, Java, C++, C, and SQL.',
  },
];

export default function GuestClosing() {
  const [open, setOpen] = useState(null);

  return (
    <section className="closing" aria-labelledby="closing-title">
      <HalftoneField variant="closing" className="closing__field">
        <div className="closing__inner">
          <div className="closing__cta">
            <h2 id="closing-title" className="closing__title">Ready to start learning?</h2>
            <p className="closing__lead">Watch checked videos, practise code, enter contests, and climb the leaderboard.</p>
            <Link href="/signup" className="ghero__btn ghero__btn--primary">Get Started</Link>
          </div>

          <div className="faq">
            <h3 className="faq__heading">Questions</h3>
            {FAQ.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q} className="faq__item">
                  <h4 className="faq__q">
                    <button
                      type="button"
                      id={`faq-btn-${i}`}
                      className="faq__btn"
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      {item.q}
                      <span className="faq__icon" aria-hidden="true" />
                    </button>
                  </h4>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-btn-${i}`}
                    className="faq__panel"
                    hidden={!isOpen}
                  >
                    <p>{item.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </HalftoneField>
    </section>
  );
}
