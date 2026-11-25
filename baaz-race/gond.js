// Gond-art drawing kit: flat bright pigments on black, dash-line ("digna") and dot patterns, slight hand wobble.
var W = 1080, H = 1080, FPS = 30;
const C = {
  bg: '#120e0b', ink: '#120c08', cream: '#fbf1dc', yel: '#f5c400', ora: '#f2811d', red: '#e0322b', mag: '#d6337a',
  pur: '#7b4bb7', tea: '#14958c', grn: '#4bb543', dgrn: '#22804a', blu: '#1f63c4', sky: '#2b86c5', brn: '#7a3d1c',
  rust: '#9a4a1f', ochre: '#c98a2e', pink: '#f08fb0', gold: '#f7c531',
};
let BOIL = 0;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const E = (t, a, b) => ease(clamp((t - a) / (b - a)));
const L01 = (t, a, b) => clamp((t - a) / (b - a));
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function hash(n) { const x = Math.sin(n * 127.1 + BOIL * 311.7) * 43758.5453; return x - Math.floor(x); }
const J = (n) => hash(n) * 2 - 1;
function pxk(c) { const m = c.getTransform(); return Math.hypot(m.a, m.b) || 1; }
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, clamp(t)));
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
const ell = (cx, cy, rx, ry, n = 24) => { const p = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return p; };
const mv = (P, dx, dy) => P.map(([x, y]) => [x + dx, y + dy]);

function buildPath(c, P, close, sharp = false) {
  c.beginPath();
  if (sharp) { P.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); if (close) c.closePath(); return; }
  if (close) {
    const n = P.length, m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const s = m(P[n - 1], P[0]); c.moveTo(s[0], s[1]);
    for (let i = 0; i < n; i++) { const q = m(P[i], P[(i + 1) % n]); c.quadraticCurveTo(P[i][0], P[i][1], q[0], q[1]); }
    c.closePath();
  } else {
    c.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length - 1; i++) { const q = [(P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2]; c.quadraticCurveTo(P[i][0], P[i][1], q[0], q[1]); }
    const Lp = P[P.length - 1]; c.lineTo(Lp[0], Lp[1]);
  }
}
function jit(c, P, amt, seed) { const k = pxk(c), j = amt / k; return amt ? P.map((p, i) => [p[0] + J(seed + i * 1.7) * j, p[1] + J(seed + i * 2.3 + 50) * j]) : P; }
// filled + outlined shape; leaves the path current (for clip)
function shape(c, P, o = {}) {
  const { fill = null, stroke = C.ink, lw = 3, jt = 0.6, seed = 0, close = true, alpha = 1, sharp = false } = o;
  const k = pxk(c); buildPath(c, jit(c, P, jt, seed), close, sharp);
  if (!fill && !stroke) return;
  c.save(); c.globalAlpha *= alpha;
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke && lw > 0) { c.strokeStyle = stroke; c.lineWidth = lw / k; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
  c.restore();
}
function clipTo(c, P, seed = 0, jt = 0.6, sharp = false) { buildPath(c, jit(c, P, jt, seed), true, sharp); c.clip(); }
// thick limb: outline then fill (w in local units)
function limb(c, P, w, fill, o = {}) {
  const { ow = 3, outline = C.ink, seed = 0, jt = 0.5, alpha = 1, cap = 'round' } = o;
  const k = pxk(c); buildPath(c, jit(c, P, jt, seed), false);
  c.save(); c.globalAlpha *= alpha; c.lineCap = cap; c.lineJoin = 'round';
  if (outline) { c.strokeStyle = outline; c.lineWidth = w + 2 * ow / k; c.stroke(); }
  c.strokeStyle = fill; c.lineWidth = w; c.stroke(); c.restore();
}
function bbox(P) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; P.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return { x0, y0, x1, y1 }; }
// Gond "digna": rows of dashes inside a shape (screen-constant density)
function dashRows(c, P, o = {}) {
  const { col = C.cream, gap = 10, dash = [8, 6], lw = 2.2, ang = 0, seed = 0, wave = 0, alpha = 1, jt = 0.6, sharp = false } = o;
  const k = pxk(c), b = bbox(P);
  c.save(); clipTo(c, P, seed, jt, sharp); c.globalAlpha *= alpha;
  c.strokeStyle = col; c.lineWidth = lw / k; c.setLineDash(dash.map((d) => d / k)); c.lineCap = 'round';
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, R = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2 + 4;
  c.translate(cx, cy); c.rotate(ang);
  const g = gap / k, st = Math.max(R / 40, 6 / k); let r = 0;
  for (let y = -R; y <= R; y += g, r++) {
    c.lineDashOffset = (r * 5) / k; c.beginPath();
    for (let x = -R; x <= R + 0.01; x += st) { const yy = y + (wave ? Math.sin(x * k / wave + r) * 2.5 / k : 0); x === -R ? c.moveTo(x, yy) : c.lineTo(x, yy); }
    c.stroke();
  }
  c.restore();
}
// dots in a grid inside a shape
function dotFill(c, P, o = {}) {
  const { col = C.cream, gap = 12, r = 2.2, seed = 0, alpha = 1, local = false, wob = 0.3, sharp = false } = o;
  const k = pxk(c), b = bbox(P), g = local ? gap : gap / k, rr = local ? r : r / k, R = rng(seed + 991);
  c.save(); clipTo(c, P, seed, 0.6, sharp); c.globalAlpha *= alpha; c.fillStyle = col;
  let row = 0;
  for (let y = b.y0; y <= b.y1; y += g, row++) for (let x = b.x0 + (row % 2) * g / 2; x <= b.x1; x += g) { c.beginPath(); c.arc(x + (R() - 0.5) * g * wob, y + (R() - 0.5) * g * wob, rr * (0.8 + R() * 0.4), 0, 7); c.fill(); }
  c.restore();
}
// dotted inner contour (white beads along the edge)
function beads(c, P, o = {}) {
  const { col = C.cream, inset = 0.88, gap = 11, r = 2, alpha = 1 } = o;
  const k = pxk(c), b = bbox(P), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const Q = P.map(([x, y]) => [cx + (x - cx) * inset, cy + (y - cy) * inset]);
  c.save(); c.globalAlpha *= alpha; c.fillStyle = col;
  for (let i = 0; i < Q.length; i++) { const a = Q[i], bq = Q[(i + 1) % Q.length]; const n = Math.max(1, Math.floor(Math.hypot(bq[0] - a[0], bq[1] - a[1]) * k / gap)); for (let s = 0; s < n; s++) { c.beginPath(); c.arc(lerp(a[0], bq[0], s / n), lerp(a[1], bq[1], s / n), r / k, 0, 7); c.fill(); } }
  c.restore();
}
function eye(c, x, y, r, o = {}) {
  const { iris = C.yel, look = [0, 0], lid = 0, lidCol = null, slit = false, ring = null } = o;
  if (ring) shape(c, ell(x, y, r * 1.45, r * 1.45, 16), { fill: ring, lw: 2 });
  shape(c, ell(x, y, r, r, 16), { fill: C.cream, lw: 2.4 });
  c.fillStyle = iris; c.beginPath(); c.arc(x + look[0] * r * 0.25, y + look[1] * r * 0.25, r * 0.68, 0, 7); c.fill();
  c.fillStyle = C.ink; c.beginPath();
  if (slit) c.ellipse(x + look[0] * r * 0.3, y + look[1] * r * 0.3, r * 0.14, r * 0.55, 0, 0, 7); else c.arc(x + look[0] * r * 0.32, y + look[1] * r * 0.32, r * 0.36, 0, 7);
  c.fill();
  c.fillStyle = C.cream; c.beginPath(); c.arc(x + look[0] * r * 0.32 - r * 0.15, y + look[1] * r * 0.32 - r * 0.18, r * 0.12, 0, 7); c.fill();
  if (lid > 0 && lidCol) { c.save(); c.beginPath(); c.arc(x, y, r + 0.5, 0, 7); c.clip(); c.fillStyle = lidCol; c.fillRect(x - r - 2, y - r - 2, 2 * r + 4, (2 * r + 4) * lid); c.restore(); shape(c, [[x - r, y - r + 2 * r * lid], [x + r, y - r + 2 * r * lid]], { close: false, lw: 2.4 }); }
}
function cam(c, cx, cy, z) { c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-cx, -cy); }
function texture(c, col, seed, n = 1400, a = 0.06) { const R = rng(seed); c.fillStyle = col; c.globalAlpha = a; for (let i = 0; i < n; i++) c.fillRect(R() * W, R() * H, 2, 2); c.globalAlpha = 1; }

