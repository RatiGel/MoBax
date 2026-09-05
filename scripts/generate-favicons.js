// Build MoBax favicons from the bolt glyph in the logo PNG.
// Pure node (zlib only) — no ImageMagick / sharp available.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------- PNG decode (8-bit, non-interlaced) ---------- */
function decodePNG(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, width, height, bitDepth, colorType, interlace;
  const idat = []; let palette = null, trns = null;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (interlace) throw new Error('interlaced PNG unsupported');
  if (bitDepth !== 8) throw new Error('bit depth ' + bitDepth + ' unsupported');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let ri = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[ri++];
    const line = raw.subarray(ri, ri + stride); ri += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      } else if (filter !== 0) throw new Error('filter ' + filter);
      cur[x] = v & 0xff;
    }
  }
  // normalise to RGBA
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, n = width * height; i < n; i++) {
    const s = i * channels, d = i * 4;
    let r, g, b, a;
    switch (colorType) {
      case 6: r = out[s]; g = out[s + 1]; b = out[s + 2]; a = out[s + 3]; break;
      case 2: r = out[s]; g = out[s + 1]; b = out[s + 2]; a = 255; break;
      case 4: r = g = b = out[s]; a = out[s + 1]; break;
      case 0: r = g = b = out[s]; a = 255; break;
      case 3: {
        const p = out[s] * 3;
        r = palette[p]; g = palette[p + 1]; b = palette[p + 2];
        a = trns && out[s] < trns.length ? trns[out[s]] : 255;
        break;
      }
    }
    rgba[d] = r; rgba[d + 1] = g; rgba[d + 2] = b; rgba[d + 3] = a;
  }
  return { width, height, data: rgba };
}

/* ---------- PNG encode (RGBA8) ---------- */
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePNG(img) {
  const { width, height, data } = img;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- helpers ---------- */
const get = (img, x, y) => {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
};
function crop(img, x0, y0, w, h) {
  const out = { width: w, height: h, data: Buffer.alloc(w * h * 4) };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = get(img, x0 + x, y0 + y);
      const d = (y * w + x) * 4;
      out.data[d] = r; out.data[d + 1] = g; out.data[d + 2] = b; out.data[d + 3] = a;
    }
  return out;
}
/** Box-filter downscale with premultiplied alpha (keeps edges clean). */
function resize(img, w, h) {
  const out = { width: w, height: h, data: Buffer.alloc(w * h * 4) };
  const sx = img.width / w, sy = img.height / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.ceil((y + 1) * sy));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.ceil((x + 1) * sx));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < Math.min(y1, img.height); yy++)
        for (let xx = x0; xx < Math.min(x1, img.width); xx++) {
          const [pr, pg, pb, pa] = get(img, xx, yy);
          const f = pa / 255;
          r += pr * f; g += pg * f; b += pb * f; a += pa; n++;
        }
      const d = (y * w + x) * 4;
      const am = a / n;
      // un-premultiply
      const rr = am > 0 ? (r / n) / (am / 255) : 0;
      const gg = am > 0 ? (g / n) / (am / 255) : 0;
      const bb = am > 0 ? (b / n) / (am / 255) : 0;
      out.data[d] = Math.min(255, Math.round(rr));
      out.data[d + 1] = Math.min(255, Math.round(gg));
      out.data[d + 2] = Math.min(255, Math.round(bb));
      out.data[d + 3] = Math.round(am);
    }
  }
  return out;
}
function solid(w, h, [r, g, b, a = 255]) {
  const out = { width: w, height: h, data: Buffer.alloc(w * h * 4) };
  for (let i = 0; i < w * h; i++) {
    out.data[i * 4] = r; out.data[i * 4 + 1] = g; out.data[i * 4 + 2] = b; out.data[i * 4 + 3] = a;
  }
  return out;
}
/** Source-over composite of `src` onto `dst` at (ox,oy). */
function composite(dst, src, ox, oy) {
  for (let y = 0; y < src.height; y++) {
    const dy = oy + y; if (dy < 0 || dy >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = ox + x; if (dx < 0 || dx >= dst.width) continue;
      const s = (y * src.width + x) * 4, d = (dy * dst.width + dx) * 4;
      const sa = src.data[s + 3] / 255;
      if (sa === 0) continue;
      const da = dst.data[d + 3] / 255;
      const oa = sa + da * (1 - sa);
      for (let c = 0; c < 3; c++)
        dst.data[d + c] = Math.round((src.data[s + c] * sa + dst.data[d + c] * da * (1 - sa)) / oa);
      dst.data[d + 3] = Math.round(oa * 255);
    }
  }
  return dst;
}
/** Rounded-corner mask applied in place (radius in px, anti-aliased). */
function roundCorners(img, radius) {
  const { width: w, height: h } = img;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const cx = x < radius ? radius : (x >= w - radius ? w - radius - 1 : x);
      const cy = y < radius ? radius : (y >= h - radius ? h - radius - 1 : y);
      if (cx === x && cy === y) continue;
      const dist = Math.hypot(x - cx, y - cy);
      const cov = Math.max(0, Math.min(1, radius - dist + 0.5));
      const d = (y * w + x) * 4;
      img.data[d + 3] = Math.round(img.data[d + 3] * cov);
    }
  return img;
}

