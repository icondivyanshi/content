"""Render the AI Reel Tracker motion-graphics promo to an MP4.

Frames are drawn with Cairo (anti-aliased vector graphics), a soundtrack is
synthesised with NumPy, and ffmpeg encodes both into H.264 + AAC.

    pip install pycairo numpy
    python3 render.py            # writes ai-reel-tracker-promo.mp4
"""
import math
import os
import subprocess
import sys
import wave

import cairo
import numpy as np

W, H, FPS, DURATION = 1920, 1080, 30, 13.0
FRAMES = int(FPS * DURATION)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "ai-reel-tracker-promo.mp4")

BG = (0.043, 0.051, 0.090)
CYAN = (0.24, 0.88, 1.0)
VIOLET = (0.49, 0.36, 1.0)
MAGENTA = (1.0, 0.30, 0.62)
WHITE = (1, 1, 1)
GREY = (0.62, 0.66, 0.76)
FONT = "Inter"


# ---------------------------------------------------------------- easing ---
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, a, b):
    return clamp((t - a) / (b - a))


def out_cubic(p):
    return 1 - (1 - p) ** 3


def in_out(p):
    return 3 * p * p - 2 * p * p * p


def out_back(p, s=1.7):
    p -= 1
    return 1 + (s + 1) * p ** 3 + s * p ** 2


def lerp(a, b, p):
    return a + (b - a) * p


# --------------------------------------------------------------- helpers ---
def rounded_rect(ctx, x, y, w, h, r):
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()


def font(ctx, size, bold=True, mono=False):
    face = "DejaVu Sans Mono" if mono else FONT
    weight = cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL
    ctx.select_font_face(face, cairo.FONT_SLANT_NORMAL, weight)
    ctx.set_font_size(size)


def text_w(ctx, s):
    return ctx.text_extents(s).x_advance


def text_center(ctx, s, cx, y):
    ctx.move_to(cx - text_w(ctx, s) / 2, y)
    ctx.show_text(s)


def begin_layer(ctx):
    ctx.push_group()


def end_layer(ctx, alpha):
    ctx.pop_group_to_source()
    ctx.paint_with_alpha(clamp(alpha))


def glow(ctx, x, y, r, rgb, a):
    g = cairo.RadialGradient(x, y, 0, x, y, r)
    g.add_color_stop_rgba(0, *rgb, a)
    g.add_color_stop_rgba(1, *rgb, 0)
    ctx.set_source(g)
    ctx.arc(x, y, r, 0, 2 * math.pi)
    ctx.fill()


# ------------------------------------------------------------ background ---
def background(ctx, t):
    ctx.set_source_rgb(*BG)
    ctx.paint()
    glow(ctx, 960 + 520 * math.sin(t * 0.35), 420 + 160 * math.cos(t * 0.5), 900, VIOLET, 0.22)
    glow(ctx, 960 - 600 * math.cos(t * 0.28), 760 + 120 * math.sin(t * 0.6), 800, CYAN, 0.12)
    glow(ctx, 1500, 200 + 80 * math.sin(t * 0.4), 600, MAGENTA, 0.08)

    # drifting dot grid
    sp = 64
    off = (t * 14) % sp
    ctx.set_source_rgba(1, 1, 1, 0.07)
    y = -sp + off
    while y < H + sp:
        x = -sp + off * 0.5
        while x < W + sp:
            ctx.arc(x, y, 1.6, 0, 2 * math.pi)
            ctx.fill()
            x += sp
        y += sp


def vignette(ctx):
    g = cairo.RadialGradient(960, 540, 300, 960, 540, 1150)
    g.add_color_stop_rgba(0, 0, 0, 0, 0)
    g.add_color_stop_rgba(1, 0, 0, 0, 0.65)
    ctx.set_source(g)
    ctx.paint()