// ---------- creatures (all face right, origin on the ground under the body) ----------
function cheetah(c, o) {
  const { x, y, s = 1, ph = 0, run = 0, tumble = 0, flail = 0, crown = 0, proud = 0, seed = 0, ghost = 0, look = [0.3, 0], alpha = 1 } = o;
  c.save(); c.translate(x, y); c.rotate(tumble); c.scale(s, s); c.globalAlpha *= alpha;
  const col = ghost ? 'rgba(0,0,0,0)' : '#f0a21c', far = ghost ? 'rgba(0,0,0,0)' : '#c47f12', st = ghost ? null : C.ink;
  const bob = -12 * Math.abs(Math.sin(ph)) * run;
  const legs = (isFar) => {
    [[70, -88, 0], [-68, -88, 1]].forEach(([hx, hy, i]) => {
      const a = ph + (isFar ? 0.7 : 0) + (i ? Math.PI : 0);
      const sw = run * 0.95 * Math.sin(a) + flail * Math.sin(ph * 2.3 + i * 2 + (isFar ? 1 : 0)) * 1.1;
      const th1 = Math.PI / 2 + (i ? -sw : sw);
      const bend = run * (0.25 + 0.7 * (0.5 + 0.5 * Math.sin(a + 1.4))) + flail * 0.5;
      const th2 = th1 + (i ? -bend : bend);
      const kx = hx + Math.cos(th1) * 46, ky = hy + bob + Math.sin(th1) * 46, fx = kx + Math.cos(th2) * 44, fy = ky + Math.sin(th2) * 44;
      if (ghost) { shape(c, [[hx, hy + bob], [kx, ky], [fx, fy]], { close: false, stroke: C.cream, lw: 2, jt: 0, alpha: 0.8 }); return; }
      limb(c, [[hx, hy + bob], [kx, ky], [fx, fy]], i ? 24 : 20, isFar ? far : col, { seed: seed + i * 7 + (isFar ? 3 : 0) });
      shape(c, ell(fx + 6, fy, 10, 6, 10), { fill: isFar ? far : col, lw: 2.5, seed: seed + 20 + i });
    });
  };
  legs(true);
  const tw = Math.sin(ph * 0.5) * run * 16 + Math.sin(ph * 0.3 + 1) * 6 + flail * Math.sin(ph * 1.7) * 30;
  const tail = [[-95, -100 + bob], [-140, -96 + bob + tw * 0.3], [-180, -112 + bob + tw], [-214, -98 + bob + tw * 1.4]];
  if (ghost) shape(c, tail, { close: false, stroke: C.cream, lw: 2, jt: 0, alpha: 0.8 });
  else { limb(c, tail, 13, col, { seed: seed + 30 }); for (let k = 0; k < 3; k++) { const p = tail[3], q = tail[2], u = 0.15 + k * 0.28; const px = lerp(p[0], q[0], u), py = lerp(p[1], q[1], u); limb(c, [[px, py - 7], [px + 2, py + 7]], 4, C.ink, { ow: 0, seed: seed + 33 + k }); } }
  const T = mv([[-105, -92], [-95, -112], [-60, -128], [0, -130], [60, -128], [95, -120], [108, -96], [90, -72], [30, -68], [-40, -72], [-90, -76]], 0, bob);
  const hb = bob + (run ? Math.sin(ph) * 3 : 0) - proud * 8;
  const N = mv([[80, -122], [114, -152], [134, -122], [100, -90]], 0, hb);
  const HD = mv([[108, -140], [122, -160], [150, -158], [168, -143], [176, -127], [166, -114], [138, -110], [114, -118]], 0, hb);
  if (ghost) {
    [T, N, HD].forEach((P) => beads(c, P, { inset: 1, gap: 9, r: 2.4, col: C.cream }));
    legs(false); c.restore(); return;
  }
  shape(c, T, { fill: col, lw: 3, seed: seed + 40 });
  c.save(); clipTo(c, T, seed + 40); const R = rng(seed + 5); c.fillStyle = '#2a1608';
  for (let gx = -110; gx < 110; gx += 20) for (let gy = -134; gy < -64; gy += 17) { c.beginPath(); c.arc(gx + R() * 9, gy + bob + R() * 7, 4 + R() * 2, 0, 7); c.fill(); }
  c.restore();
  dashRows(c, mv([[-80, -82], [70, -82], [70, -70], [-80, -70]], 0, bob), { col: C.cream, gap: 5, dash: [6, 5], lw: 2.4, seed: seed + 41 });
  shape(c, N, { fill: col, lw: 3, seed: seed + 50 });
  shape(c, mv([[118, -152], [118, -174], [134, -158]], 0, hb), { fill: col, lw: 2.5, seed: seed + 51 });
  shape(c, mv([[132, -157], [142, -176], [149, -157]], 0, hb), { fill: col, lw: 2.5, seed: seed + 52 });
  shape(c, HD, { fill: col, lw: 3, seed: seed + 53 });
  eye(c, 150, -141 + hb, 8, { iris: C.yel, look });
  limb(c, [[151, -133 + hb], [158, -122 + hb], [163, -113 + hb]], 4, '#2a1608', { ow: 0, seed: seed + 55 });
  shape(c, [[170, -132 + hb], [178, -128 + hb], [172, -123 + hb]], { fill: C.ink, lw: 2 });
  c.fillStyle = '#2a1608'; [[128, -128], [135, -118], [124, -146]].forEach(([a, b]) => { c.beginPath(); c.arc(a, b + hb, 2.6, 0, 7); c.fill(); });
  legs(false);
  if (crown > 0) {
    c.save(); c.translate(140, -160 + hb - (1 - crown) * 300); c.rotate(-0.15);
    const Cr = [[-30, 0], [-34, -32], [-17, -14], [0, -40], [17, -14], [34, -32], [30, 0]];
    shape(c, Cr, { fill: C.gold, lw: 3, sharp: true }); dashRows(c, [[-30, -8], [30, -8], [30, 0], [-30, 0]], { col: C.red, gap: 4, dash: [5, 4], lw: 3, sharp: true });
    [[-34, -32], [0, -40], [34, -32]].forEach(([a, b]) => shape(c, ell(a, b, 5, 5, 8), { fill: C.red, lw: 2 }));
    c.restore();
  }
  c.restore();
}

