"""5-second 1:1 newspaper-style motion graphic: India has some of the world's cheapest mobile data.

Uses the fonts in ./fonts (Playfair Display, Old Standard TT, UnifrakturMaguntia — all OFL),
renamed to "NP *" families. Install them first, e.g. `cp fonts/*.ttf ~/.fonts && fc-cache -f`.

    python3 cheapest_data.py   # writes india-cheapest-data.mp4 (1080x1080, 30fps)
"""
import math
import os
import subprocess

import cairo
import numpy as np

W = H = 1080
FPS, DURATION = 30, 5.0
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "india-cheapest-data.mp4")

PAPER = (0.949, 0.925, 0.867)
INK = (0.102, 0.090, 0.078)
RED = (0.70, 0.13, 0.10)
FADED = (0.38, 0.35, 0.31)
M = 64  # page margin

# Cost of 1GB of mobile data, USD — Cable.co.uk Worldwide Mobile Data Pricing 2023
BARS = [("United States", 6.00), ("Global average", 2.59), ("United Kingdom", 0.62), ("India", 0.16)]


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, a, b):
    return clamp((t - a) / (b - a))


def out_cubic(p):
    return 1 - (1 - p) ** 3


def in_out(p):
    return 3 * p * p - 2 * p * p * p


def face(ctx, family, size):
    ctx.select_font_face(family, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)


def adv(ctx, s, spacing=0):
    return ctx.text_extents(s).x_advance + spacing * max(0, len(s) - 1)


def show(ctx, s, x, y, spacing=0):
    if not spacing:
        ctx.move_to(x, y)
        ctx.show_text(s)
        return
    for c in s:
        ctx.move_to(x, y)
        ctx.show_text(c)
        x += ctx.text_extents(c).x_advance + spacing


def rule(ctx, y, width, p=1.0, x0=M, x1=W - M, centre=False, rgb=INK):
    if p <= 0:
        return
    if centre:
        mid, half = (x0 + x1) / 2, (x1 - x0) / 2 * p
        a, b = mid - half, mid + half
    else:
        a, b = x0, x0 + (x1 - x0) * p
    ctx.set_source_rgb(*rgb)
    ctx.rectangle(a, y - width / 2, b - a, width)
    ctx.fill()


def ink_stroke(ctx, pts, p, rgb, width):
    """Draw the first fraction p of a polyline, like a pen being dragged."""
    if p <= 0:
        return
    n = max(2, int(len(pts) * p))
    ctx.set_source_rgba(*rgb, 0.92)
    ctx.set_line_width(width)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.move_to(*pts[0])
    for q in pts[1:n]:
        ctx.line_to(*q)
    ctx.stroke()


def wobbly_line(x0, x1, y, seed, n=60):
    return [(x0 + (x1 - x0) * i / (n - 1),
             y + 2.2 * math.sin(i * 0.45 + seed) + 1.2 * math.sin(i * 1.3 + seed * 2) + (i / n) * -3)
            for i in range(n)]


def ink_ellipse(cx, cy, rx, ry, seed, n=90):
    pts = []
    for i in range(n):
        a = -2.6 + 2 * math.pi * 1.12 * i / (n - 1)  # a bit more than one lap, like a hand-drawn circle
        r = 1 + 0.04 * math.sin(a * 3 + seed) + 0.05 * i / n
        pts.append((cx + rx * r * math.cos(a), cy + ry * r * math.sin(a) - 4 * math.sin(a * 0.5)))
    return pts


