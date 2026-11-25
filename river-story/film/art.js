// Shared hand-drawn Madhubani drawing kit (used by film.html and styles.html).

// Madhubani-style hand-drawn film. window.drawFrame(f) renders frame f at 30 fps.
var W = 1080, H = 1080, FPS = 30;
const INK = '#1b120b', PAPER = '#efe0bf', VERM = '#c4361b', TURM = '#e2a11b', INDI = '#233f78',
  LEAF = '#3e7b3a', PINK = '#d75a7b', OCHRE = '#b98b4e', STONE = '#a69a82', SKY = '#86b6c6', WATER = '#c7d9cc';

let BOIL = 0; // changes every 3 frames -> "boiling" hand-drawn line
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const E = (t, a, b) => ease(clamp((t - a) / (b - a)));
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function hash(n) { const x = Math.sin(n * 127.1 + BOIL * 311.7) * 43758.5453; return x - Math.floor(x); }
const J = (n) => hash(n) * 2 - 1;
function pxk(c) { const m = c.getTransform(); return Math.hypot(m.a, m.b); }
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, t));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

// --- ink primitive: jittered, smoothed path; line weight constant in screen px
function ink(c, pts, o = {}) {
  const { close = true, fill = null, stroke = INK, lw = 2.6, jit = 1.1, seed = 0, alpha = 1 } = o;
  const k = pxk(c), j = jit / k;
  const P = pts.map((p, i) => [p[0] + J(seed + i * 1.7) * j, p[1] + J(seed + i * 2.3 + 50) * j]);
  c.beginPath();
  if (close) {
    const n = P.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = m(P[n - 1], P[0]); c.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const q = m(P[i], P[(i + 1) % n]); c.quadraticCurveTo(P[i][0], P[i][1], q[0], q[1]); }
    c.closePath();
  } else {
    c.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length - 1; i++) { const q = [(P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2]; c.quadraticCurveTo(P[i][0], P[i][1], q[0], q[1]); }
    const L = P[P.length - 1]; c.lineTo(L[0], L[1]);
  }
  c.save(); c.globalAlpha *= alpha;
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke && lw > 0) { c.strokeStyle = stroke; c.lineWidth = lw / k; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
  c.restore();
}
function ell(cx, cy, rx, ry, n = 40, wob = 0, ph = 0) {
  const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = 1 + wob * Math.sin(5 * a + ph); p.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]); } return p;
}
function line(c, x1, y1, x2, y2, o = {}) {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 30)); const p = [];
  for (let i = 0; i <= n; i++) p.push([lerp(x1, x2, i / n), lerp(y1, y2, i / n)]);
  ink(c, p, { close: false, ...o });
}

// --- paper
const TXT = document.createElement('canvas'); TXT.width = W; TXT.height = H;
const paper = document.createElement('canvas'); paper.width = W; paper.height = H;
(() => {
  const p = paper.getContext('2d'); p.fillStyle = PAPER; p.fillRect(0, 0, W, H);
  const R = rng(7);
  for (let i = 0; i < 26000; i++) { const v = R(); p.fillStyle = v < 0.5 ? 'rgba(120,85,40,.07)' : 'rgba(255,250,235,.10)'; p.fillRect(R() * W, R() * H, 1 + R() * 2, 1 + R() * 2); }
  p.strokeStyle = 'rgba(120,85,40,.10)'; p.lineWidth = 1;
  for (let i = 0; i < 420; i++) { const x = R() * W, y = R() * H, a = R() * 6.28, l = 6 + R() * 22; p.beginPath(); p.moveTo(x, y); p.quadraticCurveTo(x + Math.cos(a) * l / 2 + R() * 4, y + Math.sin(a) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); p.stroke(); }
  for (let i = 0; i < 30; i++) { const g = p.createRadialGradient(0, 0, 0, 0, 0, 1); p.save(); p.translate(R() * W, R() * H); p.scale(40 + R() * 90, 30 + R() * 60); g.addColorStop(0, 'rgba(150,105,50,.07)'); g.addColorStop(1, 'rgba(150,105,50,0)'); p.fillStyle = g; p.beginPath(); p.arc(0, 0, 1, 0, 7); p.fill(); p.restore(); }
  const v = p.createRadialGradient(W / 2, H / 2, W * 0.35, W / 2, H / 2, W * 0.75); v.addColorStop(0, 'rgba(90,55,20,0)'); v.addColorStop(1, 'rgba(90,55,20,.28)'); p.fillStyle = v; p.fillRect(0, 0, W, H);
})();