function featherWing(c, open, flap, col, cut, seed, far) {
  c.save(); c.translate(22, -100);
  const rot = lerp(Math.PI + 0.2, 2 * Math.PI - 1.95, open) + flap * open;
  c.rotate(rot); c.scale(lerp(0.8, 1.32, open), -lerp(0.8, 1.05, open));
  const pc = far ? mix(col, '#000000', 0.25) : col, fc = far ? mix(col, '#000000', 0.38) : mix(col, '#000000', 0.15);
  const n = 6;
  for (let k = n - 1; k >= 0; k--) {
    if ((k + 1) / n < cut * 0.75) continue;
    const lenF = 1 - 0.55 * cut;
    const rx = 72 + k * 5, ry = -6 + k * 7;
    const tx = lerp(rx, lerp(178, 132, k / n), lenF), ty = lerp(ry, -10 + k * 12, lenF);
    const ang = Math.atan2(ty - ry, tx - rx), nx = -Math.sin(ang) * 9, ny = Math.cos(ang) * 9;
    const P = [[rx + nx, ry + ny], [lerp(rx, tx, 0.6) + nx * 1.1, lerp(ry, ty, 0.6) + ny * 1.1], [tx, ty], [lerp(rx, tx, 0.6) - nx * 1.1, lerp(ry, ty, 0.6) - ny * 1.1], [rx - nx, ry - ny]];
    shape(c, P, { fill: fc, lw: 2.4, seed: seed + k * 3 });
    shape(c, [[rx, ry], [lerp(rx, tx, 0.9), lerp(ry, ty, 0.9)]], { close: false, stroke: C.cream, lw: 1.6, jt: 0.3, alpha: far ? 0.4 : 0.8 });
  }
  for (let k = 0; k < 5; k++) {
    const x0 = 8 + k * 15, dl = (1 - 0.35 * cut);
    shape(c, [[x0 - 8, 16], [x0 - 6, 16 + 26 * dl], [x0, 22 + 30 * dl], [x0 + 7, 16 + 26 * dl], [x0 + 9, 16]], { fill: fc, lw: 2.2, seed: seed + 40 + k });
  }
  const CV = [[0, -12], [48, -24], [100, -20], [104, 6], [80, 22], [40, 26], [0, 24]];
  shape(c, CV, { fill: pc, lw: 2.8, seed: seed + 60 });
  if (!far) { dashRows(c, CV, { col: C.cream, gap: 8, dash: [7, 5], lw: 2, ang: 0.15, seed: seed + 60, alpha: 0.85 }); beads(c, CV, { col: C.yel, inset: 0.8, gap: 10, r: 2 }); }
  c.restore();
}
function eagle(c, o) {
  const { x, y, s = 1, open = 0, flap = 0, ph = 0, walk = 0, tilt = 0, look = [0.4, 0], headDown = 0, cut = 0, mark = 0, sad = 0, seed = 0, tuck = 0, alpha = 1, sil = null } = o;
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(tilt); c.globalAlpha *= alpha;
  const body = sil || '#8c4320', wingC = sil || '#5e2c14', leg = sil || '#f3b81a';
  const S = sil ? { stroke: null } : {};
  if (open > 0.05) featherWing(c, open, flap + 0.28, wingC, cut, seed + 1, true);
  const TL = [[-55, -80], [-120, -62], [-128, -46], [-114, -40], [-58, -56]];
  shape(c, TL, { fill: wingC, lw: 2.6, seed: seed + 5, ...S }); if (!sil) dashRows(c, TL, { col: C.cream, gap: 7, dash: [10, 6], lw: 2, ang: -0.25, seed: seed + 5 });
  if (tuck < 1) [0, 1].forEach((i) => {
    const a = ph + i * Math.PI, hx = 8 - i * 20, hy = -48;
    const fx = hx + Math.sin(a) * 16 * walk + (-30 - hx) * tuck, fy = -6 - Math.max(0, -Math.cos(a)) * 12 * walk + (-44) * tuck;
    limb(c, [[hx, hy], [(hx + fx) / 2 + 3, (hy + fy) / 2], [fx, fy]], 9, leg, { seed: seed + 10 + i, outline: sil ? null : C.ink });
    if (!sil) for (let t = -1; t <= 1; t++) shape(c, [[fx, fy], [fx + 12 + t * 2, fy + 2 + t * 4], [fx + 16 + t * 3, fy + 8 + t * 4]], { close: false, lw: 3, seed: seed + 14 + i * 3 + t });
  });
  const B = [[-62, -74], [-35, -108], [10, -122], [45, -112], [58, -90], [50, -62], [22, -44], [-25, -44], [-58, -58]];
  shape(c, B, { fill: body, lw: 3, seed: seed + 20, ...S });
  if (!sil) { const CH = [[22, -116], [58, -92], [50, -62], [22, -44], [2, -58], [8, -100]]; shape(c, CH, { fill: '#f2dcb0', lw: 0, seed: seed + 21 }); c.save(); clipTo(c, CH, seed + 21); c.strokeStyle = '#8c4320'; c.lineWidth = 2.4 / pxk(c); for (let yy = -110; yy < -40; yy += 9) { c.beginPath(); c.moveTo(10, yy); c.lineTo(32, yy + 6); c.lineTo(56, yy); c.stroke(); } c.restore(); }
  c.save(); c.translate(40, -108); c.rotate(headDown * 0.65); c.translate(-40, 108);
  const HD = ell(60, -128, 27, 24, 16);
  shape(c, HD, { fill: sil || '#f2dcb0', lw: 3, seed: seed + 30, ...S });
  if (!sil) {
    dashRows(c, HD, { col: '#9a5a2a', gap: 7, dash: [6, 7], lw: 2, ang: 0.2, seed: seed + 30, alpha: 0.7 });
    shape(c, [[80, -138], [104, -133], [103, -120], [94, -123], [82, -121]], { fill: '#f3b81a', lw: 2.6, seed: seed + 31 });
    shape(c, [[96, -129], [104, -133], [103, -120]], { fill: C.ink, lw: 1.5, seed: seed + 32 });
    eye(c, 67, -134, 8, { iris: C.ora, look });
    shape(c, sad ? [[54, -141], [78, -149]] : [[55, -147], [80, -141]], { close: false, lw: 5, seed: seed + 33 });
    if (mark > 0) {
      c.save(); c.globalAlpha *= clamp(mark * 1.5); shape(c, ell(52, -148, 15, 14, 14), { fill: C.red, lw: 0, seed: seed + 34 });
      shape(c, [[43, -157], [61, -139]], { close: false, stroke: C.cream, lw: 3.5 }); shape(c, [[61, -157], [43, -139]], { close: false, stroke: C.cream, lw: 3.5 });
      shape(c, [[48, -135], [48, -126]], { close: false, stroke: C.red, lw: 4 }); c.restore();
    }
  }
  c.restore();
  featherWing(c, open, flap, wingC, cut, seed + 2, false);
  c.restore();
}