# -------------------------------------------------------- scene 1: title ---
def scene_title(ctx, t):
    if t > 3.4:
        return
    exit_p = in_out(prog(t, 2.8, 3.4))
    begin_layer(ctx)
    ctx.save()
    ctx.translate(960, 540)
    s = 1 + 0.25 * exit_p
    ctx.scale(s, s)
    ctx.translate(-960, -540)

    # expanding rings
    for i, (delay, col) in enumerate(((0.0, CYAN), (0.18, VIOLET), (0.36, MAGENTA))):
        p = out_cubic(prog(t, delay, delay + 1.3))
        if 0 < p < 1:
            ctx.set_source_rgba(*col, 0.9 * (1 - p))
            ctx.set_line_width(6 * (1 - p) + 1)
            ctx.arc(960, 540, 40 + 520 * p, 0, 2 * math.pi)
            ctx.stroke()

    # center line drawing outward
    lp = out_cubic(prog(t, 0.35, 1.25))
    half = 620 * lp
    g = cairo.LinearGradient(960 - half, 0, 960 + half, 0)
    g.add_color_stop_rgba(0, *CYAN, 0)
    g.add_color_stop_rgba(0.5, *WHITE, 0.9)
    g.add_color_stop_rgba(1, *MAGENTA, 0)
    ctx.set_source(g)
    ctx.rectangle(960 - half, 590, 2 * half, 3)
    ctx.fill()

    # title letters rise out of the line
    title = "AI REEL TRACKER"
    font(ctx, 132)
    total = text_w(ctx, title) + 6 * (len(title) - 1)
    x = 960 - total / 2
    ctx.save()
    ctx.rectangle(0, 380, W, 210)
    ctx.clip()
    for i, ch in enumerate(title):
        p = out_cubic(prog(t, 0.75 + i * 0.045, 1.35 + i * 0.045))
        adv = text_w(ctx, ch)
        if p > 0:
            gy = cairo.LinearGradient(0, 440, 0, 570)
            gy.add_color_stop_rgb(0, *WHITE)
            gy.add_color_stop_rgb(1, *lerp_rgb(CYAN, WHITE, 0.4))
            ctx.set_source(gy)
            ctx.move_to(x, 565 + 180 * (1 - p))
            ctx.show_text(ch)
        x += adv + 6
    ctx.restore()

    # subtitle
    sp = out_cubic(prog(t, 1.7, 2.4))
    font(ctx, 38, bold=False)
    ctx.set_source_rgba(*GREY, sp)
    text_center(ctx, "Face  ·  Body  ·  Object tracking for reels", 960, 680 + 24 * (1 - sp))

    ctx.restore()
    end_layer(ctx, 1 - exit_p)


def lerp_rgb(a, b, p):
    return tuple(lerp(x, y, p) for x, y in zip(a, b))


# ------------------------------------------------ scene 2: tracking demo ---
VX, VY, VW, VH = 460, 300, 1000, 620


def head_pos(s):
    return (VX + VW * 0.33 + 140 * math.sin(s * 1.1),
            VY + VH * 0.42 + 36 * math.sin(s * 2.1))


def ball_pos(s):
    return (VX + VW * 0.78 + 75 * math.cos(s * 1.6 + 1.0),
            VY + VH * 0.58 + 150 * math.sin(s * 2.3))


def bracket_box(ctx, x, y, w, h, rgb, label, conf, appear, s, below=False):
    p = out_cubic(prog(s, appear, appear + 0.55))
    if p <= 0:
        return
    k = 1 + 1.2 * (1 - p)
    cx, cy = x + w / 2, y + h / 2
    w, h = w * k, h * k
    x, y = cx - w / 2, cy - h / 2
    a = p
    L = 0.24 * min(w, h)
    ctx.set_line_width(5)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_source_rgba(*rgb, a)
    for (px, py, dx, dy) in ((x, y, 1, 1), (x + w, y, -1, 1), (x, y + h, 1, -1), (x + w, y + h, -1, -1)):
        ctx.move_to(px + dx * L, py)
        ctx.line_to(px, py)
        ctx.line_to(px, py + dy * L)
    ctx.stroke()
    ctx.set_source_rgba(*rgb, 0.08 * a)
    ctx.rectangle(x, y, w, h)
    ctx.fill()
    # crosshair
    ctx.set_source_rgba(*rgb, 0.6 * a)
    ctx.set_line_width(2)
    ctx.move_to(cx - 10, cy); ctx.line_to(cx + 10, cy)
    ctx.move_to(cx, cy - 10); ctx.line_to(cx, cy + 10)
    ctx.stroke()
    # label pill
    font(ctx, 22)
    txt = f"{label}  {conf:.2f}"
    tw = text_w(ctx, txt)
    ly = y + h + 10 if below else y - 44
    rounded_rect(ctx, x, ly, tw + 28, 34, 9)
    ctx.set_source_rgba(*rgb, a)
    ctx.fill()
    ctx.set_source_rgba(*BG, a)
    ctx.move_to(x + 14, ly + 25)
    ctx.show_text(txt)