def make_grain(seed):
    rng = np.random.default_rng(seed)
    noise = rng.random((H, W))
    a = (np.clip(noise - 0.55, 0, 1) * 34).astype(np.uint8)  # sparse dark specks
    buf = np.zeros((H, W, 4), np.uint8)
    buf[..., 0] = (a * 0.2).astype(np.uint8)
    buf[..., 1] = (a * 0.18).astype(np.uint8)
    buf[..., 2] = (a * 0.16).astype(np.uint8)
    buf[..., 3] = a
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    np.ndarray((H, surf.get_stride() // 4, 4), np.uint8, surf.get_data())[:, :W] = buf
    surf.mark_dirty()
    return surf


GRAIN = [make_grain(s) for s in (1, 2, 3)]


def draw_page(ctx, t):
    ctx.set_source_rgb(*PAPER)
    ctx.paint()

    # --- top strip + masthead -------------------------------------------
    a = prog(t, 0.0, 0.4)
    face(ctx, "NP TextBold", 18)
    ctx.set_source_rgba(*INK, a)
    show(ctx, "VOL. XXVI  ·  No. 214", M, 72, 2)
    s = "DATA EDITION"
    show(ctx, s, W - M - adv(ctx, s, 2), 72, 2)
    rule(ctx, 86, 1, out_cubic(prog(t, 0.0, 0.5)), centre=True)

    mp = in_out(prog(t, 0.1, 0.75))
    face(ctx, "NP Fraktur", 104)
    title = "The Data Times"
    tw = adv(ctx, title)
    ctx.save()
    ctx.rectangle(0, 90, W * mp, 120)
    ctx.clip()
    ctx.set_source_rgb(*INK)
    show(ctx, title, (W - tw) / 2, 180)
    ctx.restore()

    rp = out_cubic(prog(t, 0.35, 0.9))
    rule(ctx, 206, 4, rp, centre=True)
    rule(ctx, 214, 1, rp, centre=True)
    da = prog(t, 0.6, 1.0)
    face(ctx, "NP TextItalic", 21)
    ctx.set_source_rgba(*INK, da)
    show(ctx, "New Delhi", M, 244)
    s = "Mobile Data Special"
    show(ctx, s, (W - adv(ctx, s)) / 2, 244)
    s = "Figures in US Dollars"
    show(ctx, s, W - M - adv(ctx, s), 244)
    rule(ctx, 258, 1, rp, centre=True)

    # --- kicker + headline -------------------------------------------------
    ka = prog(t, 0.8, 1.1)
    face(ctx, "NP TextBold", 22)
    ctx.set_source_rgba(*RED, ka)
    show(ctx, "TELECOM  ·  EXCLUSIVE", M, 312, 3)

    face(ctx, "NP Black", 76)
    lines = ["India Has One of the", "World’s Cheapest", "Mobile Data Rates"]
    ys = [392, 474, 556]
    for i, (line, y) in enumerate(zip(lines, ys)):
        p = out_cubic(prog(t, 0.9 + i * 0.22, 1.45 + i * 0.22))
        if p <= 0:
            continue
        ctx.save()
        ctx.rectangle(M - 10, y - 80, (adv(ctx, line) + 20) * p, 100)
        ctx.clip()
        ctx.set_source_rgb(*INK)
        show(ctx, line, M, y + 12 * (1 - p))
        ctx.restore()

    # red pen underline under "Cheapest"
    x0 = M + adv(ctx, "World’s ")
    x1 = M + adv(ctx, "World’s Cheapest")
    up = in_out(prog(t, 1.75, 2.15))
    ink_stroke(ctx, wobbly_line(x0 - 6, x1 + 8, ys[1] + 16, 1.0), up, RED, 6)
    ink_stroke(ctx, wobbly_line(x0 + 14, x1 - 4, ys[1] + 28, 2.5), in_out(prog(t, 1.95, 2.3)), RED, 3.5)

    # deck
    dp = prog(t, 2.0, 2.4)
    face(ctx, "NP TextItalic", 28)
    ctx.set_source_rgba(*FADED, dp)
    show(ctx, "1GB costs about $0.16 — roughly 16× below the global average.", M, 612 + 8 * (1 - dp))
    rule(ctx, 640, 1, out_cubic(prog(t, 2.1, 2.6)))

    # --- chart ---------------------------------------------------------------
    face(ctx, "NP TextBold", 19)
    ctx.set_source_rgba(*INK, prog(t, 2.2, 2.5))
    show(ctx, "AVERAGE COST OF 1GB OF MOBILE DATA (USD)", M, 680, 2.5)

    label_w, bar_x, bar_max = 230, M + 240, 560
    for i, (name, val) in enumerate(BARS):
        y = 712 + i * 66
        p = out_cubic(prog(t, 2.35 + i * 0.16, 3.15 + i * 0.16))
        if p <= 0:
            continue
        india = name == "India"
        face(ctx, "NP Bold", 28)
        ctx.set_source_rgba(*(RED if india else INK), clamp(p * 3))
        show(ctx, name, M, y + 32)
        w = max(6, bar_max * val / BARS[0][1]) * p
        ctx.set_source_rgb(*(RED if india else INK))
        ctx.rectangle(bar_x, y + 6, w, 36)
        ctx.fill()
        if not india:  # engraving-style hatch on the ink bars
            ctx.save()
            ctx.rectangle(bar_x, y + 6, w, 36)
            ctx.clip()
            ctx.set_source_rgba(*PAPER, 0.18)
            ctx.set_line_width(2)
            for hx in range(int(bar_x) - 40, int(bar_x + w) + 40, 9):
                ctx.move_to(hx, y + 42)
                ctx.line_to(hx + 36, y + 6)
            ctx.stroke()
            ctx.restore()
        face(ctx, "NP Bold", 30)
        ctx.set_source_rgba(*(RED if india else INK), clamp(p * 3))
        vx = bar_x + w + 16
        show(ctx, f"${val * p:.2f}", vx, y + 34)
        if india:
            cp = in_out(prog(t, 3.55, 4.1))
            vw = adv(ctx, "$0.16")
            ink_stroke(ctx, ink_ellipse(vx + vw / 2, y + 23, vw / 2 + 26, 34, 0.7), cp, RED, 4)
            np_ = out_cubic(prog(t, 3.9, 4.3))
            if np_ > 0:
                ax = vx + vw + 46 + 10 * (1 - np_)
                ctx.set_source_rgba(*RED, np_)
                ctx.set_line_width(3)
                ctx.set_line_cap(cairo.LINE_CAP_ROUND)
                ctx.move_to(ax + 40, y + 23)
                ctx.line_to(ax, y + 23)
                ctx.move_to(ax + 12, y + 13)
                ctx.line_to(ax, y + 23)
                ctx.line_to(ax + 12, y + 33)
                ctx.stroke()
                face(ctx, "NP TextItalic", 26)
                show(ctx, "among the world’s cheapest", ax + 54, y + 32)

    # --- footer ----------------------------------------------------------
    fa = prog(t, 2.6, 3.0)
    rule(ctx, 994, 1, out_cubic(prog(t, 2.6, 3.1)))
    face(ctx, "NP TextItalic", 18)
    ctx.set_source_rgba(*FADED, fa)
    show(ctx, "Source: Cable.co.uk, Worldwide Mobile Data Pricing 2023. National averages, not PPP-adjusted.", M, 1024)
    face(ctx, "NP TextBold", 18)
    show(ctx, "A1", W - M - adv(ctx, "A1"), 1024)


def draw_frame(ctx, t):
    ctx.save()
    # slow camera push-in across the page
    z = 1.0 + 0.035 * in_out(t / DURATION)
    ctx.translate(W / 2, H / 2)
    ctx.scale(z, z)
    ctx.translate(-W / 2, -H / 2)
    draw_page(ctx, t)
    ctx.restore()
    ctx.set_source_surface(GRAIN[int(t * 12) % 3], 0, 0)
    ctx.paint()
    g = cairo.RadialGradient(540, 540, 380, 540, 540, 820)
    g.add_color_stop_rgba(0, 0.25, 0.18, 0.1, 0)
    g.add_color_stop_rgba(1, 0.25, 0.18, 0.1, 0.22)
    ctx.set_source(g)
    ctx.paint()
    fade = 1 - prog(t, 0, 0.2)
    if fade > 0:
        ctx.set_source_rgba(*PAPER, fade)
        ctx.paint()


def main():
    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "rawvideo", "-pix_fmt", "bgra", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", OUT,
    ], stdin=subprocess.PIPE)
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    ctx = cairo.Context(surf)
    for i in range(int(FPS * DURATION)):
        ctx.save()
        draw_frame(ctx, i / FPS)
        ctx.restore()
        surf.flush()
        ff.stdin.write(surf.get_data())
    ff.stdin.close()
    ff.wait()
    print("wrote", OUT)


if __name__ == "__main__":
    main()