function croc(c, o) {
  const { x, y, s = 1, ph = 0, walk = 0, swim = 0, jaw = 0, seed = 0, look = [0, 0], flat = 0 } = o;
  c.save(); c.translate(x, y); c.scale(s, s);
  const col = '#3f9a4a', dk = '#22683a';
  const sway = (xx) => xx < -40 ? Math.sin(ph - xx / 70) * (-40 - xx) / 170 * (6 + swim * 26) : 0;
  const top = (xx) => xx < 110 ? -10 - 46 * Math.pow(Math.sin(Math.PI * clamp((xx + 210) / 440)), 0.6) * (1 - flat * 0.25) : lerp(-46, -34, (xx - 110) / 90);
  const bot = (xx) => xx < 110 ? -8 - 4 * Math.sin(Math.PI * clamp((xx + 210) / 440)) : lerp(-18, -24, (xx - 110) / 90);
  const legs = (far) => [60, -70].forEach((lx, i) => {
    const a = ph * 1.0 + i * Math.PI + (far ? 1.2 : 0);
    const P = swim ? [[lx, -16], [lx - 26, -6], [lx - 48, -10]] : [[lx, -16], [lx + 12 + Math.sin(a) * 14 * walk, -6], [lx + 26 + Math.sin(a) * 18 * walk, 0 - Math.max(0, Math.cos(a)) * 8 * walk]];
    limb(c, P, 13, far ? dk : col, { seed: seed + i * 5 + (far ? 2 : 0) });
  });
  legs(true);
  const P = []; for (let xx = -210; xx <= 200; xx += 15) P.push([xx, top(xx) + sway(xx)]); for (let xx = 200; xx >= -210; xx -= 15) P.push([xx, bot(xx) + sway(xx)]);
  for (let xx = -190; xx <= 90; xx += 18) shape(c, [[xx - 8, top(xx) + sway(xx) + 3], [xx, top(xx) + sway(xx) - 12], [xx + 8, top(xx) + sway(xx) + 3]], { fill: (xx / 18) % 2 ? C.yel : dk, lw: 2, seed: seed + 100 + xx });
  shape(c, P, { fill: col, lw: 3, seed: seed + 20 });
  dashRows(c, P, { col: dk, gap: 8, dash: [11, 5], lw: 3, seed: seed + 20 });
  dashRows(c, [[-180, -16], [110, -16], [110, -10], [-180, -10]], { col: C.cream, gap: 5, dash: [4, 6], lw: 2.4, seed: seed + 21 });
  if (jaw > 0) { c.save(); c.translate(110, -22); c.rotate(jaw * 0.35); shape(c, [[0, 0], [88, -4], [86, 6], [0, 8]], { fill: col, lw: 2.6, seed: seed + 22 }); c.restore(); }
  for (let xx = 120; xx < 192; xx += 9) shape(c, [[xx, -24], [xx + 4, -17], [xx + 8, -24]], { fill: C.cream, lw: 1.4, jt: 0.3 });
  shape(c, ell(120, top(120) - 4, 13, 10, 12), { fill: col, lw: 2.6, seed: seed + 23 });
  eye(c, 121, top(120) - 6, 7, { iris: C.yel, slit: true, look });
  c.fillStyle = C.ink; c.beginPath(); c.arc(192, -36, 2.6, 0, 7); c.fill();
  legs(false);
  c.restore();
}