// --- fish
const BODY = (() => {
  const top = [], bot = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14, x = 100 - 170 * u, y = 46 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.68)), 0.85); top.push([x, -y]); if (i > 0 && i < 14) bot.push([x, y * 0.9]); }
  return top.concat(bot.reverse());
})();
const BODY_IN = BODY.map(([x, y]) => [15 + (x - 15) * 0.84, y * 0.8]);
function fish(c, o) {
  const { x, y, rot = 0, s = 1, col = VERM, band = TURM, detail = 1, eye = 'open', alpha = 1, seed = 0, lw = 2.4, wig = 0, barbels = false, mouth = 0 } = o;
  if (alpha <= 0.01) return;
  c.save(); c.translate(x, y); c.rotate(rot);
  const up = Math.cos(rot) < 0 ? -1 : 1; c.scale(s, s * up);
  c.globalAlpha *= alpha;
  const sd = seed * 13;
  const ta = wig, tp = (p) => { const dx = p[0] + 62, dy = p[1]; return [-62 + dx * Math.cos(ta) - dy * Math.sin(ta), dx * Math.sin(ta) + dy * Math.cos(ta)]; };
  const tail = [[-62, 0], [-122, -50], [-108, -14], [-104, 0], [-108, 14], [-122, 50]].map(tp);
  ink(c, tail, { fill: band, lw, seed: sd + 1 });
  if (detail) {
    for (let k = -3; k <= 3; k++) { const e = tp([-118, k * 13]); ink(c, [tp([-70, 0]), e], { close: false, lw: lw * 0.6, seed: sd + 10 + k }); }
    ink(c, [[22, -40], [-4, -74], [-30, -38]], { fill: col, lw, seed: sd + 3 });
    for (let k = 0; k < 4; k++) ink(c, [[14 - k * 11, -40], [-4 - k * 6, -66 + k * 6]], { close: false, lw: lw * 0.55, seed: sd + 20 + k });
    ink(c, [[12, 37], [-6, 64], [-26, 35]], { fill: band, lw, seed: sd + 4 });
  }
  ink(c, BODY, { fill: col, lw, seed: sd + 5 });
  if (detail) {
    c.save(); ink(c, BODY, { stroke: null, seed: sd + 5 }); c.clip();
    ink(c, [[-4, -48], [12, -48], [10, 48], [-6, 48]], { fill: band, lw: lw * 0.7, seed: sd + 6 });
    c.strokeStyle = INK; c.lineWidth = lw * 0.55 / pxk(c);
    for (let gx = -58, row = 0; gx < -6; gx += 13, row++) for (let gy = -48 + (row % 2) * 6; gy < 48; gy += 12) { c.beginPath(); c.arc(gx + J(sd + gx * 3 + gy) * 0.6, gy, 6, -Math.PI / 2, Math.PI / 2); c.stroke(); }
    c.fillStyle = INK; for (let gy = -36; gy <= 36; gy += 9) { c.beginPath(); c.arc(4, gy, 1.7, 0, 7); c.fill(); }
    for (let gx = 20; gx < 48; gx += 9) for (let gy = -28; gy <= 28; gy += 14) { c.beginPath(); c.arc(gx, gy + (gx % 2) * 4, 1.4, 0, 7); c.fill(); }
    c.restore();
    ink(c, BODY_IN, { lw: lw * 0.6, seed: sd + 7 });
    ink(c, [[54, -34], [46, 0], [54, 34]], { close: false, lw: lw * 0.8, seed: sd + 8 });
    ink(c, [[62, -28], [56, 0], [62, 28]], { close: false, lw: lw * 0.6, seed: sd + 9 });
  }
  // eye
  const er = detail ? 12 : 9;
  if (eye === 'closed') {
    ink(c, [[64, -10], [74, -18], [86, -10]], { close: false, lw: lw * 1.1, seed: sd + 30 });
  } else {
    ink(c, ell(75, -9, er * (eye === 'scared' ? 1.2 : 1), er * (eye === 'scared' ? 1.2 : 1), 14), { fill: PAPER, lw, seed: sd + 31 });
    c.fillStyle = INK; c.beginPath(); c.arc(77, -9, eye === 'scared' ? 3 : er * 0.45, 0, 7); c.fill();
    if (detail) for (let k = 0; k < 4; k++) ink(c, [[66 + k * 6, -9 - er], [64 + k * 7, -9 - er - 7]], { close: false, lw: lw * 0.5, seed: sd + 40 + k });
  }
  if (mouth > 0) ink(c, ell(96, 4, 5 * mouth + 1, 7 * mouth + 1, 10), { fill: '#5a1a10', lw: lw * 0.8, seed: sd + 50 });
  else ink(c, [[88, 6], [95, 8], [99, 4]], { close: false, lw: lw * 0.8, seed: sd + 50 });
  if (barbels) { ink(c, [[96, 8], [110, 26], [102, 48], [108, 62]], { close: false, lw: lw * 0.9, seed: sd + 60 }); ink(c, [[92, 10], [96, 34], [86, 52]], { close: false, lw: lw * 0.8, seed: sd + 61 }); }
  c.restore();
}

