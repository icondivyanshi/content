// Synthesizes soundtrack.wav for the baaz-race film from cues.json (all sound made here, no samples).
const fs = require('fs'), path = require('path');
const film = JSON.parse(fs.readFileSync(path.join(__dirname, 'cues.json')));
const SR = 44100, N = Math.ceil(film.TOTAL * SR), L = new Float32Array(N), R = new Float32Array(N);
let sd = 7; const rnd = () => ((sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const put = (i, v, pan = 0) => { if (i >= 0 && i < N) { L[i] += v * (1 - pan * 0.7); R[i] += v * (1 + pan * 0.7); } };
const at = (t) => Math.floor(t * SR);
function biquadBP(f, q) { const w = 2 * Math.PI * f / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al; const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0; let x1 = 0, x2 = 0, y1 = 0, y2 = 0; return (x) => { const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; }; }

// ---- instruments
const SA = 330, RAGA = { S: 1, R: 9 / 8, G: 5 / 4, P: 3 / 2, D: 5 / 3, "S'": 2, "R'": 9 / 4 };
function flute(t0, notes, amp = 0.16, pan = 0) {
  let t = t0;
  for (const [n, d] of notes) {
    const f = SA * RAGA[n], n0 = at(t), len = Math.floor(d * SR * 1.08); let ph = 0; const bp = biquadBP(f * 2, 3);
    for (let k = 0; k < len; k++) {
      const tt = k / SR, env = Math.min(1, tt / 0.07) * Math.min(1, (d * 1.08 - tt) / 0.12);
      const vib = 1 + 0.006 * Math.sin(2 * Math.PI * 5.2 * tt) * Math.min(1, tt / 0.3);
      ph += 2 * Math.PI * f * vib / SR;
      const v = Math.sin(ph) + 0.32 * Math.sin(2 * ph) + 0.1 * Math.sin(3 * ph) + bp(rnd()) * 0.5;
      put(n0 + k, v * env * amp, pan);
    }
    t += d;
  }
}
function tanpura(t0, t1, amp) {
  const strings = [SA / 2 * 1.5 / 2, SA / 2, SA / 2, SA / 4];
  for (let T = t0, k = 0; T < t1; k++) {
    const f = strings[k % 4], n0 = at(T), dur = 5;
    for (let i = 0; i < dur * SR; i++) { const t = i / SR; let v = 0; for (let h = 1; h <= 14; h++) v += Math.sin(2 * Math.PI * f * h * t + h) * Math.pow(h, -0.9) * Math.exp(-t * (0.6 + 0.05 * h)) * (h > 3 ? 0.4 + 0.6 * (1 - Math.exp(-t * 2)) : 1); put(n0 + i, v * amp * Math.min(1, t * 200), [-0.3, 0.2, 0.25, -0.1][k % 4]); }
    T += [1.3, 1.3, 1.3, 2.2][k % 4];
  }
}
function dha(t0, amp = 0.5) { const n0 = at(t0); let ph = 0; for (let k = 0; k < 0.4 * SR; k++) { const t = k / SR, f = 60 + 70 * Math.exp(-t * 18); ph += 2 * Math.PI * f / SR; put(n0 + k, (Math.sin(ph) * Math.exp(-t * 7) + rnd() * 0.25 * Math.exp(-t * 60)) * amp, -0.1); } }
function na(t0, amp = 0.3) { const n0 = at(t0); const bp = biquadBP(1800, 2); for (let k = 0; k < 0.18 * SR; k++) { const t = k / SR; put(n0 + k, (Math.sin(2 * Math.PI * 390 * t) * Math.exp(-t * 22) * 0.7 + bp(rnd()) * Math.exp(-t * 40) * 2) * amp, 0.2); } }
function whistle(t0, d = 0.95, amp = 0.22) { const n0 = at(t0); let ph = 0; for (let k = 0; k < d * SR; k++) { const t = k / SR, f = 2900 + 120 * Math.sign(Math.sin(2 * Math.PI * 28 * t)); ph += 2 * Math.PI * f / SR; const env = Math.min(1, t / 0.02) * Math.min(1, (d - t) / 0.05); put(n0 + k, (Math.sin(ph) * (0.75 + 0.25 * Math.sin(2 * Math.PI * 28 * t)) + rnd() * 0.08) * env * amp, 0.4); } }
function sweep(t0, d, f0, f1, amp, q = 1.2, pan0 = -1, pan1 = 1) { const n0 = at(t0); let bp = biquadBP(f0, q), last = f0; for (let k = 0; k < d * SR; k++) { const u = k / (d * SR), f = f0 * Math.pow(f1 / f0, u); if (Math.abs(f - last) > 15) { bp = biquadBP(f, q); last = f; } put(n0 + k, bp(rnd()) * Math.sin(Math.PI * u) * amp * 3, lerp(pan0, pan1, u)); } }
const lerp = (a, b, t) => a + (b - a) * t;
function bell(t0, f = 880, amp = 0.15, d = 4) { const parts = [[1, 1, d], [2.0, 0.5, d * 0.7], [2.76, 0.55, d * 0.55], [4.07, 0.3, d * 0.35], [5.4, 0.2, d * 0.25]]; const n0 = at(t0); for (let k = 0; k < d * SR; k++) { const t = k / SR; let v = 0; for (const [m, a, dd] of parts) v += a * Math.sin(2 * Math.PI * f * m * t) * Math.exp(-t / dd * 3); put(n0 + k, v * amp * Math.min(1, t * 500) / 2.5, 0.1); } }
function pluck(t0, f, amp = 0.12, pan = 0) { const n0 = at(t0); for (let k = 0; k < 1.4 * SR; k++) { const t = k / SR; let v = 0; for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * f * h * t) / h * Math.exp(-t * (3 + h * 1.5)); put(n0 + k, v * amp, pan); } }
function thud(t0, amp = 0.8, f = 55) { const n0 = at(t0); let ph = 0, lp = 0; for (let k = 0; k < 0.7 * SR; k++) { const t = k / SR, ff = f + 90 * Math.exp(-t * 25); ph += 2 * Math.PI * ff / SR; lp += (rnd() - lp) * 0.2; put(n0 + k, (Math.sin(ph) * Math.exp(-t * 6) + lp * 1.4 * Math.exp(-t * 30)) * amp, 0); } }
function snip(t0, amp = 0.35) { [0, 0.07].forEach((o, j) => { const n0 = at(t0 + o), bp = biquadBP(5200 - j * 900, 6); for (let k = 0; k < 0.09 * SR; k++) { const t = k / SR; put(n0 + k, (bp(rnd()) * 3 * Math.exp(-t * 70) + Math.sin(2 * Math.PI * 3100 * t) * 0.3 * Math.exp(-t * 50)) * amp, 0.3); } }); }
function chirp(t0, f0, f1, d, amp, pan) { const n0 = at(t0); let ph = 0; for (let k = 0; k < d * SR; k++) { const u = k / (d * SR); ph += 2 * Math.PI * lerp(f0, f1, u) / SR; put(n0 + k, Math.sin(ph) * Math.sin(Math.PI * u) * amp, pan); } }
function crickets(t0, t1, amp) { for (let T = t0; T < t1; T += 0.42 + rnd() * 0.2) { const pan = rnd() * 0.8, f = 4300 + rnd() * 500; for (let j = 0; j < 3; j++) chirp(T + j * 0.055, f, f, 0.035, amp, pan); } }
function birds(t0, t1, amp) { for (let T = t0; T < t1; T += 0.5 + Math.abs(rnd()) * 1.1) { const pan = rnd() * 0.9, f = 2400 + Math.abs(rnd()) * 1400, n = 2 + Math.floor(Math.abs(rnd()) * 4); for (let j = 0; j < n; j++) chirp(T + j * 0.11, f, f * 1.45, 0.07, amp, pan); } }
function windBed(t0, t1, amp) { const n0 = at(t0), n1 = at(t1); let bp = biquadBP(500, 0.8), lf = 500; for (let i = n0; i < n1; i++) { const t = i / SR, f = 520 + 220 * Math.sin(t * 0.9) + 120 * Math.sin(t * 2.3); if (i % 256 === 0 && Math.abs(f - lf) > 8) { bp = biquadBP(f, 0.9); lf = f; } const env = Math.min(1, (t - t0) / 0.8, (t1 - t) / 0.8); put(i, bp(rnd()) * amp * 4 * env, Math.sin(t * 0.7) * 0.6); } }
function waterBed(t0, t1, amp) { const n0 = at(t0), n1 = at(t1); let lp = 0, lp2 = 0; for (let i = n0; i < n1; i++) { const t = i / SR; lp = (lp + rnd() * 0.02) * 0.995; lp2 += (lp - lp2) * 0.05; const env = Math.min(1, (t - t0) / 0.6, (t1 - t) / 0.6); put(i, lp2 * amp * 3 * env * (0.8 + 0.2 * Math.sin(t * 1.3)), 0); } for (let T = t0 + 0.2; T < t1 - 0.3; T += 0.18 + Math.abs(rnd()) * 0.35) { const n = at(T); let ph = 0; for (let k = 0; k < 0.06 * SR; k++) { const u = k / (0.06 * SR); ph += 2 * Math.PI * (300 + 900 * u) / SR; put(n + k, Math.sin(ph) * Math.sin(Math.PI * u) * 0.06, rnd() * 0.6); } } }

// ---- score
const C = film.CUES, st = (i) => C[i].start;
tanpura(0.2, film.TOTAL - 1, 0.035);
crickets(0, st(5), 0.02); crickets(st(9), st(11) + 0.5, 0.025);
birds(st(5), st(5) + 2.6, 0.05); birds(st(11) + 1, film.TOTAL - 1, 0.05);
windBed(st(6), st(7) + 0.3, 0.12);
waterBed(st(7), st(8) + 0.2, 0.25);
const ev = {
  flute: (t) => flute(t, [['G', 0.45], ['P', 0.45], ['D', 0.5], ["S'", 0.9], ['D', 0.4], ['P', 0.4], ['G', 0.5], ['R', 0.45], ['S', 1.6]], 0.13, -0.15),
  swish: (t) => { sweep(t - 0.1, 0.35, 600, 4500, 0.07, 1.5); na(t + 0.25, 0.35); },
  whistle: (t) => whistle(t),
  whoosh: (t) => sweep(t, 1.1, 300, 2600, 0.1, 1.0, -0.8, 0.8),
  drumroll: (t) => { for (let k = 0; k < 30; k++) { const tt = t + k * 0.1, a = 0.2 + 0.5 * k / 30; (k % 4 === 0 ? dha : na)(tt, a); } },
  finish: (t) => { bell(t, 990, 0.14, 2.5); bell(t + 0.12, 1320, 0.1, 2.5); dha(t, 0.7); },
  stumble: (t) => { for (let k = 0; k < 14; k++) na(t + k * 0.42 + rnd() * 0.06, 0.12); dha(t + 2.85, 0.4); for (let k = 0; k < 4; k++) sweep(t + 2.4 + k * 0.55, 0.4, 200, 120, 0.05, 2); },
  chime: (t) => [1, 5 / 4, 3 / 2, 2].forEach((m, i) => bell(t + i * 0.13, 660 * m, 0.09, 2.5)),
  stamp: (t) => { thud(t, 0.9, 50); na(t, 0.4); },
  sigh: (t) => { const n0 = at(t); let ph = 0; for (let k = 0; k < 1.6 * SR; k++) { const u = k / (1.6 * SR), f = lerp(SA, SA * 0.75, u) * (1 + 0.01 * Math.sin(2 * Math.PI * 5 * k / SR)); ph += 2 * Math.PI * f / SR; put(n0 + k, (Math.sin(ph) + 0.4 * Math.sin(2 * ph)) * Math.sin(Math.PI * u) * 0.08, 0); } },
  drumloop: (t) => { for (let k = 0; k < 12; k++) { dha(t + k * 0.5, 0.3); na(t + k * 0.5 + 0.25, 0.16); } },
  wind: () => {}, underwater: () => {},
  pop: (t) => pluck(t, SA * [1, 9 / 8, 5 / 4, 3 / 2][Math.round((t - st(8)) / 1.3) % 4] * 2, 0.14, rnd() * 0.5),
  shimmer: (t) => { for (let k = 0; k < 8; k++) pluck(t + k * 0.12, SA * [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2][k] * 2, 0.07, -0.5 + k / 8); },
  snip: (t) => snip(t),
  night: () => {},
  dawn: () => {},
  rise: (t) => sweep(t, 1.8, 400, 3000, 0.06, 2, 0, 0),
  flap: (t) => { for (let k = 0; k < 8; k++) { const n0 = at(t + k * 1.15), bp = biquadBP(260, 1.2); for (let i = 0; i < 0.22 * SR; i++) { const u = i / (0.22 * SR); put(n0 + i, bp(rnd()) * Math.sin(Math.PI * u) * 0.35, 0); } } },
  flute2: (t) => flute(t, [['S', 0.4], ['R', 0.4], ['G', 0.4], ['P', 0.6], ['G', 0.35], ['P', 0.35], ['D', 0.5], ["S'", 1.2], ["R'", 0.5], ["S'", 1.8]], 0.15, 0.1),
};
C.forEach((s) => s.cues.forEach(([o, name]) => ev[name](s.start + o)));
// tears and sadness: a slow low flute line in the tragedy
flute(st(10) + 6.6, [['G', 0.7], ['R', 0.7], ['S', 1.6]], 0.08, 0);

// ---- room, fades, normalize, write
const dl = [at(0.029), at(0.041)];
for (let i = 0; i < N; i++) { if (i >= dl[0]) L[i] += R[i - dl[0]] * 0.2; if (i >= dl[1]) R[i] += L[i - dl[1]] * 0.2; }
const mags = []; for (let i = 0; i < N; i += 7) mags.push(Math.max(Math.abs(L[i]), Math.abs(R[i]))); mags.sort((a, b) => a - b);
const p999 = mags[Math.floor(mags.length * 0.999)] || 1, pre = 0.95 / p999;
for (let i = 0; i < N; i++) { const T = i / SR, f = Math.min(1, T / 0.8, (film.TOTAL - T) / 1.2); L[i] = Math.tanh(L[i] * pre) * f; R[i] = Math.tanh(R[i] * pre) * f; }
const g = 0.9, buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), 46 + i * 4); }
fs.writeFileSync(path.join(__dirname, 'soundtrack.wav'), buf);
console.log('soundtrack.wav', film.TOTAL.toFixed(1) + 's');