function elephant(c, o) {
  const { x, y, s = 1, ph = 0, walk = 0, pant = 0, trunkUp = 0, earFlap = 0, seed = 0, log = 0, t = 0 } = o;
  c.save(); c.translate(x, y); c.scale(s, s);
  const col = '#6a62b0', dk = '#4a4390';
  const heave = Math.sin(t * 6) * 3 * pant;
  const legs = (far) => [[-85, 0], [80, 1]].forEach(([lx, i]) => {
    const a = ph + i * Math.PI + (far ? Math.PI / 2 : 0), dx = Math.sin(a) * 14 * walk, lift = Math.max(0, Math.cos(a)) * 8 * walk;
    const X = lx + (far ? 30 : 0);
    limb(c, [[X, -100], [X + dx * 0.5, -50], [X + dx, -8 - lift]], 44, far ? dk : col, { seed: seed + i * 4 + (far ? 1 : 0), cap: 'butt' });
    if (!far) for (let k = -1; k <= 1; k++) shape(c, [[X + dx + k * 12 - 5, -8 - lift], [X + dx + k * 12, -16 - lift], [X + dx + k * 12 + 5, -8 - lift]], { fill: C.cream, lw: 1.6, jt: 0.3 });
  });
  legs(true);
  limb(c, [[-138, -150], [-152, -120], [-158, -95]], 5, col, { seed: seed + 9 });
  shape(c, ell(-158, -90, 6, 9, 8), { fill: C.ink, lw: 1 });
  const B = mv([[-140, -120], [-118, -185], [-40, -222], [50, -222], [110, -190], [128, -130], [100, -90], [-110, -88]], 0, heave);
  shape(c, B, { fill: col, lw: 3, seed: seed + 20 });
  dashRows(c, B, { col: C.cream, gap: 11, dash: [9, 7], lw: 2.2, ang: 0.3, seed: seed + 20, alpha: 0.8 });
  const band = mv([[-60, -220], [10, -224], [30, -90], [-70, -88]], 0, heave);
  shape(c, band, { fill: C.red, lw: 2.6, seed: seed + 21 }); dotFill(c, band, { col: C.yel, gap: 12, r: 3, seed: seed + 21 });
  shape(c, mv([[-62, -88], [30, -90], [20, -70], [-50, -70]], 0, heave), { fill: C.yel, lw: 2.4, seed: seed + 22 });
  legs(false);
  const H = mv([[95, -210], [150, -228], [188, -195], [190, -145], [168, -118], [122, -112], [96, -150]], 0, heave);
  shape(c, H, { fill: col, lw: 3, seed: seed + 30 });
  // trunk
  const tu = trunkUp, sw = Math.sin(t * 2) * 6 + pant * Math.sin(t * 5) * 4;
  const TP = [[178, -150], [lerp(200, 210, tu) + sw * 0.3, lerp(-115, -180, tu)], [lerp(206, 240, tu) + sw, lerp(-70, -215, tu)], [lerp(196, 268, tu) + sw, lerp(-24, -232, tu)]].map(([a, b]) => [a, b + heave]);
  for (let k = 0; k < 3; k++) limb(c, [TP[k], TP[k + 1]], 34 - k * 8, col, { seed: seed + 40 + k });
  for (let k = 0; k < 6; k++) { const u = (k + 1) / 7, seg = Math.min(2, Math.floor(u * 3)), uu = u * 3 - seg; const p = [lerp(TP[seg][0], TP[seg + 1][0], uu), lerp(TP[seg][1], TP[seg + 1][1], uu)]; limb(c, [[p[0] - 8, p[1]], [p[0] + 8, p[1] + 2]], 2.4, dk, { ow: 0, seed: seed + 50 + k }); }
  if (log > 0) { c.save(); c.translate(TP[3][0], TP[3][1] + 10); c.rotate(-0.2); const LG = [[-90, -14], [90, -14], [96, 0], [90, 14], [-90, 14], [-96, 0]]; shape(c, LG, { fill: C.brn, lw: 3 }); dashRows(c, LG, { col: C.ochre, gap: 6, dash: [16, 6], lw: 2.4 }); shape(c, ell(-92, 0, 8, 13, 10), { fill: C.ochre, lw: 2 }); c.restore(); }
  shape(c, mv([[172, -132], [196, -126], [214, -104], [200, -112], [180, -120]], 0, heave), { fill: C.cream, lw: 2.4, seed: seed + 31 });
  const ef = 1 + 0.12 * earFlap * Math.sin(t * 7);
  const EAR = [[118, -212], [58, -206], [34, -160], [50, -112], [95, -104], [120, -132]].map(([a, b]) => [118 + (a - 118) * ef, b + heave]);
  shape(c, EAR, { fill: dk, lw: 3, seed: seed + 32 }); dashRows(c, EAR, { col: C.pink, gap: 8, dash: [6, 6], lw: 2.4, ang: 1.2, seed: seed + 32 }); beads(c, EAR, { col: C.yel, inset: 0.85, gap: 10 });
  eye(c, 162, -178 + heave, 7, { iris: C.ora, lid: pant ? 0.45 : 0, lidCol: col, look: [0.3, 0.2] });
  if (pant > 0) for (let k = 0; k < 3; k++) { const u = ((t * 1.4 + k / 3) % 1); c.save(); c.globalAlpha = (1 - u) * pant; shape(c, ell(TP[3][0] + 20 + u * 60, TP[3][1] + 10 - u * 40, 10 + u * 22, 8 + u * 16, 14), { fill: null, stroke: C.cream, lw: 2.4 }); c.restore(); }
  c.restore();
}

