// Synthesizes soundtrack.wav from cues.json: tanpura drone, water bed, temple bell, plops, stone cracks.
const fs = require('fs'), path = require('path');
const film = JSON.parse(fs.readFileSync(path.join(__dirname, 'cues.json')));
const SR = 44100, N = Math.ceil(film.TOTAL * SR), L = new Float32Array(N), R = new Float32Array(N);
let seed = 1; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const st = (i) => film.CUES[i].start;
const add = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan) ; R[i] += v * (1 + pan); } };

// --- tanpura: Pa, Sa', Sa', Sa (low), repeating; jawari = upper partials bloom after the pluck
const SA = 138.59, strings = [SA * 1.5 / 2, SA, SA, SA / 2];
function pluck(t0, f, amp, pan) {
  const dur = 5.5, n0 = Math.floor(t0 * SR);
  const H = 22, ph = []; for (let h = 0; h < H; h++) ph.push(Math.random() * 6.28);
  for (let k = 0; k < dur * SR; k++) {
    const t = k / SR; let v = 0;
    for (let h = 1; h <= H; h++) {
      const bloom = h > 3 ? 0.35 + 0.65 * (1 - Math.exp(-t * 2.2)) * Math.exp(-t * 0.25 * h / 6) : 1;
      v += Math.sin(2 * Math.PI * f * h * (1 + 0.0004 * h) * t + ph[h - 1]) * Math.pow(h, -0.85) * bloom * Math.exp(-t * (0.55 + 0.045 * h));
    }
    add(n0 + k, v * amp * Math.min(1, t * 200), pan);
  }
}
function droneLevel(T) {
  // quieter in darkness / drought / the pond's story; fuller after the river
  const s = film.CUES; let i = 0; while (i < s.length - 1 && T >= s[i + 1].start) i++;
  return [0.8, 0.6, 0.7, 0.45, 0.75, 1, 0.9, 0.5, 0.8, 1, 1][i] ?? 0.8;
}
for (let T = 0.3, k = 0; T < film.TOTAL - 1; k++) { const f = strings[k % 4]; pluck(T, f, 0.05 * droneLevel(T), [-0.3, 0.2, 0.25, -0.1][k % 4]); T += [1.25, 1.25, 1.25, 2.1][k % 4]; }

// --- water bed (filtered brown noise), level per scene, with swell at sea
const lv = [0.14, 0.12, 0.14, 0.06, 0.25, 0.45, 0.32, 0.06, 0.12, 0.3, 0.25];
let b1 = 0, b2 = 0, lp1 = 0, lp2 = 0;
for (let i = 0; i < N; i++) {
  const T = i / SR; let s = 0; while (s < film.CUES.length - 1 && T >= film.CUES[s + 1].start) s++;
  const loc = T - st(s);
  let g = lv[s];
  if (s === 3) g = 0.14 * Math.max(0, 1 - loc / 5);                  // drought dries it out
  if (s === 4) g = loc < 2 ? 0.02 : 0.02 + 0.33 * Math.min(1, (loc - 2) / 4); // river grows as darkness fades
  if (s === 5) g *= 0.75 + 0.25 * Math.sin(T * 1.1);
  const prev = s > 0 ? lv[s - 1] : g, xf = Math.min(1, loc / 0.8); g = s === 3 || s === 4 ? g : prev + (g - prev) * xf;
  b1 = (b1 + 0.02 * rnd()) * 0.998; b2 = (b2 + 0.02 * rnd()) * 0.998;
  lp1 += (b1 - lp1) * 0.08; lp2 += (b2 - lp2) * 0.08;
  const mod = 0.8 + 0.2 * Math.sin(T * 0.7 + Math.sin(T * 2.3));
  L[i] += lp1 * g * 3 * mod; R[i] += lp2 * g * 3 * mod;
}

// --- events
function bell(t0, f = 620, amp = 0.16) {
  const parts = [[1, 1, 3.2], [2.0, 0.5, 2.4], [2.76, 0.6, 2.0], [4.07, 0.35, 1.3], [5.4, 0.25, 0.9]];
  const n0 = Math.floor(t0 * SR);
  for (let k = 0; k < 6 * SR; k++) { const t = k / SR; let v = 0; for (const [m, a, d] of parts) v += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t / d) * (1 + 0.15 * Math.sin(2 * Math.PI * 4 * t)); add(n0 + k, v * amp * Math.min(1, t * 400) / 2.5, 0); }
}
function plop(t0, amp = 0.35) { const n0 = Math.floor(t0 * SR); let ph = 0; for (let k = 0; k < 0.25 * SR; k++) { const t = k / SR, f = 300 + 900 * Math.exp(-t * 30); ph += 2 * Math.PI * f / SR; add(n0 + k, Math.sin(ph) * Math.exp(-t * 18) * amp, 0.1); } }
function whoosh(t0, d = 0.9, amp = 0.12) { const n0 = Math.floor(t0 * SR); let lp = 0; for (let k = 0; k < d * SR; k++) { const t = k / d / SR, c = 0.02 + 0.25 * Math.sin(Math.PI * t); lp += (rnd() - lp) * c; add(n0 + k, lp * Math.sin(Math.PI * t) * amp * 3, t * 2 - 1); } }
function crack(t0, amp = 0.5) { const n0 = Math.floor(t0 * SR); let lp = 0; for (let k = 0; k < 0.5 * SR; k++) { const t = k / SR; lp += (rnd() - lp) * 0.15; add(n0 + k, (lp * 1.5 + 0.6 * Math.sin(2 * Math.PI * 70 * t)) * Math.exp(-t * 11) * amp, rnd() * 0.3); } for (let j = 0; j < 14; j++) { const tj = t0 + 0.15 + Math.random() * 0.8, m = Math.floor(tj * SR); for (let k = 0; k < 0.03 * SR; k++) add(m + k, rnd() * Math.exp(-k / SR * 120) * 0.12, rnd()); } }

const C = film.CUES;
bell(0.4, 520, 0.12);                          // opening
whoosh(st(4) + 1.0); plop(st(4) + 1.9);        // the leap
bell(st(4) + 6.4, 620, 0.18);                  // "एक नदी।"
for (let i = 0; i < 4; i++) crack(st(8) + 3.4 + i * 0.4); // stones crumble
bell(st(9) + 0.4, 740, 0.12);                  // 16
bell(st(10) + 2.8, 620, 0.2);                  // RIVER
for (let k = 0; k < 6; k++) plop(st(5) + 1 + k * 1.1 + Math.random() * 0.5, 0.06); // sea life

// --- simple stereo room + fades + normalize
const dl = [Math.floor(0.031 * SR), Math.floor(0.043 * SR)];
for (let i = N - 1; i >= 0; i--) { /* noop: keep order for feedback below */ }
for (let i = 0; i < N; i++) { if (i >= dl[0]) L[i] += R[i - dl[0]] * 0.22; if (i >= dl[1]) R[i] += L[i - dl[1]] * 0.22; }
let pk = 0; for (let i = 0; i < N; i++) { const T = i / SR, f = Math.min(1, T / 1.0, (film.TOTAL - T) / 1.2); L[i] *= f; R[i] *= f; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); }
const g = 0.89 / pk, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4); }
fs.writeFileSync(path.join(__dirname, 'soundtrack.wav'), buf);
console.log('soundtrack.wav', film.TOTAL.toFixed(1) + 's');