def conf_value(base, s, seed):
    n = math.sin(int(s * 5) * 12.9898 + seed * 78.233) * 43758.5453
    return base + (n - math.floor(n)) * 0.03


def scene_tracking(ctx, t):
    s = t - 3.2
    if s < 0 or s > 4.3:
        return
    a_in = out_cubic(prog(s, 0, 0.6))
    a_out = in_out(prog(s, 3.8, 4.3))
    begin_layer(ctx)
    ctx.save()
    sc = lerp(0.93, 1, a_in)
    ctx.translate(960 - 120 * a_out, 610)
    ctx.scale(sc, sc)
    ctx.translate(-960, -610)

    # heading
    font(ctx, 64)
    ctx.set_source_rgb(*WHITE)
    hp = out_cubic(prog(s, 0.15, 0.8))
    ctx.save()
    ctx.rectangle(0, 160, W, 100)
    ctx.clip()
    text_center(ctx, "Locks on. Stays on.", 960, 238 + 90 * (1 - hp))
    ctx.restore()

    # viewport
    rounded_rect(ctx, VX, VY, VW, VH, 28)
    g = cairo.LinearGradient(0, VY, 0, VY + VH)
    g.add_color_stop_rgb(0, 0.09, 0.10, 0.17)
    g.add_color_stop_rgb(1, 0.05, 0.06, 0.11)
    ctx.set_source(g)
    ctx.fill_preserve()
    ctx.set_source_rgba(1, 1, 1, 0.12)
    ctx.set_line_width(2)
    ctx.stroke_preserve()
    ctx.save()
    ctx.clip()

    # floor + scan line
    glow(ctx, VX + VW / 2, VY + VH + 120, 560, VIOLET, 0.25)
    sy = VY + (s * 260) % VH
    sg = cairo.LinearGradient(0, sy - 60, 0, sy)
    sg.add_color_stop_rgba(0, *CYAN, 0)
    sg.add_color_stop_rgba(1, *CYAN, 0.10)
    ctx.set_source(sg)
    ctx.rectangle(VX, sy - 60, VW, 60)
    ctx.fill()

    hx, hy = head_pos(s)
    bx, by = ball_pos(s)

    # trail behind the head
    for k in range(1, 14):
        tx, ty = head_pos(s - k * 0.05)
        ctx.set_source_rgba(*CYAN, 0.35 * (1 - k / 14))
        ctx.arc(tx, ty, 5 * (1 - k / 16), 0, 2 * math.pi)
        ctx.fill()

    # subject: shoulders + head
    body = cairo.LinearGradient(0, hy + 60, 0, hy + 340)
    body.add_color_stop_rgb(0, 0.30, 0.33, 0.48)
    body.add_color_stop_rgb(1, 0.16, 0.18, 0.28)
    ctx.set_source(body)
    ctx.save()
    ctx.translate(hx, hy + 250)
    ctx.scale(150, 170)
    ctx.arc(0, 0, 1, math.pi, 2 * math.pi)
    ctx.restore()
    ctx.rectangle(hx - 150, hy + 249, 300, 200)
    ctx.fill()
    hg = cairo.RadialGradient(hx - 18, hy - 22, 6, hx, hy, 66)
    hg.add_color_stop_rgb(0, 0.85, 0.87, 0.95)
    hg.add_color_stop_rgb(1, 0.50, 0.53, 0.66)
    ctx.set_source(hg)
    ctx.arc(hx, hy, 62, 0, 2 * math.pi)
    ctx.fill()

    # object: ball
    bg_ = cairo.RadialGradient(bx - 10, by - 12, 4, bx, by, 36)
    bg_.add_color_stop_rgb(0, 1, 0.75, 0.86)
    bg_.add_color_stop_rgb(1, *MAGENTA)
    ctx.set_source(bg_)
    ctx.arc(bx, by, 34, 0, 2 * math.pi)
    ctx.fill()

    # tracker boxes (slightly lagged for a natural follow)
    lx, ly = head_pos(s - 0.04)
    bracket_box(ctx, lx - 210, ly - 100, 420, 520, VIOLET, "BODY", conf_value(0.93, s, 2), 1.0, s)
    bracket_box(ctx, lx - 85, ly - 85, 170, 170, CYAN, "FACE", conf_value(0.96, s, 1), 0.55, s, below=True)
    ox, oy = ball_pos(s - 0.04)
    bracket_box(ctx, ox - 55, oy - 55, 110, 110, MAGENTA, "OBJECT", conf_value(0.90, s, 3), 1.5, s)

    ctx.restore()  # viewport clip

    # HUD
    if int(s * 2) % 2 == 0:
        ctx.set_source_rgb(1, 0.25, 0.3)
        ctx.arc(VX + 40, VY + 40, 9, 0, 2 * math.pi)
        ctx.fill()
    font(ctx, 22)
    ctx.set_source_rgba(1, 1, 1, 0.85)
    ctx.move_to(VX + 58, VY + 48)
    ctx.show_text("REC")
    font(ctx, 22, bold=False, mono=True)
    f = int(s * FPS)
    tc = f"00:00:{f // FPS:02d}:{f % FPS:02d}"
    ctx.move_to(VX + VW - 40 - text_w(ctx, tc), VY + 48)
    ctx.show_text(tc)

    ctx.restore()
    end_layer(ctx, a_in * (1 - a_out))