/* ---------- build ---------- */
const root = process.argv[2];
const NAVY = [30, 45, 90];   // #1E2D5A — brand navy
const BOLT = { x: 680, y: 74, w: 137, h: 236 };
const src = decodePNG(path.join(root, 'public/images/logo-light.png'));
const bolt = crop(src, BOLT.x, BOLT.y, BOLT.w, BOLT.h);
// The crop window clips the neighbouring "B" glyph — drop every non-amber pixel
// so the mark is the bolt alone.
for (let i = 0; i < bolt.width * bolt.height; i++) {
  const d = i * 4;
  const r = bolt.data[d], g = bolt.data[d + 1], b = bolt.data[d + 2];
  const isAmber = r > 170 && g > 100 && g < 225 && b < 110;
  if (!isAmber) bolt.data[d + 3] = 0;
}

/** Bolt centred on a navy square, `pad` = fraction of the square left as margin. */
function mark(size, pad, radius, bg) {
  const canvas = bg ? solid(size, size, bg) : { width: size, height: size, data: Buffer.alloc(size * size * 4) };
  const inner = size * (1 - pad * 2);
  const scale = Math.min(inner / bolt.width, inner / bolt.height);
  // Work at 4x then downsample for clean anti-aliased edges.
  const w = Math.max(1, Math.round(bolt.width * scale));
  const h = Math.max(1, Math.round(bolt.height * scale));
  const big = resize(bolt, w * 4, h * 4);
  const small = resize(big, w, h);
  composite(canvas, small, Math.round((size - w) / 2), Math.round((size - h) / 2));
  if (radius) roundCorners(canvas, radius);
  return canvas;
}

const outputs = [
  // [file, size, pad, radius, background]
  ['public/apple-touch-icon.png', 180, 0.20, 0, NAVY],  // iOS rounds it itself
  ['public/favicon-16x16.png', 16, 0.16, 3, NAVY],
  ['public/favicon-32x32.png', 32, 0.18, 6, NAVY],
  ['public/favicon-48x48.png', 48, 0.18, 9, NAVY],
  ['public/icon-192.png', 192, 0.22, 36, NAVY],
  ['public/icon-512.png', 512, 0.22, 96, NAVY],
  ['public/icon-maskable-512.png', 512, 0.32, 0, NAVY], // safe zone for Android masking
];

const icoSizes = [16, 32, 48];
const icoPNGs = [];
for (const [rel, size, pad, radius, bg] of outputs) {
  const img = mark(size, pad, radius, bg);
  const dest = path.join(root, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, encodePNG(img));
  console.log('wrote', rel, size + 'x' + size);
}
// favicon.ico — PNG-compressed entries (supported by every browser since IE11)
for (const s of icoSizes) icoPNGs.push(encodePNG(mark(s, s <= 16 ? 0.16 : 0.18, Math.round(s / 5.5), NAVY)));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(icoSizes.length, 4);
let offset = 6 + 16 * icoSizes.length;
const dirs = [];
icoSizes.forEach((s, i) => {
  const d = Buffer.alloc(16);
  d[0] = s === 256 ? 0 : s; d[1] = s === 256 ? 0 : s; d[2] = 0; d[3] = 0;
  d.writeUInt16LE(1, 4); d.writeUInt16LE(32, 6);
  d.writeUInt32LE(icoPNGs[i].length, 8); d.writeUInt32LE(offset, 12);
  offset += icoPNGs[i].length;
  dirs.push(d);
});
fs.writeFileSync(path.join(root, 'public/favicon.ico'), Buffer.concat([header, ...dirs, ...icoPNGs]));
console.log('wrote public/favicon.ico', icoSizes.join('/'));
