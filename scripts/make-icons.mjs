// Generates PNG app icons from the same shapes as assets/icon.svg.
// Run: node scripts/make-icons.mjs   (no dependencies – uses node:zlib)
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x0b, 0x0d, 0x10];
const FG = [0xc6, 0xff, 0x3d];

/* ---- shape coverage in the 64x64 SVG coordinate space ---- */

const dist = (x, y, ax, ay, bx, by) => {
  const vx = bx - ax, vy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x - (ax + t * vx), y - (ay + t * vy));
};

function isInk(x, y) {
  // ring
  const r = Math.hypot(x - 32, y - 34);
  if (Math.abs(r - 22) <= 2) return true;
  // hand
  if (dist(x, y, 32, 34, 44, 22) <= 2) return true;
  // centre dot
  if (r <= 3.5) return true;
  // crown
  if (dist(x, y, 26, 8, 38, 8) <= 2) return true;
  return false;
}

function render(size) {
  const ss = 4; // supersampling
  const px = new Uint8Array(size * size * 3);
  const scale = 64 / size;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let hit = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (i + (sx + 0.5) / ss) * scale;
          const y = (j + (sy + 0.5) / ss) * scale;
          if (isInk(x, y)) hit++;
        }
      }
      const a = hit / (ss * ss);
      const o = (j * size + i) * 3;
      for (let c = 0; c < 3; c++) px[o + c] = Math.round(BG[c] * (1 - a) + FG[c] * a);
    }
  }
  return px;
}

/* ---- minimal PNG encoder (RGB, 8-bit) ---- */

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgb) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    Buffer.from(rgb.buffer, y * size * 3, size * 3).copy(raw, y * (size * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('assets', { recursive: true });
for (const size of [180, 192, 512]) {
  const file = `assets/icon-${size}.png`;
  writeFileSync(file, png(size, render(size)));
  console.log('wrote', file);
}
