// Builds the "पत्थरों के पार" story carousel: 15 illustrated slides, 1080x1350.
// Usage: node build.js        -> writes slides.html and renders slides/NN.png
const fs = require('fs');
const path = require('path');

const W = 1080, H = 1350;

// ---------- helpers ----------
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
const HERO = '#FF7A45';

// Small fish. Faces right unless flip. hero = white stripe (the protagonist).
function fish({ x, y, s = 1, c = '#F2A23A', flip = false, rot = 0, hero = false, op = 1, look = 0, scared = false, glow = false }) {
  const sx = flip ? -1 : 1;
  const d = shade(c, 0.78);
  return `<g transform="translate(${x},${y}) rotate(${rot}) scale(${sx * s},${s})" opacity="${op}">
    ${glow ? `<ellipse cx="0" cy="0" rx="90" ry="60" fill="url(#heroGlow)"/>` : ''}
    <path d="M-38,0 L-66,-25 Q-57,0 -66,25Z" fill="${d}"/>
    <path d="M-6,-24 Q8,-42 22,-21Z" fill="${d}"/>
    <path d="M-2,22 Q6,36 16,22Z" fill="${d}"/>
    <path d="M-42,0 C-28,-31 26,-32 48,0 C26,32 -28,31 -42,0Z" fill="${c}"/>
    <path d="M-30,6 C-10,20 20,20 40,6 C20,26 -12,26 -30,6Z" fill="#fff" opacity=".18"/>
    ${hero ? `<path d="M2,-24 Q-7,0 2,24" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>` : ''}
    <circle cx="30" cy="-6" r="${scared ? 8.5 : 7}" fill="#fff"/>
    <circle cx="${31 + look}" cy="-6" r="${scared ? 2.6 : 3.8}" fill="#151515"/>
    ${scared ? `<path d="M40,7 Q44,9 46,6" stroke="#151515" stroke-width="2" fill="none"/>` : `<path d="M41,6 Q45,9 47,5" stroke="${d}" stroke-width="2" fill="none"/>`}
  </g>`;
}