function owl(c, o) {
  const { x, y, s = 1, blow = 0, point = 0, seed = 0, t = 0 } = o;
  c.save(); c.translate(x, y); c.scale(s, s);
  const B = [[0, -130], [42, -110], [54, -55], [32, -4], [-32, -4], [-54, -55], [-42, -110]];
  shape(c, [[-46, -140], [-28, -116], [-50, -112]], { fill: '#5b3593', lw: 2.4 }); shape(c, [[46, -140], [28, -116], [50, -112]], { fill: '#5b3593', lw: 2.4 });
  shape(c, B, { fill: C.pur, lw: 3, seed: seed + 1 });
  const CH = [[0, -76], [30, -60], [32, -18], [0, -8], [-32, -18], [-30, -60]];
  shape(c, CH, { fill: '#9d74d6', lw: 2, seed: seed + 2 });
  c.save(); clipTo(c, CH, seed + 2); c.strokeStyle = C.cream; c.lineWidth = 2.2 / pxk(c); for (let yy = -70; yy < 0; yy += 10) { c.beginPath(); c.moveTo(-30, yy); c.lineTo(0, yy + 8); c.lineTo(30, yy); c.stroke(); } c.restore();
  const wingR = [[42, -100], [60, -60 - point * 50], [50, -20 - point * 30], [36, -30]];
  shape(c, [[-42, -100], [-60, -60], [-50, -20], [-36, -30]], { fill: '#5b3593', lw: 2.4 }); shape(c, wingR, { fill: '#5b3593', lw: 2.4 });
  [-19, 19].forEach((ex) => { shape(c, ell(ex, -98, 20, 20, 16), { fill: C.ora, lw: 2.4 }); shape(c, ell(ex, -98, 15, 15, 14), { fill: C.yel, lw: 1.6 }); eye(c, ex, -98, 10, { iris: '#f2811d', look: [0.3, 0.2] }); });
  shape(c, [[-6, -84], [6, -84], [0, -72]], { fill: C.yel, lw: 2 });
  if (blow > 0) {
    shape(c, [[2, -78], [34, -76], [34, -68], [2, -70]], { fill: C.gold, lw: 2.2 }); shape(c, ell(38, -72, 7, 7, 10), { fill: C.gold, lw: 2.2 });
    for (let k = 0; k < 3; k++) { const u = ((t * 3 + k / 3) % 1); c.save(); c.globalAlpha = (1 - u) * blow; c.strokeStyle = C.cream; c.lineWidth = 3 / pxk(c); c.beginPath(); c.arc(40, -72, 14 + u * 50, -0.7, 0.7); c.stroke(); c.restore(); }
  }
  [-14, 14].forEach((fx) => shape(c, [[fx - 8, -4], [fx - 10, 6], [fx, 2], [fx + 10, 6], [fx + 8, -4]], { fill: C.ora, lw: 2 }));
  c.restore();
}

