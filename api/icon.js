// Uygulama ikonu: kodla çizilen PNG (lacivert zemin, turuncu top, beyaz "T"). ?s=192|512|180
import { deflateSync } from 'zlib';
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc = b => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const BG = [13, 27, 61], OR = [232, 136, 58], WH = [255, 255, 255];
function color(x, y) {
  const dx = x - 0.5, dy = y - 0.5;
  const inT = (x >= 0.33 && x <= 0.67 && y >= 0.33 && y <= 0.43) || (x >= 0.445 && x <= 0.555 && y >= 0.33 && y <= 0.70);
  if (inT) return WH;
  if (dx * dx + dy * dy <= 0.34 * 0.34) return OR;
  return BG;
}
export function png(s) {
  const N = 3, raw = Buffer.alloc((s * 3 + 1) * s);
  for (let y = 0; y < s; y++) {
    raw[y * (s * 3 + 1)] = 0;
    for (let x = 0; x < s; x++) {
      let r = 0, g = 0, b = 0;
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const c = color((x + (i + 0.5) / N) / s, (y + (j + 0.5) / N) / s); r += c[0]; g += c[1]; b += c[2]; }
      const o = y * (s * 3 + 1) + 1 + x * 3; raw[o] = Math.round(r / N / N); raw[o + 1] = Math.round(g / N / N); raw[o + 2] = Math.round(b / N / N);
    }
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(s, 0); ih.writeUInt32BE(s, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
export default function handler(req, res) {
  const s = [180, 192, 512].includes(+req.query.s) ? +req.query.s : 192;
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=31536000, immutable');
  res.status(200).send(png(s));
}