// --- stones, lotus, sun
function stoneShape(x, y, r, seed) { const R = rng(seed), p = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, rr = r * (0.82 + R() * 0.3); p.push([x + Math.cos(a) * rr * 1.12, y + Math.sin(a) * rr * 0.86]); } return p; }
function stone(c, x, y, r, seed, o = {}) {
  const { alpha = 1, fill = STONE, lw = 2.4 } = o; const p = stoneShape(x, y, r, seed);
  ink(c, p, { fill, lw, seed: seed * 3, alpha });
  c.save(); c.globalAlpha *= alpha; ink(c, p, { stroke: null, seed: seed * 3 }); c.clip();
  for (let k = 0; k < 5; k++) { const o2 = r * 0.25 + k * r * 0.16; line(c, x + o2 - r * 0.4, y + r, x + o2 + r * 0.3, y - r * 0.1 + k * 4, { lw: 1.3, seed: seed * 7 + k }); }
  c.fillStyle = INK; const R = rng(seed + 5); for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x - r * 0.45 + R() * r * 0.5, y - r * 0.4 + R() * r * 0.4, 1.8, 0, 7); c.fill(); }
  c.restore();
}
function lotus(c, x, y, s, open, seed = 0) {
  c.save(); c.translate(x, y); c.scale(s, s);
  ink(c, ell(0, 18, 46, 20, 18), { fill: LEAF, lw: 2.2, seed: seed + 1 });
  for (let k = -2; k <= 2; k++) line(c, 0, 18, k * 18, 30 - Math.abs(k) * 3, { lw: 1.2, seed: seed + 5 + k });
  const n = 7, spread = lerp(0.18, 0.55, open), h = lerp(30, 38, open);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * spread;
    const tip = [Math.cos(a) * h, Math.sin(a) * h + 8], l = [Math.cos(a - 0.5) * 11, Math.sin(a - 0.5) * 11 + 8], r = [Math.cos(a + 0.5) * 11, Math.sin(a + 0.5) * 11 + 8];
    ink(c, [[0, 10], l, tip, r], { fill: i % 2 ? PINK : '#e88ea3', lw: 2, seed: seed + 20 + i });
  }
  c.restore();
}
function sun(c, x, y, r, t, col = TURM, seed = 0) {
  c.save(); c.translate(x, y);
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + t * 0.4, a2 = a + 0.18, a3 = a - 0.18; ink(c, [[Math.cos(a3) * r * 1.05, Math.sin(a3) * r * 1.05], [Math.cos(a) * r * 1.55, Math.sin(a) * r * 1.55], [Math.cos(a2) * r * 1.05, Math.sin(a2) * r * 1.05]], { fill: i % 2 ? VERM : TURM, lw: 2, seed: seed + i }); }
  ink(c, ell(0, 0, r, r, 24), { fill: col, lw: 2.6, seed: seed + 40 });
  ink(c, ell(0, 0, r * 0.82, r * 0.82, 24), { lw: 1.4, seed: seed + 41 });
  ink(c, [[-r * .45, -r * .12], [-r * .25, -r * .25], [-r * .08, -r * .12]], { close: false, lw: 2, seed: seed + 42 });
  ink(c, [[r * .08, -r * .12], [r * .25, -r * .25], [r * .45, -r * .12]], { close: false, lw: 2, seed: seed + 43 });
  c.fillStyle = INK; c.beginPath(); c.arc(-r * .26, -r * .14, r * .06, 0, 7); c.arc(r * .26, -r * .14, r * .06, 0, 7); c.fill();
  ink(c, [[0, -r * .05], [-r * .07, r * .18], [r * .04, r * .2]], { close: false, lw: 1.8, seed: seed + 44 });
  ink(c, [[-r * .25, r * .38], [0, r * .5], [r * .25, r * .38]], { fill: VERM, lw: 1.8, seed: seed + 45 });
  c.restore();
}
function moon(c, x, y, r, seed = 0) {
  c.save(); c.translate(x, y);
  const p = []; for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + i / 16 * Math.PI; p.push([Math.cos(a + Math.PI) * r * -1 * -1 * -1 + 0, 0]); }
  const outer = [], inner = []; for (let i = 0; i <= 16; i++) { const a = Math.PI / 2 + i / 16 * Math.PI; outer.push([Math.cos(a) * r, Math.sin(a) * r]); inner.push([Math.cos(a) * r * 0.45 - r * 0.05, Math.sin(a) * r]); }
  ink(c, outer.concat(inner.reverse()), { fill: '#f6edd3', lw: 2.4, seed });
  c.fillStyle = INK; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(-r * 0.7 + k * 3, -r * 0.4 + k * r * 0.2, 2, 0, 7); c.fill(); }
  c.restore();
}