// ---------- props and world ----------
function leaf(c, x, y, ang, len, col, seed) {
  c.save(); c.translate(x, y); c.rotate(ang);
  const P = [[0, 0], [len * 0.3, -len * 0.24], [len * 0.75, -len * 0.16], [len, 0], [len * 0.75, len * 0.16], [len * 0.3, len * 0.24]];
  shape(c, P, { fill: col, lw: 2.4, jt: 0, seed });
  shape(c, [[2, 0], [len * 0.9, 0]], { close: false, stroke: C.cream, lw: 1.6, jt: 0 });
  c.strokeStyle = C.ink; c.lineWidth = 1.4; for (let k = 1; k < 5; k++) { const u = k / 5 * len * 0.85; c.beginPath(); c.moveTo(u, 0); c.lineTo(u + len * 0.12, -len * 0.12); c.moveTo(u, 0); c.lineTo(u + len * 0.12, len * 0.12); c.stroke(); }
  c.restore();
}
function makeTree(seed, h = 560, pal = [C.grn, C.tea, C.yel, '#2f8f5b', C.ora, C.mag]) {
  const w = Math.round(h * 1.05), cv = document.createElement('canvas'); cv.width = w; cv.height = h; const c = cv.getContext('2d'); const R = rng(seed);
  const bx = w / 2, base = h - 2, sc = h / 560;
  const Lt = [], Rt = []; for (let i = 0; i <= 10; i++) { const u = i / 10, yy = base - u * h * 0.58, sw = Math.sin(u * 3 + seed) * 14 * sc, hw = lerp(44, 14, u) * sc; Lt.push([bx + sw - hw, yy]); Rt.push([bx + sw + hw, yy]); }
  const TR = Lt.concat(Rt.reverse());
  const tops = [];
  for (let b = 0; b < 7; b++) { const u = 0.38 + b * 0.09, y0 = base - u * h * 0.58, dir = b % 2 ? 1 : -1, len = (0.2 + R() * 0.16) * h; const p = [[bx + dir * 6, y0], [bx + dir * len * 0.45, y0 - len * 0.45], [bx + dir * len * 0.85, y0 - len * 0.72 - R() * 30 * sc]]; limb(c, p, 13 * sc, C.brn, { jt: 0 }); tops.push(p[2]); }
  tops.push([bx, base - h * 0.62]);
  shape(c, TR, { fill: C.brn, lw: 3, jt: 0 }); dashRows(c, TR, { col: C.ochre, gap: 9, dash: [14, 6], lw: 2.4, ang: Math.PI / 2, jt: 0 });
  tops.forEach((tp, b) => { for (let k = 0; k < 11; k++) { const ang = -Math.PI / 2 + (k - 5) * 0.34 + (R() - 0.5) * 0.2, sz = (34 + R() * 22) * sc; leaf(c, tp[0] + Math.cos(ang) * 6, tp[1] + Math.sin(ang) * 6, ang, sz, pal[(k + b) % pal.length], seed + b * 20 + k); } });
  return cv;
}
function makeCloud(seed, w = 300) {
  const cv = document.createElement('canvas'); cv.width = w + 20; cv.height = w * 0.55 + 20; const c = cv.getContext('2d'); const R = rng(seed);
  const circ = []; for (let i = 0; i < 6; i++) { const u = i / 5; circ.push([10 + w * (0.15 + u * 0.7), 10 + w * 0.32 - Math.sin(u * Math.PI) * w * 0.12 + R() * 10, w * (0.12 + Math.sin(u * Math.PI) * 0.08)]); }
  c.lineWidth = 6; c.strokeStyle = C.ink; circ.forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); });
  c.fillStyle = '#eaf3fa'; circ.forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); });
  c.save(); c.beginPath(); circ.forEach(([x, y, r]) => { c.moveTo(x + r, y); c.arc(x, y, r, 0, 7); }); c.clip(); c.strokeStyle = '#8ec9ea'; c.lineWidth = 2.4; c.setLineDash([8, 6]);
  for (let y = 0; y < cv.height; y += 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(cv.width, y + 4); c.stroke(); } c.restore();
  return cv;
}
function gsun(c, x, y, r, t, col = C.yel) {
  c.save(); c.translate(x, y);
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + t * 0.3; shape(c, [[Math.cos(a - 0.12) * r * 1.05, Math.sin(a - 0.12) * r * 1.05], [Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6], [Math.cos(a + 0.12) * r * 1.05, Math.sin(a + 0.12) * r * 1.05]], { fill: i % 2 ? C.ora : C.red, lw: 2.2, seed: 500 + i }); }
  shape(c, ell(0, 0, r, r, 28), { fill: col, lw: 3, seed: 540 });
  for (let k = 1; k <= 3; k++) beads(c, ell(0, 0, r, r, 40), { col: k % 2 ? C.red : C.ora, inset: 1 - k * 0.22, gap: 11, r: 2.6 });
  c.restore();
}
function gmoon(c, x, y, r) {
  const o = [], n = []; for (let i = 0; i <= 18; i++) { const a = Math.PI / 2 + i / 18 * Math.PI; o.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); n.push([x + Math.cos(a) * r * 0.45 - r * 0.05, y + Math.sin(a) * r]); }
  const P = o.concat(n.reverse()); shape(c, P, { fill: '#f6edd3', lw: 2.6 }); dotFill(c, P, { col: '#c9b98a', gap: 9, r: 2 });
}
function feather(c, x, y, rot, s, col = '#5e2c14') {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const P = [[0, 0], [16, -7], [44, -6], [60, 0], [44, 6], [16, 7]]; shape(c, P, { fill: col, lw: 2.2 });
  shape(c, [[-6, 0], [56, 0]], { close: false, stroke: C.cream, lw: 1.6 }); c.restore();
}
function scissors(c, x, y, rot, s, open) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  [1, -1].forEach((d) => { c.save(); c.rotate(d * open * 0.45);
    const BL = [[0, -6 * d], [120, -2 * d], [128, 0], [0, 6 * d]]; shape(c, BL, { fill: '#b9b6d6', lw: 2.6 }); dashRows(c, BL, { col: '#6f6aa0', gap: 5, dash: [10, 6], lw: 1.8 });
    shape(c, ell(-44, 14 * d, 26, 17, 16), { fill: C.red, lw: 2.6 }); shape(c, ell(-44, 14 * d, 14, 8, 14), { fill: C.bg, lw: 2 });
    limb(c, [[0, 0], [-22, 10 * d]], 10, C.red); c.restore(); });
  shape(c, ell(0, 0, 6, 6, 10), { fill: C.yel, lw: 2 }); c.restore();
}
function grassStrip(c, x0, x1, y, seed, col = C.dgrn) { const R = rng(seed); for (let x = x0; x < x1; x += 14 + R() * 10) { const h = 14 + R() * 22; shape(c, [[x - 5, y], [x + R() * 8 - 4, y - h], [x + 5, y]], { fill: [C.dgrn, C.grn, C.tea][Math.floor(R() * 3)], lw: 1.8, jt: 0.3, seed: seed + x }); } }
function dust(c, x, y, u, s = 1) { if (u <= 0 || u >= 1) return; c.save(); c.globalAlpha = 1 - u; shape(c, ell(x - u * 40 * s, y - u * 30 * s, (14 + u * 40) * s, (10 + u * 26) * s, 14), { fill: 'rgba(201,138,46,.25)', stroke: C.cream, lw: 2 }); c.restore(); }
