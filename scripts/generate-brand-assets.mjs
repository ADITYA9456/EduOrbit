/* eslint-disable no-console */
// Renders the brand PNGs (PWA icons, favicon, Open Graph image) with headless Chrome so they get
// real gradients and text. Output is committed; re-run only when the branding changes.
//   PUPPETEER_DIR=<folder containing node_modules/puppeteer-core> node scripts/generate-brand-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pupDir = process.env.PUPPETEER_DIR || root;
const puppeteer = (await import(pathToFileURL(createRequire(path.join(pupDir, 'x.js')).resolve('puppeteer-core')).href)).default;
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const A = '#5b8cff';
const B = '#a066ff';
const mark = (size, stroke = '#fff') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="3" fill="${stroke}" stroke="none"/><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-25 12 12)"/></svg>`;

// rounded: icon tile with transparent corners. Otherwise full-bleed (iOS and maskable crop it themselves).
const iconHtml = (size, scale, rounded) => `<html><body style="margin:0;background:transparent">
<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
background:linear-gradient(135deg,${A},${B});${rounded ? `border-radius:${Math.round(size * 0.22)}px;` : ''}">${mark(Math.round(size * scale))}</div></body></html>`;

const ogHtml = `<html><body style="margin:0"><div style="width:1200px;height:630px;box-sizing:border-box;padding:72px;display:flex;flex-direction:column;justify-content:space-between;
background:#07090f;color:#eef2fb;font-family:'Segoe UI',Arial,sans-serif;position:relative;overflow:hidden">
<div style="position:absolute;right:-120px;top:-120px;width:560px;height:560px;border-radius:50%;border:2px solid #1d2742"></div>
<div style="position:absolute;right:-40px;top:-40px;width:400px;height:400px;border-radius:50%;border:2px solid #1d2742"></div>
<div style="display:flex;align-items:center;gap:20px">
  <div style="width:72px;height:72px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,${A},${B})">${mark(46)}</div>
  <div style="font-size:34px;font-weight:700;letter-spacing:-0.02em">EduOrbite</div>
</div>
<div>
  <div style="font-size:78px;line-height:1.04;font-weight:800;letter-spacing:-0.035em;max-width:900px">Learn from video.<br>Prove it in code.</div>
  <div style="margin-top:28px;font-size:30px;line-height:1.35;color:#a3afc6;max-width:860px">Curated lessons, a real code judge, weekly contests and a leaderboard you can actually climb.</div>
</div>
<div style="display:flex;gap:14px;font-size:24px;color:#8a96b2">
  <span style="padding:8px 18px;border:1px solid #2d3b60;border-radius:999px">Video lessons</span>
  <span style="padding:8px 18px;border:1px solid #2d3b60;border-radius:999px">Coding judge</span>
  <span style="padding:8px 18px;border:1px solid #2d3b60;border-radius:999px">Contests</span>
</div></div></body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const shot = async (html, w, h, file, transparent = false) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(html);
  const out = path.join(root, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: h } });
  console.log('wrote', file);
};

await shot(iconHtml(192, 0.6, true), 192, 192, 'public/icons/icon-192.png', true);
await shot(iconHtml(512, 0.6, true), 512, 512, 'public/icons/icon-512.png', true);
await shot(iconHtml(512, 0.44, false), 512, 512, 'public/icons/icon-maskable-512.png');
await shot(iconHtml(180, 0.6, false), 180, 180, 'public/icons/apple-touch-icon.png');
await shot(iconHtml(64, 0.6, true), 64, 64, 'public/icons/favicon-64.png', true);
await shot(ogHtml, 1200, 630, 'public/og.png');
await browser.close();

// favicon.ico = a single PNG-encoded 64x64 image
const png = fs.readFileSync(path.join(root, 'public/icons/favicon-64.png'));
const head = Buffer.alloc(22);
head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
head[6] = 64; head[7] = 64; head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12);
head.writeUInt32LE(png.length, 14); head.writeUInt32LE(22, 18);
fs.writeFileSync(path.join(root, 'public/favicon.ico'), Buffer.concat([head, png]));
fs.rmSync(path.join(root, 'public/icons/favicon-64.png'));
console.log('wrote public/favicon.ico');