# --------------------------------------------------- scene 3: features ---
def icon_face(ctx, rgb):
    ctx.set_source_rgb(*rgb)
    ctx.set_line_width(6)
    ctx.arc(0, 0, 44, 0, 2 * math.pi)
    ctx.stroke()
    ctx.arc(-15, -10, 6, 0, 2 * math.pi); ctx.fill()
    ctx.arc(15, -10, 6, 0, 2 * math.pi); ctx.fill()
    ctx.arc(0, 4, 22, 0.15 * math.pi, 0.85 * math.pi)
    ctx.stroke()


def icon_body(ctx, rgb):
    ctx.set_source_rgb(*rgb)
    ctx.set_line_width(6)
    ctx.arc(0, -26, 16, 0, 2 * math.pi)
    ctx.stroke()
    ctx.move_to(0, -8); ctx.line_to(0, 22)
    ctx.move_to(-30, 2); ctx.line_to(30, 2)
    ctx.move_to(0, 22); ctx.line_to(-20, 48)
    ctx.move_to(0, 22); ctx.line_to(20, 48)
    ctx.stroke()


def icon_object(ctx, rgb):
    ctx.set_source_rgb(*rgb)
    ctx.set_line_width(6)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    pts = [(0, -42), (38, -20), (38, 24), (0, 46), (-38, 24), (-38, -20)]
    ctx.move_to(*pts[0])
    for p in pts[1:]:
        ctx.line_to(*p)
    ctx.close_path()
    ctx.move_to(-38, -20); ctx.line_to(0, 2); ctx.line_to(38, -20)
    ctx.move_to(0, 2); ctx.line_to(0, 46)
    ctx.stroke()


CARDS = [
    ("Face", "Keeps every face", "perfectly centered", CYAN, icon_face),
    ("Body", "Follows full-body", "moves and poses", VIOLET, icon_body),
    ("Object", "Locks onto any", "product or prop", MAGENTA, icon_object),
]