// Elder fish. mood: 'stern' | 'tell' | 'laugh'
function elder({ x, y, s = 3, c = '#7E8B6B', flip = false, mood = 'stern', belly = null }) {
  const sx = flip ? -1 : 1;
  const d = shade(c, 0.72), l = belly || shade(c, 1.25);
  const eye = mood === 'laugh'
    ? `<path d="M22,-10 Q30,-18 38,-10" stroke="#151515" stroke-width="3.2" fill="none" stroke-linecap="round"/>
       <path d="M18,-20 L14,-26 M26,-23 L25,-30" stroke="#151515" stroke-width="1.6" opacity=".5"/>`
    : `<circle cx="30" cy="-8" r="7.5" fill="#f4efe3"/><circle cx="31.5" cy="-7" r="3.8" fill="#151515"/>
       <path d="M21,-9 A9,9 0 0 1 39,-9 L39,-11 L21,-11Z" fill="${d}"/>
       ${mood === 'stern' ? `<path d="M19,-17 L40,-12" stroke="#151515" stroke-width="2.4" stroke-linecap="round"/>` : `<path d="M20,-16 Q30,-20 40,-15" stroke="#151515" stroke-width="2" fill="none"/>`}`;
  const mouth = mood === 'laugh'
    ? `<path d="M36,6 Q46,20 54,4Z" fill="#3a1d1d"/><path d="M40,10 Q46,16 51,9" stroke="#e98b8b" stroke-width="2.5" fill="none"/>`
    : mood === 'tell'
      ? `<ellipse cx="48" cy="6" rx="5" ry="3.5" fill="#2a1a1a"/>`
      : `<path d="M38,7 Q46,4 53,8" stroke="#2a1a1a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  // scales
  let scales = '';
  for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) {
    const cx = -18 + i * 9 + (j % 2 ? 4 : 0), cy = j * 9;
    scales += `<path d="M${cx - 4},${cy} A4.5,4.5 0 0 0 ${cx + 4},${cy}" stroke="${d}" stroke-width="1.2" fill="none" opacity=".55"/>`;
  }
  return `<g transform="translate(${x},${y}) scale(${sx * s},${s})">
    <path d="M-40,0 L-70,-30 Q-62,-6 -64,0 Q-62,6 -70,30Z" fill="${d}"/>
    <path d="M-16,-26 Q4,-46 26,-24Z" fill="${d}"/>
    <path d="M-6,22 Q4,38 18,22Z" fill="${d}"/>
    <path d="M-44,0 C-30,-34 30,-36 56,-2 C34,34 -30,34 -44,0Z" fill="${c}"/>
    <path d="M-30,8 C-6,24 26,22 50,6 C24,30 -12,30 -30,8Z" fill="${l}" opacity=".55"/>
    ${scales}
    <path d="M10,-22 Q2,0 10,22" stroke="${d}" stroke-width="2" fill="none" opacity=".6"/>
    ${eye}${mouth}
    <path d="M50,8 Q66,22 58,40" stroke="${d}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M47,10 Q56,28 44,42" stroke="${d}" stroke-width="2" fill="none" stroke-linecap="round"/>
  </g>`;
}

// irregular rounded stone
function stone(x, y, r, seed, { fill = 'url(#stoneG)', dashed = false, label = '', lsize = 30 } = {}) {
  const R = rng(seed);
  const n = 9, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.8 + R() * 0.35);
    pts.push([x + Math.cos(a) * rr * 1.15, y + Math.sin(a) * rr * 0.85]);
  }
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const m1 = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2], m2 = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    d += (i === 0 ? `M${m1[0].toFixed(1)},${m1[1].toFixed(1)}` : '') + ` Q${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${m2[0].toFixed(1)},${m2[1].toFixed(1)}`;
  }
  d += 'Z';
  if (dashed) {
    return `<g><path d="${d}" fill="rgba(255,255,255,.05)" stroke="#F7EBD3" stroke-width="4" stroke-dasharray="14 12" stroke-linecap="round"/>
      ${label ? `<text x="${x}" y="${y + lsize * 0.35}" text-anchor="middle" font-family="Mukta" font-weight="800" font-size="${lsize}" fill="#F7EBD3" opacity=".9">${label}</text>` : ''}</g>`;
  }
  return `<g><path d="${d}" transform="translate(5,8)" fill="rgba(0,0,0,.35)"/><path d="${d}" fill="${fill}"/>
    <ellipse cx="${x - r * 0.3}" cy="${y - r * 0.35}" rx="${r * 0.35}" ry="${r * 0.18}" fill="#fff" opacity=".18"/></g>`;
}

function stoneRing(cx, cy, rx, ry, n, seed, gap = null) {
  const R = rng(seed); let out = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (gap && Math.abs(Math.atan2(Math.sin(a - gap.a), Math.cos(a - gap.a))) < gap.w) continue;
    out += stone(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 26 + R() * 16, seed * 31 + i);
  }
  return out;
}

function schoolInEllipse(cx, cy, rx, ry, n, seed, { s = [0.17, 0.24], palette = ['#F2A23A', '#F5B94C', '#E8833A', '#F7C873', '#E36E3A'], op = 1, swirl = true } = {}) {
  const R = rng(seed); let out = '';
  for (let i = 0; i < n; i++) {
    const t = R() * Math.PI * 2, u = Math.sqrt(R());
    const x = cx + Math.cos(t) * rx * u, y = cy + Math.sin(t) * ry * u;
    const rot = swirl ? (t * 180 / Math.PI + 90 + (R() * 40 - 20)) : R() * 360;
    out += fish({ x, y, s: s[0] + R() * (s[1] - s[0]), c: palette[Math.floor(R() * palette.length)], rot, op });
  }
  return out;
}

function bubbles(seed, n, area, op = 0.35) {
  const R = rng(seed); let out = '';
  for (let i = 0; i < n; i++) {
    const x = area[0] + R() * (area[2] - area[0]), y = area[1] + R() * (area[3] - area[1]);
    out += `<circle cx="${x}" cy="${y}" r="${2 + R() * 9}" fill="none" stroke="#fff" stroke-width="2" opacity="${op * (0.4 + R() * 0.6)}"/>`;
  }
  return out;
}

function weed(x, base, h, c, seed, sway = 1) {
  const R = rng(seed); let out = '';
  for (let k = 0; k < 4; k++) {
    const ox = x + k * 16 - 24, hh = h * (0.6 + R() * 0.5), sw = (R() * 40 - 20) * sway;
    out += `<path d="M${ox},${base} C${ox + sw},${base - hh * 0.35} ${ox - sw},${base - hh * 0.7} ${ox + sw * 0.6},${base - hh}" stroke="${c}" stroke-width="${9 + R() * 6}" fill="none" stroke-linecap="round"/>`;
  }
  return out;
}

function rays(n, seed, op = 0.12, x0 = 0, x1 = W) {
  const R = rng(seed); let out = '';
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), w = 40 + R() * 90, sk = 120 + R() * 160;
    out += `<path d="M${x},0 L${x + w},0 L${x + w + sk},${H} L${x + sk - w},${H}Z" fill="url(#rayG)" opacity="${op * (0.5 + R())}"/>`;
  }
  return out;
}

function floor(y, c1, c2, seed) {
  const R = rng(seed); let pebbles = '';
  for (let i = 0; i < 40; i++) pebbles += `<ellipse cx="${R() * W}" cy="${y + 30 + R() * (H - y)}" rx="${4 + R() * 12}" ry="${3 + R() * 6}" fill="${c2}" opacity=".7"/>`;
  return `<path d="M0,${y} Q270,${y - 30} 540,${y + 5} T1080,${y - 10} L1080,${H} L0,${H}Z" fill="${c1}"/>${pebbles}`;
}

// stone wall seen from the side (column of stones), darkness behind
function sideWall(x0, seed, behind = '#000') {
  const R = rng(seed); let out = `<rect x="${x0 + 50}" y="0" width="${W - x0}" height="${H}" fill="${behind}"/>`;
  for (let row = 0; row < 15; row++) {
    const y = 60 + row * 92;
    for (let k = 0; k < 3; k++) out += stone(x0 + 40 + k * 95 + (row % 2) * 40 + R() * 20, y + R() * 20, 44 + R() * 12, seed + row * 7 + k);
  }
  return out;
}

const defs = `<defs>
  <radialGradient id="stoneG" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#9ea39f"/><stop offset=".7" stop-color="#6a6f6b"/><stop offset="1" stop-color="#4b4f4c"/></radialGradient>
  <radialGradient id="stoneDark" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#3b3f3d"/><stop offset="1" stop-color="#121413"/></radialGradient>
  <radialGradient id="pondG" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#4fa197"/><stop offset=".75" stop-color="#2b6b63"/><stop offset="1" stop-color="#1d4a45"/></radialGradient>
  <radialGradient id="vignette" cx=".5" cy=".55" r=".75"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".92"/></radialGradient>
  <radialGradient id="heroGlow"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".75"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>
  <radialGradient id="sunG"><stop offset="0" stop-color="#fffbe6"/><stop offset=".25" stop-color="#ffe9a3" stop-opacity=".95"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
  <linearGradient id="rayG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <linearGradient id="pondWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d7d6f"/><stop offset="1" stop-color="#10302b"/></linearGradient>
  <linearGradient id="pondDim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26463f"/><stop offset="1" stop-color="#081613"/></linearGradient>
  <linearGradient id="riverWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bff3ff"/><stop offset=".35" stop-color="#4fc4e0"/><stop offset="1" stop-color="#11678f"/></linearGradient>
  <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a86b8"/><stop offset=".55" stop-color="#0c4f80"/><stop offset="1" stop-color="#062a4d"/></linearGradient>
  <linearGradient id="darkR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".95"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="blur2"><feGaussianBlur stdDeviation="2"/></filter>
</defs>`;

const svg = (body) => `<svg class="art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${defs}${body}</svg>`;

// river polygon along a centerline with growing width
function riverPath(pts, w0, w1) {
  const L = [], Rr = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
    const t = i / (pts.length - 1), w = (w0 + (w1 - w0) * t * t) / 2;
    L.push([p[0] + nx * w, p[1] + ny * w]); Rr.push([p[0] - nx * w, p[1] - ny * w]);
  }
  const all = L.concat(Rr.reverse());
  return 'M' + all.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' L') + 'Z';
}
function catmull(ctrl, steps = 14) {
  const out = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let k = 0; k < steps; k++) {
      const t = k / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

// ---------- slides ----------
const slides = [];
const add = (art, html, cls = '') => slides.push({ art, html, cls });

// 01 — the pond and the rule
(() => {
  const R = rng(11); let grass = '';
  for (let i = 0; i < 260; i++) {
    const x = R() * W, y = R() * H, h = 8 + R() * 16;
    grass += `<path d="M${x},${y} l${R() * 6 - 3},${-h}" stroke="#6f5d3c" stroke-width="2" opacity=".6"/>`;
  }
  const cx = 540, cy = 745, rx = 380, ry = 285;
  const art = svg(`<rect width="${W}" height="${H}" fill="#3a2f22"/>${grass}
    <ellipse cx="${cx}" cy="${cy}" rx="${rx + 20}" ry="${ry + 20}" fill="#24382f"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#pondG)"/>
    ${[0.9, 0.7, 0.5].map((k) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx * k}" ry="${ry * k}" fill="none" stroke="#fff" stroke-opacity=".06" stroke-width="3"/>`).join('')}
    ${schoolInEllipse(cx, cy, rx * 0.86, ry * 0.84, 99, 5)}
    ${fish({ x: cx + rx * 0.74, y: cy - 30, s: 0.5, c: HERO, hero: true, rot: -8, glow: true })}
    ${stoneRing(cx, cy, rx + 26, ry + 26, 40, 3)}
    <rect width="${W}" height="${H}" fill="url(#vignette)"/>`);
  add(art, `
    <div class="top"><p class="nar">छोटे तालाब में <b>सौ</b> मछलियाँ रहती थीं।</p></div>
    <div class="bottom"><p class="nar sm">और एक नियम था —</p>
      <p class="big gold">पत्थरों के पार मत जाओ।</p>
      <p class="nar sm dim">जो जाता है, वापस नहीं आता।</p></div>
    <div class="swipe">आगे पढ़ें →</div>`);
})();

// 02 — the question
(() => {
  const art = svg(`<rect width="${W}" height="${H}" fill="url(#pondWater)"/>${rays(6, 2, 0.1, 0, 700)}
    ${sideWall(820, 4)}
    ${floor(1150, '#3b3a2a', '#2a2a1e', 9)}
    ${weed(90, 1160, 360, '#2c5a3a', 3)}${weed(250, 1170, 220, '#24503a', 8)}
    ${bubbles(4, 26, [0, 200, 800, 1100])}
    ${elder({ x: 300, y: 820, s: 3.1, mood: 'stern' })}
    ${fish({ x: 660, y: 650, s: 1.25, c: HERO, hero: true, flip: true, look: -1, glow: true })}`);
  add(art, `
    <div class="top"><p class="nar">एक छोटी मछली ने बूढ़ी से पूछा —</p></div>
    <div class="bubble" style="left:400px;top:420px;width:520px">पत्थरों के पार क्या है?<i class="tail tl" style="left:236px"></i></div>
    <div class="tag" style="left:840px;top:1190px">पत्थर</div>`);
})();

// 03 — "nothing. only darkness."
(() => {
  const art = svg(`<rect width="${W}" height="${H}" fill="url(#pondDim)"/>
    ${sideWall(820, 4)}
    <rect x="300" y="0" width="780" height="${H}" fill="url(#darkR)"/>
    ${floor(1150, '#25241a', '#1a1a12', 9)}
    ${weed(90, 1160, 360, '#1e3d2a', 3)}${weed(250, 1170, 220, '#1a3a2a', 8)}
    ${elder({ x: 330, y: 760, s: 3.2, mood: 'stern' })}
    ${fish({ x: 520, y: 1040, s: 0.95, c: HERO, hero: true, flip: true, scared: true })}
    <path d="M610,1030 h60 M620,1050 h44 M612,1070 h30" stroke="#F7EBD3" stroke-width="4" stroke-linecap="round" opacity=".5"/>`);
  add(art, `
    <div class="bubble dark" style="left:420px;top:330px;width:520px">“कुछ नहीं।<br>सिर्फ <span class="gold">अँधेरा</span>।”<i class="tail bl" style="left:60px"></i></div>
    <div class="top"><p class="nar sm">बूढ़ी बोली —</p></div>
    <div class="bottom"><p class="nar">तो छोटी मछली <b>रुक गई</b>।</p></div>`);
})();

// 04 — days, years: same water, same stones, same fear
(() => {
  const ph = 255, y0 = 230; let body = `<rect width="${W}" height="${H}" fill="#0c1a17"/>`;
  const panels = [
    { sky: '#f3c77a', w1: '#3d7d6f', w2: '#173c35', orb: 'sun', s: 0.85, c: HERO, label: 'दिन' },
    { sky: '#1c2a4a', w1: '#25475a', w2: '#0b1a24', orb: 'moon', s: 1.1, c: '#E8865A', label: 'महीने' },
    { sky: '#9a9a8c', w1: '#4a5e57', w2: '#1a2522', orb: 'sun', s: 1.25, c: '#C99A80', label: 'साल' },
  ];
  panels.forEach((p, i) => {
    const y = y0 + i * (ph + 22);
    body += `<g><clipPath id="cp${i}"><rect x="60" y="${y}" width="960" height="${ph}" rx="22"/></clipPath>
      <g clip-path="url(#cp${i})">
        <rect x="60" y="${y}" width="960" height="${ph}" fill="${p.w2}"/>
        <rect x="60" y="${y}" width="960" height="70" fill="${p.sky}"/>
        ${p.orb === 'sun' ? `<circle cx="200" cy="${y + 40}" r="26" fill="#fff4cf" opacity=".9"/>` : `<circle cx="200" cy="${y + 38}" r="22" fill="#e9eef7"/><circle cx="212" cy="${y + 32}" r="20" fill="${p.sky}"/>`}
        <path d="M60,${y + 70} Q300,${y + 60} 540,${y + 72} T1020,${y + 66} L1020,${y + ph} L60,${y + ph}Z" fill="${p.w1}" opacity=".9"/>
        <rect x="60" y="${y + 70}" width="960" height="${ph - 70}" fill="url(#pondDim)" opacity=".55"/>
        ${[0, 1, 2].map((k) => stone(860 + (k % 2) * 40, y + 120 + k * 70, 46, 70 + k + i)).join('')}
        <rect x="930" y="${y}" width="90" height="${ph}" fill="#000" opacity=".7"/>
        ${[0, 1, 2].map((k) => stone(960, y + 100 + k * 80, 42, 90 + k + i)).join('')}
        ${fish({ x: 640, y: y + 165, s: p.s, c: p.c, hero: true, look: 2 })}
      </g>
      <rect x="60" y="${y}" width="960" height="${ph}" rx="22" fill="none" stroke="#F7EBD3" stroke-opacity=".25" stroke-width="2"/></g>`;
  });
  add(svg(body), `
    <div class="top"><p class="nar">दिन बीते, साल बीते —</p></div>
    ${panels.map((p, i) => `<div class="plabel" style="top:${y0 + i * (ph + 22) + 90}px">${p.label}</div>`).join('')}
    <div class="bottom"><p class="big">वही पानी, वही पत्थर,<br><span class="gold">वही डर।</span></p></div>`);
})();

// 05 — the drought
(() => {
  const R = rng(21); let cracks = '';
  for (let i = 0; i < 70; i++) {
    let x = R() * W, y = R() * H, d = `M${x.toFixed(0)},${y.toFixed(0)}`;
    for (let k = 0; k < 4; k++) { x += R() * 90 - 45; y += R() * 90 - 45; d += ` L${x.toFixed(0)},${y.toFixed(0)}`; }
    cracks += `<path d="${d}" stroke="#6e4a26" stroke-width="${1.5 + R() * 3}" fill="none" stroke-linejoin="round"/>`;
  }
  const cx = 520, cy = 760, rx = 360, ry = 270, ga = 0.18;
  const gx = cx + Math.cos(ga) * (rx + 26), gy = cy + Math.sin(ga) * (ry + 26);
  const art = svg(`<rect width="${W}" height="${H}" fill="#c08f52"/>${cracks}
    <ellipse cx="${cx}" cy="${cy}" rx="${rx + 10}" ry="${ry + 10}" fill="#8a6236"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#9b7141"/>
    ${(() => { const Rc = rng(5); let c = ''; for (let i = 0; i < 26; i++) { const t = Rc() * 6.28, u = 0.45 + Rc() * 0.5; let x = cx + Math.cos(t) * rx * u, y = cy + Math.sin(t) * ry * u; c += `<path d="M${x},${y} l${Rc() * 60 - 30},${Rc() * 60 - 30} l${Rc() * 50 - 25},${Rc() * 50 - 25}" stroke="#6e4a26" stroke-width="3" fill="none"/>`; } return c; })()}
    <ellipse cx="${cx - 20}" cy="${cy}" rx="175" ry="120" fill="#5e6a4a"/>
    <ellipse cx="${cx - 20}" cy="${cy}" rx="160" ry="108" fill="#3f6b5c"/>
    ${schoolInEllipse(cx - 20, cy, 140, 92, 70, 8, { s: [0.15, 0.2], palette: ['#d99a4a', '#c98a3a', '#e0a860', '#b8783a'] })}
    <path d="M${cx + 130},${cy + 30} C${cx + 250},${cy + 40} ${gx - 60},${gy} ${gx},${gy} S${W - 60},${gy + 120} ${W + 20},${gy + 260}" stroke="#3f6b5c" stroke-width="34" fill="none" stroke-linecap="round" opacity=".85"/>
    <path d="M${cx + 130},${cy + 30} C${cx + 250},${cy + 40} ${gx - 60},${gy} ${gx},${gy} S${W - 60},${gy + 120} ${W + 20},${gy + 260}" stroke="#7fd0c6" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="2 22" opacity=".9"/>
    ${stoneRing(cx, cy, rx + 26, ry + 26, 40, 3, { a: ga, w: 0.12 })}
    ${fish({ x: gx + 6, y: gy + 4, s: 0.75, c: HERO, hero: true, rot: 22, glow: true })}
    <circle cx="1040" cy="40" r="420" fill="url(#sunG)"/>
    <circle cx="1040" cy="40" r="80" fill="#fffbe6"/>`);
  add(art, `
    <div class="top warm"><p class="nar">फिर एक गर्मी में तालाब <b>सूखने</b> लगा।</p><p class="nar sm">कोई रास्ता नहीं बचा।</p></div>
    <div class="bottom scrim-warm"><p class="big">वो पत्थरों के पार <span class="gold">चली गई।</span></p></div>`);
})();

// 06 — the reveal: a river
(() => {
  const R = rng(31); let streaks = '';
  for (let i = 0; i < 50; i++) { const x = R() * W, y = 120 + R() * 700, l = 60 + R() * 180; streaks += `<path d="M${x},${y} q${l / 2},-10 ${l},0" stroke="#fff" stroke-width="${2 + R() * 3}" fill="none" opacity="${0.2 + R() * 0.35}" stroke-linecap="round"/>`; }
  let rocks = ''; for (let i = 0; i < 9; i++) rocks += stone(i * 135 - 20 + R() * 30, 1120 + R() * 60, 90 + R() * 30, 300 + i, { fill: 'url(#stoneDark)' });
  const art = svg(`<rect width="${W}" height="${H}" fill="url(#riverWater)"/>
    ${rays(10, 6, 0.22)}
    <circle cx="540" cy="-40" r="520" fill="url(#sunG)" opacity=".9"/>
    ${streaks}${bubbles(9, 40, [0, 300, W, 1000], 0.5)}
    ${fish({ x: 360, y: 520, s: 0.5, c: '#5dd6c0', rot: -10, op: 0.8 })}${fish({ x: 800, y: 420, s: 0.4, c: '#ffd36e', rot: -14, op: 0.7, flip: true })}
    ${fish({ x: 540, y: 850, s: 1.3, c: HERO, hero: true, rot: -60, glow: true })}
    <rect y="980" width="${W}" height="370" fill="#05110f"/>
    ${rocks}`);
  add(art, `
    <div class="mid" style="top:150px"><p class="nar ink">और वहाँ क्या था?</p><p class="huge ink">एक नदी।</p></div>
    <div class="bottom"><p class="nar sm dim">अँधेरा नहीं था। कभी था ही नहीं।</p></div>`);
})();

// 07 — river meets the sea; thousands of fish
(() => {
  const ctrl = [[180, 230], [330, 330], [250, 470], [460, 560], [620, 690], [520, 820], [560, 930]];
  const pts = catmull(ctrl);
  const R = rng(41); let land = '';
  for (let i = 0; i < 140; i++) land += `<circle cx="${R() * W}" cy="${R() * 900}" r="${6 + R() * 18}" fill="${['#2f6b3a', '#3b7d44', '#28592f'][i % 3]}" opacity=".8"/>`;
  let sea = ''; for (let i = 0; i < 520; i++) {
    const x = R() * W, y = 900 + R() * 450; sea += fish({ x, y, s: 0.09 + R() * 0.08, c: ['#ffd36e', '#ff9e5e', '#7fe3d0', '#f7ebd3', '#ffb3a0'][i % 5], rot: R() * 40 - 20 + (x > 540 ? 0 : 180), op: 0.9 });
  }
  const art = svg(`<rect width="${W}" height="${H}" fill="#4f8a43"/>${land}
    <path d="M0,880 C200,850 400,900 560,870 C760,840 900,900 1080,860 L1080,1350 L0,1350Z" fill="#e9d9a8"/>
    <path d="M0,905 C200,875 400,925 560,895 C760,865 900,925 1080,885 L1080,1350 L0,1350Z" fill="url(#ocean)"/>
    ${[0, 1, 2, 3].map((k) => `<path d="M0,${960 + k * 90} q60,-12 120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0 t120,0" stroke="#fff" stroke-opacity=".12" stroke-width="3" fill="none"/>`).join('')}
    <path d="${riverPath(pts, 18, 210)}" fill="#3fb0d0"/>
    <path d="${riverPath(pts, 6, 90)}" fill="#9be6f5" opacity=".5"/>
    <ellipse cx="160" cy="215" rx="70" ry="50" fill="#2b6b63"/>${stoneRing(160, 215, 78, 58, 16, 7, { a: 0.6, w: 0.25 })}
    ${fish({ x: 470, y: 568, s: 0.45, c: HERO, hero: true, rot: 40, glow: true })}
    ${sea}`);
  add(art, `
    <div class="tr"><p class="nar ink sm">नदी समुद्र में मिली।</p></div>
    <div class="tag" style="left:70px;top:290px">वो तालाब</div>
    <div class="bottom"><p class="nar">और समुद्र में <b class="gold">हजारों</b> मछलियाँ थीं।</p><p class="nar sm">हर एक ने कभी छोटा तालाब छोड़ा था।</p></div>`);
})();

// 08 — the ocean elder laughs
(() => {
  const R = rng(51); let far = '';
  for (let i = 0; i < 120; i++) far += fish({ x: R() * W, y: 120 + R() * 500, s: 0.08 + R() * 0.07, c: '#9fd3ef', op: 0.35, rot: R() * 20 - 10 });
  const art = svg(`<rect width="${W}" height="${H}" fill="url(#ocean)"/>${rays(9, 12, 0.18)}${far}
    ${bubbles(13, 50, [0, 100, W, 1300], 0.45)}
    ${weed(60, 1360, 380, '#0c5a5a', 21)}${weed(1000, 1360, 300, '#0d4e5c', 23)}
    ${elder({ x: 400, y: 800, s: 4.2, c: '#5b8fc4', mood: 'laugh', belly: '#cfe4f5' })}
    ${fish({ x: 840, y: 620, s: 1.2, c: HERO, hero: true, flip: true, glow: true })}`);
  add(art, `
    <div class="top"><p class="nar">उसने वहाँ की एक बूढ़ी से पूछा —</p></div>
    <div class="bubble" style="left:600px;top:390px;width:400px">कोई वापस गया?<i class="tail tr2" style="left:250px"></i></div>
    <div class="bottom"><p class="nar sm dim">वो हँसी।</p><p class="quote">“क्यों जाएगा? वहाँ पानी सूखता है,<br>यहाँ <span class="gold">कभी नहीं</span>।”</p></div>`);
})();

// 09 — what the pond says vs what is true
(() => {
  const R = rng(61); let school = '';
  for (let i = 0; i < 180; i++) school += fish({ x: R() * W, y: 780 + R() * 560, s: 0.12 + R() * 0.14, c: ['#ffd36e', '#ff9e5e', '#7fe3d0', '#f7ebd3', HERO][i % 5], rot: R() * 30 - 15, op: 0.95 });
  const ghost = `<g opacity=".55" transform="translate(760,420) scale(2.2)"><path d="M-42,0 C-28,-31 26,-32 48,0 C26,32 -28,31 -42,0Z M-38,0 L-66,-25 Q-57,0 -66,25Z" fill="none" stroke="#cfc6b0" stroke-width="2" stroke-dasharray="6 6"/><path d="M25,-11 l10,10 M35,-11 l-10,10" stroke="#cfc6b0" stroke-width="2.4"/></g>`;
  const art = svg(`<rect width="${W}" height="680" fill="#1e2a26"/><rect width="${W}" height="680" fill="url(#pondDim)"/>
    ${stoneRing(540, 420, 520, 230, 30, 13)}
    <rect width="${W}" height="680" fill="#000" opacity=".35"/>
    ${ghost}
    <rect y="680" width="${W}" height="670" fill="url(#ocean)"/>${rays(7, 33, 0.2)}
    ${school}
    ${fish({ x: 860, y: 1230, s: 1.0, flip: true, c: HERO, hero: true, glow: true })}
    <path d="M0,680 Q540,700 1080,680" stroke="#F7EBD3" stroke-width="3" opacity=".6" fill="none"/>`);
  add(art, `
    <div class="half scrimbox" style="top:60px"><p class="kicker">तालाब कहता है</p><p class="nar">“जो जाता है, वापस नहीं आता।”</p><p class="nar sm dim">— क्योंकि वो मर गए।</p></div>
    <div class="half scrimbox" style="top:720px"><p class="kicker gold">सच</p><p class="nar">कोई वापस नहीं आया —<br>इसलिए नहीं कि वो मर गए,</p><p class="big gold" style="font-size:62px">इसलिए कि उन्हें कुछ बेहतर मिल गया।</p></div>`);
})();

// 10 — the pond keeps telling the old story
(() => {
  let ring = ''; const R = rng(71);
  const seats = [[260, 600], [210, 800], [330, 980], [560, 1030], [780, 960], [880, 780], [820, 600], [560, 520]];
  seats.forEach(([x, y], i) => { ring += fish({ x, y, s: 0.7, c: ['#E8833A', '#F2A23A', '#F5B94C', '#E36E3A'][i % 4], flip: x > 540, scared: true, rot: (y - 780) * (x > 540 ? -0.06 : 0.06), look: 1 }); });
  const art = svg(`<rect width="${W}" height="${H}" fill="url(#pondDim)"/>
    ${sideWall(900, 41)}
    <rect x="500" width="580" height="${H}" fill="url(#darkR)"/>
    ${floor(1170, '#1e1d15', '#15150f', 77)}
    ${elder({ x: 540, y: 790, s: 2.4, mood: 'tell' })}
    ${ring}`);
  add(art, `
    <div class="bubble dark ghosty" style="left:330px;top:330px;width:500px">“...जो जाता है,<br>वापस नहीं आता।”<i class="tail bl" style="left:220px"></i></div>
    <div class="top"><p class="nar">और तालाब <b>वही पुरानी कहानी</b> सुनाता रहा,</p></div>
    <div class="bottom"><p class="nar">ताकि बाकी सब <span class="gold">डरे रहें</span>।</p></div>`);
})();

// 11 — you are not stuck, you were told
(() => {
  const cx = 540, cy = 760; let ring = '';
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; ring += stone(cx + Math.cos(a) * 250, cy + Math.sin(a) * 190, 34, 500 + i, { dashed: true }); }
  const art = svg(`<rect width="${W}" height="${H}" fill="#0f1d1a"/>
    <ellipse cx="${cx}" cy="${cy}" rx="230" ry="170" fill="url(#pondG)" opacity=".8"/>
    ${ring}
    ${fish({ x: 540, y: 760, s: 1.3, c: HERO, hero: true, rot: -12, glow: true })}`);
  add(art, `
    <div class="top"><p class="big">आप फंसे नहीं हैं।</p></div>
    <div class="bottom"><p class="big gold">आपको बस ये बताया गया है।</p><p class="nar sm dim">ये दो अलग बातें हैं।</p></div>`);
})();

// 12 — the stones aren't real: 10th, 12th, graduation, then?
(() => {
  const st = [[180, 620, 80, '10th'], [430, 560, 90, '12th'], [720, 650, 120, 'Graduation'], [900, 900, 120, 'फिर?']];
  let s = ''; st.forEach(([x, y, r, l], i) => { s += stone(x, y, r, 700 + i, { dashed: true, label: l, lsize: l.length > 6 ? 34 : 46 }); });
  const art = svg(`<rect width="${W}" height="${H}" fill="url(#pondDim)"/>
    ${s}
    <path d="M60,920 C220,860 360,760 520,760 C700,760 760,830 1100,760" stroke="#FF7A45" stroke-width="4" stroke-dasharray="4 16" stroke-linecap="round" fill="none" opacity=".9"/>
    ${fish({ x: 720, y: 790, s: 1.1, c: HERO, hero: true, rot: -4, glow: true })}`);
  add(art, `
    <div class="top"><p class="big">और वो पत्थर <span class="gold">असली नहीं</span> होते।</p></div>
    <div class="bottom"><p class="nar sm">10th कर लो। 12th कर लो। अब graduation कर लो।</p><p class="nar">फिर? फिर कुछ नहीं।</p><p class="nar sm dim"><i>बस यही सुनाई देता है कि तुमसे कुछ नहीं होगा।</i></p></div>`);
})();

// 13 — I left at 16
(() => {
  const R = rng(81); let streaks = '';
  for (let i = 0; i < 40; i++) { const x = R() * W, y = 300 + R() * 800, l = 60 + R() * 140; streaks += `<path d="M${x},${y} q${l / 2},-8 ${l},0" stroke="#fff" stroke-width="3" fill="none" opacity="${0.15 + R() * 0.3}" stroke-linecap="round"/>`; }
  let wall = ''; for (let k = 0; k < 9; k++) wall += stone(130 + (k % 2) * 30, 80 + k * 150, 70, 900 + k, { fill: 'url(#stoneDark)' });
  const art = svg(`<rect width="${W}" height="${H}" fill="url(#riverWater)"/>${rays(8, 44, 0.18, 200, W)}${streaks}
    <rect width="230" height="${H}" fill="#0a1a17"/>${wall}
    <path d="M150,700 C350,690 500,720 760,680" stroke="#FF7A45" stroke-width="4" stroke-dasharray="4 16" fill="none" opacity=".8"/>
    ${fish({ x: 760, y: 680, s: 1.6, c: HERO, hero: true, rot: -6, glow: true })}`);
  add(art, `
    <div class="badge" style="left:300px;top:560px">16</div>
    <div class="top" style="padding-left:260px"><p class="nar">मैंने <b class="gold">16 की उम्र</b> में<br>वो तालाब छोड़ दिया था।</p></div>
    <div class="bottom" style="padding-left:260px"><p class="nar">एक skill सीखी।<br>अपना काम शुरू किया।</p></div>`);
})();

// 14 — now I teach people my age
(() => {
  let v = ''; const R = rng(91);
  const cols = ['#ffd36e', '#7fe3d0', '#ff9e5e', '#f7ebd3', '#ffb3a0', '#9fd3ef'];
  for (let k = 1; k <= 5; k++) {
    v += fish({ x: 720 - k * 120, y: 690 - k * 70 + R() * 10, s: 1.0, c: cols[k % 6], rot: 0 });
    v += fish({ x: 720 - k * 120, y: 690 + k * 70 + R() * 10, s: 1.0, c: cols[(k + 3) % 6], rot: 0 });
  }
  const art = svg(`<rect width="${W}" height="${H}" fill="url(#ocean)"/>${rays(9, 55, 0.22)}${bubbles(57, 40, [0, 200, W, 1300], 0.45)}
    ${v}${fish({ x: 780, y: 690, s: 1.35, c: HERO, hero: true, glow: true })}`);
  add(art, `
    <div class="top"><p class="nar">आज अपना <b>business</b> चला रही हूँ,</p><p class="nar sm">और अपनी ही उम्र के लोगों को यही सिखा रही हूँ।</p></div>
    <div class="bottom"><p class="nar sm dim">मैं कोई अलग मछली नहीं थी।</p><p class="nar">बस मैंने उस <span class="gold">कहानी पे भरोसा</span><br>करना बंद कर दिया।</p></div>`);
})();

// 15 — CTA: comment RIVER
(() => {
  const cx = 540, cy = 330, ga = Math.PI / 2;
  const ctrl = [[540, 470], [700, 580], [420, 700], [620, 800], [540, 880]];
  const pts = catmull(ctrl);
  const art = svg(`<rect width="${W}" height="${H}" fill="#0f1d1a"/>
    <ellipse cx="${cx}" cy="${cy}" rx="200" ry="130" fill="#1d4a45"/>
    ${schoolInEllipse(cx, cy, 160, 95, 30, 4, { s: [0.13, 0.17], op: 0.6 })}
    ${stoneRing(cx, cy, 220, 150, 26, 9, { a: ga, w: 0.2 })}
    <path d="${riverPath(pts, 30, 120)}" fill="#3fb0d0"/>
    <path d="${riverPath(pts, 10, 50)}" fill="#bff3ff" opacity=".45"/>
    ${fish({ x: 590, y: 780, s: 0.6, c: HERO, hero: true, rot: 70, glow: true })}`);
  add(art, `
    <div class="mid" style="top:920px"><p class="nar sm">तुम्हें भी वो पत्थर पार करने हैं?</p><p class="nar">Comment करो</p><p class="river">RIVER</p></div>
    <div class="foot">या फिर उसी तालाब में रहो, जहाँ हमेशा से हो।</div>`);
})();

// ---------- page ----------
const font = (fam, file, w, style = 'normal') => `@font-face{font-family:'${fam}';src:url(fonts/${file}) format('woff2');font-weight:${w};font-style:${style};}`;
const css = `
${font('Mukta', 'mukta-devanagari-400-normal.woff2', 400)}${font('Mukta', 'mukta-latin-400-normal.woff2', 400)}
${font('Mukta', 'mukta-devanagari-700-normal.woff2', 700)}${font('Mukta', 'mukta-latin-700-normal.woff2', 700)}
${font('Mukta', 'mukta-devanagari-800-normal.woff2', 800)}${font('Mukta', 'mukta-latin-800-normal.woff2', 800)}
${font('Tiro', 'tiro-devanagari-hindi-devanagari-400-normal.woff2', 400)}${font('Tiro', 'tiro-devanagari-hindi-latin-400-normal.woff2', 400)}
${font('Tiro', 'tiro-devanagari-hindi-devanagari-400-italic.woff2', 400, 'italic')}${font('Tiro', 'tiro-devanagari-hindi-latin-400-italic.woff2', 400, 'italic')}
*{box-sizing:border-box;margin:0}
body{background:#111;display:flex;flex-wrap:wrap;gap:30px;padding:30px;font-family:'Mukta'}
.slide{position:relative;width:${W}px;height:${H}px;overflow:hidden;color:#F7EBD3}
.art{position:absolute;inset:0}
.top,.bottom,.mid,.half,.tr{position:absolute;left:0;right:0;padding:0 80px;text-align:center}
.top{top:0;padding-top:80px;padding-bottom:120px;background:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,0))}
.bottom{bottom:0;padding-bottom:84px;padding-top:140px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.72) 45%)}
.scrim-warm{background:linear-gradient(rgba(60,30,0,0),rgba(40,20,0,.8) 45%)}
.tr{top:110px;left:auto;right:30px;width:520px;text-align:right}
.half{text-align:left}
.nar{font-family:'Tiro';font-size:56px;line-height:1.35;text-shadow:0 2px 12px rgba(0,0,0,.45)}
.nar.sm{font-size:42px}
.nar b,.big b{font-weight:400;color:#FFD27A}
.big{font-weight:800;font-size:76px;line-height:1.18;letter-spacing:-.5px;text-shadow:0 3px 16px rgba(0,0,0,.5)}
.huge{font-weight:800;font-size:150px;line-height:1.05;letter-spacing:-2px}
.quote{font-weight:700;font-size:58px;line-height:1.28}
.kicker{font-weight:800;font-size:34px;opacity:.8;margin-bottom:8px}
.gold{color:#FFD27A}
.dim{opacity:.72}
.ink{color:#0b2a33;text-shadow:0 1px 18px rgba(255,255,255,.6)}
.top:has(.ink),.mid:has(.ink){background:none}
.mid{background:none}
.warm{background:linear-gradient(rgba(70,35,5,.85),rgba(70,35,5,0))}
.scrimbox{margin:0 40px;padding:28px 40px;border-radius:28px;background:rgba(0,0,0,.55);backdrop-filter:blur(2px)}
.bubble{position:absolute;background:#F7EBD3;color:#1b1b1b;border-radius:44px;padding:26px 36px;font-weight:800;font-size:52px;line-height:1.2;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.bubble.dark{background:#0d0d0d;color:#F7EBD3;border:2px solid rgba(247,235,211,.35)}
.bubble.ghosty{font-family:'Tiro';font-weight:400;font-style:italic;opacity:.92}
.tail{position:absolute;width:0;height:0;border:24px solid transparent}
.tail.tl,.tail.tr2{bottom:-44px;border-top-color:#F7EBD3}
.tail.bl{bottom:-44px;border-top-color:#0d0d0d}
.tag{position:absolute;font-weight:700;font-size:30px;padding:6px 18px;border-radius:30px;background:rgba(0,0,0,.55);color:#F7EBD3}
.plabel{position:absolute;left:100px;font-weight:800;font-size:40px;color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.7)}
.badge{position:absolute;width:120px;height:120px;border-radius:50%;background:#FF7A45;color:#fff;font-weight:800;font-size:64px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 8px rgba(255,122,69,.3)}
.river{font-weight:800;font-size:170px;letter-spacing:14px;line-height:1;color:#bff3ff;text-shadow:0 0 40px rgba(63,176,208,.8)}
.foot{position:absolute;bottom:44px;left:0;right:0;text-align:center;font-family:'Tiro';font-style:italic;font-size:34px;opacity:.55}
.swipe{position:absolute;right:50px;bottom:30px;font-size:28px;font-weight:700;opacity:.7}
.num{position:absolute;left:44px;bottom:30px;font-size:26px;font-weight:700;opacity:.5;letter-spacing:2px}
`;
const html = `<!doctype html><html lang="hi"><head><meta charset="utf-8"><title>पत्थरों के पार — carousel</title><style>${css}</style></head><body>
${slides.map((s, i) => `<section class="slide ${s.cls}" id="s${i + 1}">${s.art}${s.html}<div class="num">${String(i + 1).padStart(2, '0')} / ${slides.length}</div></section>`).join('\n')}
</body></html>`;
fs.writeFileSync(path.join(__dirname, 'slides.html'), html);
console.log('slides.html written:', slides.length, 'slides');

if (process.argv.includes('--no-render')) process.exit(0);
(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, 'slides.html'));
  await p.evaluate(() => document.fonts.ready);
  const out = path.join(__dirname, 'slides'); fs.mkdirSync(out, { recursive: true });
  const only = process.argv.find((a) => a.startsWith('--only='));
  for (let i = 1; i <= slides.length; i++) {
    if (only && !only.slice(7).split(',').includes(String(i))) continue;
    await p.locator('#s' + i).screenshot({ path: path.join(out, String(i).padStart(2, '0') + '.png') });
  }
  await b.close();
  console.log('rendered to', out);
})();
