'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const DISMISS_KEY = 'eduorbite-install-dismissed';
const DISMISS_DAYS = 14;
const MIN_PAGE_VIEWS = 3;
const MIN_DWELL_MS = 45000;

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return at && Date.now() - at < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const deferred = useRef(null);
  const views = useRef(0);
  const dwellDone = useRef(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || recentlyDismissed()) return;

    const onBeforeInstall = (e) => {
      e.preventDefault();
      deferred.current = e;
      setCanPrompt(true);
    };
    const onInstalled = () => {
      deferred.current = null;
      setVisible(false);
      setCanPrompt(false);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const timer = setTimeout(() => {
      dwellDone.current = true;
      setEngaged(true);
    }, MIN_DWELL_MS);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    views.current += 1;
    if (views.current >= MIN_PAGE_VIEWS) setEngaged(true);
  }, [pathname]);

  useEffect(() => {
    if (canPrompt && engaged) setVisible(true);
  }, [canPrompt, engaged]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  const install = async () => {
    const evt = deferred.current;
    if (!evt) return;
    setVisible(false);
    evt.prompt();
    try {
      const { outcome } = await evt.userChoice;
      if (outcome === 'dismissed') localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    deferred.current = null;
  };

  if (!visible) return null;

  return (
    <div className="install-prompt" role="dialog" aria-label="Install EduOrbite">
      <div className="install-prompt__text">
        <strong>Install EduOrbite</strong>
        <span>Open it from your home screen, full screen, without the browser bar.</span>
      </div>
      <div className="install-prompt__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={dismiss}>Not now</button>
        <button type="button" className="btn btn--primary btn--sm" onClick={install}>Install</button>
      </div>
    </div>
  );
}