def scene_features(ctx, t):
    s = t - 7.4
    if s < 0 or s > 2.9:
        return
    a_out = in_out(prog(s, 2.45, 2.9))
    begin_layer(ctx)

    hp = out_cubic(prog(s, 0.0, 0.6))
    font(ctx, 64)
    ctx.set_source_rgba(*WHITE, hp)
    text_center(ctx, "Track anything.", 960, 270 + 40 * (1 - hp))

    cw, ch = 440, 380
    for i, (title, l1, l2, rgb, icon) in enumerate(CARDS):
        p = prog(s, 0.25 + i * 0.16, 0.95 + i * 0.16)
        if p <= 0:
            continue
        e = out_back(p, 1.3)
        cx = 960 + (i - 1) * 500
        cy = 620 + 160 * (1 - e) - 20 * math.sin((s - i * 0.3) * 2.2) * clamp(p * 2 - 1)
        x, y = cx - cw / 2, cy - ch / 2
        ctx.save()
        begin_layer(ctx)
        glow(ctx, cx, y + 110, 200, rgb, 0.18)
        rounded_rect(ctx, x, y, cw, ch, 26)
        ctx.set_source_rgba(0.10, 0.11, 0.19, 0.92)
        ctx.fill_preserve()
        ctx.set_source_rgba(*rgb, 0.45)
        ctx.set_line_width(2)
        ctx.stroke()
        # accent bar
        rounded_rect(ctx, cx - 40, y + 18, 80, 6, 3)
        ctx.set_source_rgb(*rgb)
        ctx.fill()
        # icon with orbiting ring
        ctx.save()
        ctx.translate(cx, y + 125)
        ctx.set_source_rgba(*rgb, 0.25)
        ctx.set_line_width(2)
        ctx.set_dash([6, 10], s * 20)
        ctx.arc(0, 0, 72, 0, 2 * math.pi)
        ctx.stroke()
        ctx.set_dash([])
        icon(ctx, rgb)
        ctx.restore()
        font(ctx, 46)
        ctx.set_source_rgb(*WHITE)
        text_center(ctx, title, cx, y + 265)
        font(ctx, 26, bold=False)
        ctx.set_source_rgb(*GREY)
        text_center(ctx, l1, cx, y + 310)
        text_center(ctx, l2, cx, y + 344)
        end_layer(ctx, clamp(p * 2))
        ctx.restore()

    end_layer(ctx, 1 - a_out)


# ------------------------------------------------------- scene 4: outro ---
def scene_outro(ctx, t):
    s = t - 10.2
    if s < 0:
        return
    words = [("Free.", WHITE), ("Private.", WHITE), ("In your browser.", CYAN)]
    font(ctx, 104)
    gap = 36
    widths = [text_w(ctx, w) for w, _ in words]
    total = sum(widths) + gap * (len(words) - 1)
    x = 960 - total / 2
    for i, ((word, rgb), w) in enumerate(zip(words, widths)):
        p = prog(s, i * 0.28, i * 0.28 + 0.55)
        if p > 0:
            k = lerp(0.4, 1, out_back(p, 2.2))
            ctx.save()
            ctx.translate(x + w / 2, 520)
            ctx.scale(k, k)
            if rgb is CYAN:
                g = cairo.LinearGradient(-w / 2, 0, w / 2, 0)
                g.add_color_stop_rgba(0, *CYAN, clamp(p * 2))
                g.add_color_stop_rgba(1, *MAGENTA, clamp(p * 2))
                ctx.set_source(g)
            else:
                ctx.set_source_rgba(*rgb, clamp(p * 2))
            ctx.move_to(-w / 2, 36)
            ctx.show_text(word)
            ctx.restore()
        x += w + gap

    lp = out_cubic(prog(s, 1.05, 1.75))
    if lp > 0:
        g = cairo.LinearGradient(960 - total / 2, 0, 960 + total / 2, 0)
        g.add_color_stop_rgb(0, *CYAN)
        g.add_color_stop_rgb(0.5, *VIOLET)
        g.add_color_stop_rgb(1, *MAGENTA)
        ctx.set_source(g)
        rounded_rect(ctx, 960 - total / 2 * lp, 600, total * lp, 6, 3)
        ctx.fill()

    sp = out_cubic(prog(s, 1.4, 2.0))
    font(ctx, 34, bold=False)
    ctx.set_source_rgba(*GREY, sp)
    text_center(ctx, "AI Reel Tracker  —  face, body & object tracking", 960, 690 + 20 * (1 - sp))


