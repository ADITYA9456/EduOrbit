'use client';

import { useEffect, useRef, useState } from 'react';

const ROWS = [
  ['Run sample tests', ['Enter']],
  ['Submit (hidden tests)', ['Shift', 'Enter']],
  ['Save draft', ['S']],
  ['Toggle line comment', ['/']],
  ['Format code', null],
  ['Show this help', null],
];

export default function ShortcutsDialog({ open, onClose }) {
  const panelRef = useRef(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    panelRef.current?.querySelector('button')?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        e.preventDefault(); // single focusable control: keep focus in the dialog
        panelRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const mod = isMac ? '⌘' : 'Ctrl';
  const keys = (label, tail) => {
    if (label === 'Format code') return [isMac ? '⇧' : 'Shift', isMac ? '⌥' : 'Alt', 'F'];
    if (label === 'Show this help') return ['?'];
    return [mod, ...tail.map((k) => (k === 'Shift' && isMac ? '⇧' : k))];
  };

  return (
    <div className="dialog__backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panelRef} className="dialog judge-shortcuts" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title" className="dialog__title">Keyboard shortcuts</h2>
        <table className="judge-shortcuts__table">
          <tbody>
            {ROWS.map(([label, tail]) => (
              <tr key={label}>
                <td>{label}</td>
                <td className="judge-shortcuts__keys">
                  {keys(label, tail || []).map((k, i) => (
                    <span key={i}>{i > 0 && <span aria-hidden="true"> + </span>}<kbd>{k}</kbd></span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="judge-shortcuts__note">
          Press <kbd>?</kbd> anywhere outside the editor to open this. Format works for JavaScript; other
          languages have no built-in formatter in the editor.
        </p>
        <div className="dialog__actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
