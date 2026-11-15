'use client';

import { useEffect, useState } from 'react';

// Monaco takes hex values only, so these mirror the live palette tokens in globals.css.
export const EDITOR_THEMES = { dark: 'eduorbite-dark', light: 'eduorbite-light' };

// Pass to <MonacoEditor beforeMount>. Receives the monaco instance Monaco already loaded;
// this file never imports Monaco itself, so it adds nothing to the initial bundle.
export function defineEduorbitThemes(monaco) {
  monaco.editor.defineTheme(EDITOR_THEMES.dark, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'eef2fb' },
      { token: 'comment', foreground: '6b7794', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'a066ff' },
      { token: 'string', foreground: '22d3ee' },
      { token: 'number', foreground: 'f59e0b' },
      { token: 'type', foreground: '5b8cff' },
      { token: 'delimiter', foreground: 'a3afc6' },
    ],
    colors: {
      'editor.background': '#0d1220',
      'editor.foreground': '#eef2fb',
      'editor.lineHighlightBackground': '#141b2d',
      'editor.selectionBackground': '#5b8cff4d',
      'editorCursor.foreground': '#5b8cff',
      'editorLineNumber.foreground': '#6b7794',
      'editorLineNumber.activeForeground': '#a3afc6',
      'editorIndentGuide.background1': '#1d2742',
      'editorWidget.background': '#172036',
      'editorWidget.border': '#2d3b60',
      'scrollbarSlider.background': '#2d3b6066',
    },
  });

  monaco.editor.defineTheme(EDITOR_THEMES.light, {
    base: 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: '0f172a' },
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7c3aed' },
      { token: 'string', foreground: '0e7490' },
      { token: 'number', foreground: 'b45309' },
      { token: 'type', foreground: '3b6df0' },
      { token: 'delimiter', foreground: '475569' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#0f172a',
      'editor.lineHighlightBackground': '#f1f5f9',
      'editor.selectionBackground': '#3b6df03d',
      'editorCursor.foreground': '#3b6df0',
      'editorLineNumber.foreground': '#94a3b8',
      'editorLineNumber.activeForeground': '#475569',
      'editorIndentGuide.background1': '#e2e8f0',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#cbd5e1',
    },
  });
}

function readTheme() {
  if (typeof document === 'undefined') return EDITOR_THEMES.dark;
  return document.documentElement.getAttribute('data-theme') === 'light'
    ? EDITOR_THEMES.light
    : EDITOR_THEMES.dark;
}

// Follows the site theme toggle (data-theme on <html>) so the editor never clashes with the page.
export function useEditorTheme() {
  const [theme, setTheme] = useState(EDITOR_THEMES.dark);

  useEffect(() => {
    setTheme(readTheme());
    const observer = new MutationObserver(() => setTheme(readTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