// --- hatch (ink darkness)
function hatch(c, alpha, x0, y0, x1, y1, gap = 9, seed = 0) {
  if (alpha <= 0.01) return;
  c.save(); c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.clip(); c.globalAlpha *= alpha; c.fillStyle = 'rgba(27,18,11,.55)'; c.fillRect(x0, y0, x1 - x0, y1 - y0);
  const h = y1 - y0;
  for (let x = x0 - h, i = 0; x < x1; x += gap, i++) line(c, x, y1, x + h, y0, { lw: 1.6, jit: 1.5, seed: seed + i });
  for (let x = x0, i = 0; x < x1 + h; x += gap * 1.7, i++) line(c, x, y0, x - h, y1, { lw: 1.1, jit: 1.5, seed: seed + 900 + i });
  c.restore();
}

// --- pond world
const P0 = { x: 540, y: 560, rx: 320, ry: 255 };
const RING = (() => { const R = rng(3), a = []; const n = 34; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2; a.push({ t, r: 27 + R() * 10, seed: 100 + i }); } return a; })();
const SCHOOL = (() => { const R = rng(5), a = []; const cols = [TURM, OCHRE, PINK, LEAF, '#d9692f', TURM]; for (let i = 0; i < 99; i++) a.push({ r: 0.22 + Math.sqrt(R()) * 0.66, a0: R() * 6.28, sp: (0.25 + R() * 0.25) * (R() < 0.85 ? 1 : -1), s: 0.15 + R() * 0.05, col: cols[i % cols.length], seed: i }); return a; })();
const CRACKS = (() => { const R = rng(21), a = []; for (let i = 0; i < 40; i++) { const t = R() * 6.28, u = 0.4 + R() * 0.55; let x = P0.x + Math.cos(t) * P0.rx * u, y = P0.y + Math.sin(t) * P0.ry * u; const p = [[x, y]]; for (let k = 0; k < 4; k++) { x += R() * 50 - 25; y += R() * 50 - 25; p.push([x, y]); } a.push(p); } return a; })();

function pondWater(c, sc = 1, col = WATER) {
  ink(c, ell(P0.x, P0.y, P0.rx * sc, P0.ry * sc, 48, 0.02), { fill: col, lw: 3, seed: 500 });
  for (let k = 1; k <= 6; k++) ink(c, ell(P0.x, P0.y, P0.rx * sc * k / 7, P0.ry * sc * k / 7, 40, 0.03, k + BOIL * 0.0), { lw: 1.3, stroke: INDI, seed: 510 + k, alpha: 0.65 });
}
function ringStones(c, o = {}) {
  const { gap = null, appear = -100, t = 0, alpha = 1 } = o;
  RING.forEach((s, i) => {
    if (gap !== null && Math.abs(Math.atan2(Math.sin(s.t - gap), Math.cos(s.t - gap))) < 0.14) return;
    const ta = t - (appear + i * 0.06); if (ta < 0) return; const k = E(ta, 0, 0.35);
    const x = P0.x + Math.cos(s.t) * (P0.rx + 34), y = P0.y + Math.sin(s.t) * (P0.ry + 34) - (1 - k) * 40;
    stone(c, x, y, s.r * lerp(1.5, 1, k), s.seed, { alpha: alpha * k });
  });
}
function school(c, t, o = {}) {
  const { sc = 1, alpha = 1, speed = 1, jitter = 0 } = o;
  SCHOOL.forEach((f, i) => {
    const a = f.a0 + t * f.sp * speed, r = f.r * sc;
    const x = P0.x + Math.cos(a) * P0.rx * r + (jitter ? Math.sin(t * 37 + i) * jitter : 0), y = P0.y + Math.sin(a) * P0.ry * r;
    const rot = a + (f.sp > 0 ? Math.PI / 2 : -Math.PI / 2);
    fish(c, { x, y, rot, s: f.s, col: f.col, band: INK === f.col ? TURM : (i % 3 ? TURM : VERM), detail: 0, lw: 1.5, seed: f.seed, alpha, wig: Math.sin(t * 8 + i) * 0.25 });
  });
}

