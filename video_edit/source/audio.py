import numpy as np, soundfile as sf, subprocess, json, re
from scipy.signal import butter, sosfilt, sosfiltfilt
SR = 48000
TOTAL = 26.2
VIDEO_END = 24.06
rng = np.random.default_rng(3)

# ---------- 1. voice chain ----------
chain = ("highpass=f=110:poles=2,highpass=f=110:poles=2,highpass=f=110:poles=2,"
         "equalizer=f=140:t=q:w=1.0:g=-4,equalizer=f=250:t=q:w=1.0:g=-4,equalizer=f=2000:t=q:w=1.2:g=-2,equalizer=f=1100:t=q:w=1.2:g=-3,"
         "equalizer=f=4000:t=q:w=1.0:g=3.5,highshelf=f=10000:g=-5,"
         "deesser=i=0.4:m=0.5:f=0.5,"
         "acompressor=threshold=-22dB:ratio=3:attack=6:release=90:makeup=3,"
         "alimiter=limit=0.9:level=false")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "rough.wav", "-af", chain, "-ar", str(SR), "voice_fx.wav"], check=True)
# two-pass loudnorm to -14 LUFS
m = subprocess.run(["ffmpeg", "-i", "voice_fx.wav", "-af", "loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"],
                   capture_output=True, text=True).stderr
j = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", m, re.S).group(0))
ln = (f"loudnorm=I=-14:TP=-1.5:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
      f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "voice_fx.wav", "-af", ln, "-ar", str(SR), "voice_final.wav"], check=True)
v, _ = sf.read("voice_final.wav")
if v.ndim > 1: v = v.mean(1)
N = int(TOTAL * SR)
voice = np.zeros(N); voice[:len(v)] = v[:N]

t = np.arange(N) / SR
def env_adsr(n, a, d):
    e = np.ones(n); na = max(1, int(a * SR)); e[:na] = np.linspace(0, 1, na)
    e *= np.exp(-np.arange(n) / SR / d); return e
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)

# ---------- 2. music bed (original, synthesized) ----------
bpm = 94; beat = 60 / bpm; bar = 4 * beat
music = np.zeros(N)
def note(f): return 440 * 2 ** ((f - 69) / 12)
prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]  # Am F C G
bass = [45, 41, 36, 43]
nb = int(np.ceil(TOTAL / bar))
for b in range(nb):
    s0 = b * bar; i0 = int(s0 * SR); n = min(int(bar * SR), N - i0)
    if n <= 0: break
    tt = np.arange(n) / SR
    ch = prog[b % 4]
    pad = sum(np.sin(2 * np.pi * note(m) * tt + 0.3 * np.sin(2 * np.pi * 0.4 * tt)) +
              0.35 * np.sin(2 * np.pi * 2 * note(m) * tt * 1.002) for m in ch)
    fade = np.minimum(1, np.minimum(tt / 0.25, (bar - tt) / 0.3))
    music[i0:i0 + n] += 0.05 * pad * fade
    # pluck arpeggio on 8ths
    for k in range(8):
        st = int((s0 + k * beat / 2) * SR); m_ = ch[[0, 1, 2, 1][k % 4]] + 12
        L = int(0.35 * SR)
        if st + L > N: continue
        ta = np.arange(L) / SR
        music[st:st + L] += 0.045 * np.sin(2 * np.pi * note(m_) * ta) * np.exp(-ta / 0.09)
    # sub bass
    music[i0:i0 + n] += 0.09 * np.sin(2 * np.pi * note(bass[b % 4]) * tt) * fade
    # drums
    for k in range(4):
        st = int((s0 + k * beat) * SR); L = int(0.25 * SR)
        if st + L > N: continue
        ta = np.arange(L) / SR
        if k in (0, 2):  # kick
            f = 50 + 70 * np.exp(-ta / 0.03)
            music[st:st + L] += 0.30 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-ta / 0.09)
        else:  # soft snap
            nz = hp(rng.standard_normal(L), 1800)
            music[st:st + L] += 0.06 * nz * np.exp(-ta / 0.05)
    for k in range(8):  # hats
        st = int((s0 + k * beat / 2 + (0.02 if k % 2 else 0)) * SR); L = int(0.05 * SR)
        if st + L > N: continue
        music[st:st + L] += 0.025 * hp(rng.standard_normal(L), 7000) * np.exp(-np.arange(L) / SR / 0.012)
music = lp(music, 9000)
music /= np.max(np.abs(music)) + 1e-9

# sidechain duck from voice envelope
ve = np.sqrt(sosfiltfilt(butter(2, 6, 'low', fs=SR, output='sos'), voice ** 2).clip(0))
ve = ve / (ve.max() + 1e-9)
duck_db = -9 * np.clip(ve * 6, 0, 1)
base_db = np.where(t < VIDEO_END, -27, -27 + 9 * np.clip((t - VIDEO_END) / 0.5, 0, 1))
gain = 10 ** ((base_db + duck_db) / 20)
fade = np.clip(t / 0.4, 0, 1) * np.clip((TOTAL - t) / 0.8, 0, 1)
music = music * gain * fade