# --------------------------------------------------------------- render ---
def draw_frame(ctx, t):
    background(ctx, t)
    scene_title(ctx, t)
    scene_tracking(ctx, t)
    scene_features(ctx, t)
    scene_outro(ctx, t)
    vignette(ctx)
    # fade in from / out to black
    fade = max(1 - prog(t, 0, 0.35), prog(t, DURATION - 0.7, DURATION))
    if fade > 0:
        ctx.set_source_rgba(0, 0, 0, fade)
        ctx.paint()


def make_audio(path, sr=44100):
    n = int(sr * DURATION)
    t = np.arange(n) / sr
    out = np.zeros(n)

    def env(start, attack, length, release):
        e = np.clip((t - start) / attack, 0, 1)
        e *= np.clip((start + length - t) / release, 0, 1)
        return e

    # warm pad: Am - F - C - G, one chord per scene
    chords = [(0.0, [220.0, 261.63, 329.63]), (3.2, [174.61, 220.0, 261.63]),
              (7.4, [261.63, 329.63, 392.0]), (10.2, [196.0, 246.94, 293.66, 392.0])]
    for i, (st, notes) in enumerate(chords):
        end = chords[i + 1][0] if i + 1 < len(chords) else DURATION
        e = env(st, 0.6, end - st + 0.6, 1.0)
        for f in notes:
            for h, amp in ((1, 1.0), (2, 0.3), (3, 0.12)):
                out += 0.05 * amp * e * np.sin(2 * np.pi * f * h * t + 0.3 * np.sin(2 * np.pi * 0.2 * t))

    # pulse: soft kick on each beat at 120 bpm from scene 2 to the outro
    for bt in np.arange(3.2, 12.0, 0.5):
        m = (t >= bt) & (t < bt + 0.35)
        tt = t[m] - bt
        freq = 50 + 90 * np.exp(-tt * 30)
        out[m] += 0.35 * np.exp(-tt * 9) * np.sin(2 * np.pi * np.cumsum(freq) / sr)

    # whooshes into each scene
    rng = np.random.default_rng(7)
    noise = rng.standard_normal(n)
    smooth = np.convolve(noise, np.ones(24) / 24, mode="same")
    for wt in (0.0, 3.0, 7.2, 10.0):
        e = np.exp(-((t - (wt + 0.25)) / 0.18) ** 2)
        out += 0.5 * e * smooth

    # impact under the title reveal and the outro
    for it in (0.8, 10.2):
        m = t >= it
        tt = t[m] - it
        out[m] += 0.5 * np.exp(-tt * 4) * np.sin(2 * np.pi * (40 + 40 * np.exp(-tt * 8)) * tt)

    out *= np.clip((DURATION - t) / 1.0, 0, 1)  # fade out
    out = np.tanh(out * 1.2)
    out /= np.max(np.abs(out)) / 0.89
    pcm = (out * 32767).astype(np.int16)
    stereo = np.column_stack([pcm, pcm]).ravel()
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(stereo.tobytes())


def main():
    audio = os.path.join(HERE, ".soundtrack.wav")
    make_audio(audio)
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-i", audio,
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT,
    ], stdin=subprocess.PIPE)
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surf)
    for i in range(FRAMES):
        ctx.save()
        draw_frame(ctx, i / FPS)
        ctx.restore()
        surf.flush()
        ff.stdin.write(surf.get_data())
        if i % 30 == 0:
            print(f"frame {i}/{FRAMES}", file=sys.stderr)
    ff.stdin.close()
    ff.wait()
    os.remove(audio)
    print("wrote", OUT)


if __name__ == "__main__":
    main()