// --- caption ribbon
function ribbon(c, parts, o = {}) {
  const { y = 960, size = 52, font = 'Amita', weight = 700, p = 1, alpha = 1 } = o;
  if (alpha <= 0.01) return;
  const f = (font === 'Amita' ? '700 ' : '') + size + 'px "' + font + '"';
  c.save(); c.font = f; c.globalAlpha *= alpha;
  const ws = parts.map((s) => c.measureText(s.t).width), tw = ws.reduce((a, b) => a + b, 0);
  const w = tw + 90, h = size * 1.55, x0 = W / 2 - w / 2, y0 = y - h / 2;
  const shp = [[x0, y0], [x0 + w, y0], [x0 + w - 22, y0 + h / 2], [x0 + w, y0 + h], [x0, y0 + h], [x0 + 22, y0 + h / 2]];
  const k = E(p, 0, 0.25);
  c.save(); c.translate(W / 2, y); c.scale(lerp(0.6, 1, k), 1); c.translate(-W / 2, -y); c.globalAlpha *= k;
  ink(c, shp, { fill: '#f6ead0', lw: 2.6, seed: 700, jit: 0.8 });
  ink(c, shp.map(([a, b]) => [W / 2 + (a - W / 2) * 0.975, y + (b - y) * 0.82]), { lw: 1.2, seed: 701, jit: 0.8 });
  c.restore();
  // write-on reveal
  const rp = E(p, 0.12, 0.7);
  c.beginPath(); c.rect(W / 2 - tw / 2 - 4, y0, (tw + 8) * rp, h); c.clip();
  let x = W / 2 - tw / 2; c.textBaseline = 'middle';
  parts.forEach((s, i) => { c.fillStyle = s.c || INK; c.fillText(s.t, x, y + size * 0.08); x += ws[i]; });
  c.restore();
}
const cap = (t, a, b, parts, o = {}) => { if (t < a || t > b + 0.01) return null; return () => 0; };
function captionAt(c, t, a, b, parts, o = {}) { if (t < a) return; const fade = 1 - E(t, b - 0.35, b); ribbon(c, parts, { ...o, p: (t - a) / 1.6, alpha: fade }); }

// --- border (Madhubani frame)
function border(c) {
  const o = 18, i = 46;
  c.save();
  c.fillStyle = '#2a1a0e'; c.beginPath(); c.rect(0, 0, W, H); c.rect(o, o, W - 2 * o, H - 2 * o); c.fill('evenodd');
  c.fillStyle = PAPER; c.beginPath(); c.rect(o, o, W - 2 * o, H - 2 * o); c.rect(i, i, W - 2 * i, H - 2 * i); c.fill('evenodd');
  const cols = [VERM, TURM, LEAF, INDI]; let n = 0;
  const side = (x0, y0, dx, dy, nx, ny, len) => {
    const cnt = Math.round(len / 30);
    for (let k = 0; k < cnt; k++) {
      const ax = x0 + dx * k * len / cnt, ay = y0 + dy * k * len / cnt, bx = ax + dx * len / cnt, by = ay + dy * len / cnt;
      ink(c, [[ax, ay], [bx, by], [(ax + bx) / 2 + nx * 24, (ay + by) / 2 + ny * 24]], { fill: cols[n % 4], lw: 1.6, seed: 2000 + n, jit: 0.7 }); n++;
    }
  };
  side(o + 2, o + 2, 1, 0, 0, 1, W - 2 * o - 4); side(W - o - 2, o + 2, 0, 1, -1, 0, H - 2 * o - 4);
  side(W - o - 2, H - o - 2, -1, 0, 0, -1, W - 2 * o - 4); side(o + 2, H - o - 2, 0, -1, 1, 0, H - 2 * o - 4);
  [[i, 2.6, 2900], [o, 2.2, 2950], [i - 6, 1.1, 2990]].forEach(([q, lw, sd]) => { line(c, q, q, W - q, q, { lw, seed: sd, jit: 0.6 }); line(c, W - q, q, W - q, H - q, { lw, seed: sd + 9, jit: 0.6 }); line(c, W - q, H - q, q, H - q, { lw, seed: sd + 18, jit: 0.6 }); line(c, q, H - q, q, q, { lw, seed: sd + 27, jit: 0.6 }); });
  c.restore();
}

