// Generates the PWA icons into public/icons. Dependency-free (zlib only).
// Run: node scripts/generate-pwa-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [7, 9, 15];
const FG = [91, 140, 255];
const OUT = path.join(__dirname, '..', 'public', 'icons');

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Mark lives in a 24x24 box: dot at the centre plus an ellipse stroke rotated -25deg.
function coverage(ux, uy) {
  const dx = ux - 12;
  const dy = uy - 12;
  if (dx * dx + dy * dy <= 9) return true;
  const a = (-25 * Math.PI) / 180;
  const rx = dx * Math.cos(a) + dy * Math.sin(a);
  const ry = -dx * Math.sin(a) + dy * Math.cos(a);
  // Approximate the stroke as a band around the ellipse using a normalised radius.
  const r = Math.sqrt((rx / 10) ** 2 + (ry / 4.2) ** 2);
  const grad = Math.hypot(rx / 100, ry / 17.64) / Math.max(r, 1e-6);
  const dist = Math.abs(r - 1) / Math.max(grad, 1e-6);
  return dist <= 0.9;
}

function render(size, scale) {
  const buf = Buffer.alloc(size * size * 3);
  const mark = size * scale;
  const offset = (size - mark) / 2;
  const SS = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ux = ((x + (sx + 0.5) / SS - offset) / mark) * 24;
          const uy = ((y + (sy + 0.5) / SS - offset) / mark) * 24;
          if (ux >= 0 && ux <= 24 && uy >= 0 && uy <= 24 && coverage(ux, uy)) hit++;
        }
      }
      const t = hit / (SS * SS);
      const i = (y * size + x) * 3;
      for (let c = 0; c < 3; c++) buf[i + c] = Math.round(BG[c] + (FG[c] - BG[c]) * t);
    }
  }
  return png(size, buf);
}

fs.mkdirSync(OUT, { recursive: true });
const files = {
  'icon-192.png': [192, 0.62],
  'icon-512.png': [512, 0.62],
  // Maskable: mark stays inside the central 80% safe zone.
  'icon-maskable-512.png': [512, 0.46],
  'apple-touch-icon.png': [180, 0.62],
};
for (const [name, [size, scale]] of Object.entries(files)) {
  fs.writeFileSync(path.join(OUT, name), render(size, scale));
  console.log('wrote', name);
}