# ---------- 3. SFX ----------
def sfx(kind):
    if kind in ("whoosh", "swoosh_down"):
        L = int(0.45 * SR); ta = np.arange(L) / SR; nz = rng.standard_normal(L)
        out = np.zeros(L); seg = 256
        for i in range(0, L, seg):
            k = i / L; k = k if kind == "whoosh" else 1 - k
            fc = 400 + 5000 * k
            out[i:i + seg] = bp(nz[max(0, i - 2048):i + seg], fc * .7, min(fc * 1.4, 20000))[-len(out[i:i + seg]):]
        return out * np.sin(np.pi * ta / ta[-1]) ** 2 * 0.6
    if kind == "tick":
        L = int(0.03 * SR); ta = np.arange(L) / SR; return np.sin(2 * np.pi * 1800 * ta) * np.exp(-ta / 0.006)
    if kind == "ding":
        L = int(1.0 * SR); ta = np.arange(L) / SR
        return (np.sin(2 * np.pi * 1318 * ta) + .6 * np.sin(2 * np.pi * 1976 * ta) + .3 * np.sin(2 * np.pi * 2637 * ta)) * np.exp(-ta / 0.25) * .5
    if kind == "pop":
        L = int(0.09 * SR); ta = np.arange(L) / SR; f = 300 + 700 * np.exp(-ta / 0.015)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-ta / 0.03)
    if kind in ("stamp", "punch"):
        L = int(0.4 * SR); ta = np.arange(L) / SR; f = 45 + 90 * np.exp(-ta / 0.02)
        body = np.tanh(3 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-ta / (0.12 if kind == "stamp" else 0.07)))
        crack = lp(rng.standard_normal(L), 3000) * np.exp(-ta / 0.015) * (0.8 if kind == "stamp" else 0.3)
        return body + crack
    if kind == "boom":
        L = int(1.3 * SR); ta = np.arange(L) / SR; f = 38 + 60 * np.exp(-ta / 0.05)
        return np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-ta / 0.4) + lp(rng.standard_normal(L), 800) * np.exp(-ta / 0.08) * .4
    if kind == "coins":
        L = int(0.9 * SR); out = np.zeros(L)
        for k in range(9):
            st = int(rng.uniform(0, 0.45) * SR); l = int(0.3 * SR); ta = np.arange(l) / SR; f = rng.uniform(2800, 4600)
            seg = (np.sin(2 * np.pi * f * ta) + .5 * np.sin(2 * np.pi * f * 1.48 * ta)) * np.exp(-ta / 0.07)
            out[st:st + l] += seg[:L - st]
        return out * .4
    if kind == "shimmer":
        L = int(0.8 * SR); out = np.zeros(L)
        for k, m_ in enumerate([76, 79, 83, 88, 91]):
            st = int(k * 0.07 * SR); l = L - st; ta = np.arange(l) / SR
            out[st:] += np.sin(2 * np.pi * note(m_) * ta) * np.exp(-ta / 0.2)
        return out * .35
    if kind == "click":
        L = int(0.04 * SR); ta = np.arange(L) / SR
        return hp(rng.standard_normal(L), 2500) * np.exp(-ta / 0.003) + .5 * np.sin(2 * np.pi * 2400 * ta) * np.exp(-ta / 0.008)
    if kind == "bubbles":
        L = int(0.75 * SR); out = np.zeros(L)
        for k in range(4):
            st = int((0.05 + k * 0.14) * SR); p = sfx("pop"); out[st:st + len(p)] += p * (0.7 + .1 * k)
        return out
    if kind == "riser":
        L = int(0.4 * SR); ta = np.arange(L) / SR
        f = 200 + 1400 * (ta / ta[-1]) ** 2
        return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .4 + bp(rng.standard_normal(L), 2000, 8000) * .5) * (ta / ta[-1]) ** 2
    raise ValueError(kind)

LEVEL = {"whoosh": -20, "swoosh_down": -22, "tick": -26, "ding": -21, "pop": -22, "stamp": -14, "punch": -22, "boom": -15,
         "coins": -19, "shimmer": -23, "click": -24, "bubbles": -22, "riser": -21}
tl = open("build/timeline.js").read()
events = re.findall(r"\[(\d+\.\d+),\"(\w+)\"\]", tl[tl.index("const SFX"):])
fxbus = np.zeros(N)
for ts, kind in events:
    s = sfx(kind); s = s / (np.max(np.abs(s)) + 1e-9) * 10 ** (LEVEL[kind] / 20)
    i0 = int(float(ts) * SR); n = min(len(s), N - i0); fxbus[i0:i0 + n] += s[:n]

mix = voice + music + fxbus
peak = np.max(np.abs(mix)); print("peak before limit", round(20 * np.log10(peak), 2))
mix = np.tanh(mix * 1.0 / 0.95) * 0.95 if peak > 0.95 else mix
sf.write("final_mix.wav", np.stack([mix, mix], 1), SR, subtype="PCM_24")
print("events", len(events))
