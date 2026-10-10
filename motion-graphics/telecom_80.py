"""5-second 1:1 motion graphic: Jio + Airtel hold 80% of India's mobile revenue.

    python3 telecom_80.py      # writes jio-airtel-80.mp4 (1080x1080, 30fps)
"""
import math
import os
import subprocess

import cairo

W = H = 1080
FPS, DURATION = 30, 5.0
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "jio-airtel-80.mp4")

BG = (0.043, 0.051, 0.090)
JIO = (0.10, 0.38, 0.86)
AIRTEL = (0.93, 0.07, 0.13)
WHITE = (1, 1, 1)
GREY = (0.62, 0.66, 0.76)
FONT = "Inter"

JIO_SHARE, TOTAL_SHARE = 0.43, 0.80  # ring split: blue then red, up to 80%


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


def font(ctx, size, bold=True):
    ctx.select_font_face(FONT, cairo.FONT_SLANT_NORMAL,
                         cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)


def text_center(ctx, s, cx, y):
    ctx.move_to(cx - ctx.text_extents(s).x_advance / 2, y)
    ctx.show_text(s)


def glow(ctx, x, y, r, rgb, a):
    g = cairo.RadialGradient(x, y, 0, x, y, r)
    g.add_color_stop_rgba(0, *rgb, a)
    g.add_color_stop_rgba(1, *rgb, 0)
    ctx.set_source(g)
    ctx.arc(x, y, r, 0, 2 * math.pi)
    ctx.fill()


def load(name):
    return cairo.ImageSurface.create_from_png(os.path.join(HERE, "assets", name))


JIO_LOGO = load("jio.png")
AIRTEL_LOGO = load("airtel.png")


def draw_logo(ctx, surf, cx, cy, height, alpha):
    s = height / surf.get_height()
    ctx.save()
    ctx.translate(cx - surf.get_width() * s / 2, cy - height / 2)
    ctx.scale(s, s)
    ctx.set_source_surface(surf, 0, 0)
    ctx.get_source().set_filter(cairo.FILTER_BEST)
    ctx.paint_with_alpha(clamp(alpha))
    ctx.restore()


def background(ctx, t):
    ctx.set_source_rgb(*BG)
    ctx.paint()
    glow(ctx, 270 + 60 * math.sin(t * 0.8), 300, 620, JIO, 0.22)
    glow(ctx, 810 - 60 * math.sin(t * 0.7), 320, 620, AIRTEL, 0.16)
    sp = 54
    off = (t * 16) % sp
    ctx.set_source_rgba(1, 1, 1, 0.06)
    y = -sp + off
    while y < H + sp:
        x = -sp + off * 0.5
        while x < W + sp:
            ctx.arc(x, y, 1.5, 0, 2 * math.pi)
            ctx.fill()
            x += sp
        y += sp


def vignette(ctx):
    g = cairo.RadialGradient(540, 540, 260, 540, 540, 820)
    g.add_color_stop_rgba(0, 0, 0, 0, 0)
    g.add_color_stop_rgba(1, 0, 0, 0, 0.6)
    ctx.set_source(g)
    ctx.paint()


def arc_seg(ctx, cx, cy, r, a0, a1, rgb, width):
    if a1 <= a0:
        return
    start = -math.pi / 2
    ctx.set_line_width(width)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_source_rgba(*rgb, 0.35)
    ctx.set_line_width(width + 18)
    ctx.arc(cx, cy, r, start + a0 * 2 * math.pi, start + a1 * 2 * math.pi)
    ctx.stroke()
    ctx.set_source_rgb(*rgb)
    ctx.set_line_width(width)
    ctx.arc(cx, cy, r, start + a0 * 2 * math.pi, start + a1 * 2 * math.pi)
    ctx.stroke()


def draw_frame(ctx, t):
    background(ctx, t)

    # 1) logos slide in from the sides, "+" pops between them
    lp_j = out_back(prog(t, 0.0, 0.7), 1.4)
    lp_a = out_back(prog(t, 0.12, 0.82), 1.4)
    bob = 6 * math.sin(t * 3)
    draw_logo(ctx, JIO_LOGO, -200 + (300 + 200) * lp_j, 205 + bob, 190, prog(t, 0, 0.3))
    draw_logo(ctx, AIRTEL_LOGO, 1280 - (1280 - 780) * lp_a, 205 - bob, 200, prog(t, 0.12, 0.42))
    pp = out_back(prog(t, 0.5, 0.9), 2.5)
    if pp > 0:
        ctx.save()
        ctx.translate(540, 205)
        ctx.scale(pp, pp)
        ctx.rotate((1 - pp) * math.pi)
        ctx.set_source_rgb(*WHITE)
        ctx.rectangle(-30, -6, 60, 12)
        ctx.rectangle(-6, -30, 12, 60)
        ctx.fill()
        ctx.restore()

    # 2) ring fills blue (Jio) then red (Airtel) to 80%, number counts up
    cx, cy, r, lw = 540, 590, 175, 34
    rp = prog(t, 0.9, 1.15)
    if rp > 0:
        ctx.set_source_rgba(1, 1, 1, 0.08 * rp)
        ctx.set_line_width(lw)
        ctx.arc(cx, cy, r, 0, 2 * math.pi)
        ctx.stroke()
    fill = TOTAL_SHARE * in_out(prog(t, 1.0, 2.7))
    if fill > 0:
        glow(ctx, cx, cy, 330, JIO if fill < JIO_SHARE else AIRTEL, 0.12)
    arc_seg(ctx, cx, cy, r, 0, min(fill, JIO_SHARE), JIO, lw)
    arc_seg(ctx, cx, cy, r, JIO_SHARE, fill, AIRTEL, lw)
    # little end-cap dot riding the tip of the arc
    if 0 < fill < TOTAL_SHARE:
        ang = -math.pi / 2 + fill * 2 * math.pi
        ctx.set_source_rgb(*WHITE)
        ctx.arc(cx + r * math.cos(ang), cy + r * math.sin(ang), 9, 0, 2 * math.pi)
        ctx.fill()

    np_ = prog(t, 0.95, 1.3)
    if np_ > 0:
        value = round(fill / TOTAL_SHARE * 80)
        punch = 1 + 0.12 * math.sin(math.pi * prog(t, 2.7, 3.0))
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(punch, punch)
        font(ctx, 132)
        ctx.set_source_rgba(*WHITE, np_)
        num = f"{value}"
        nw = ctx.text_extents(num).x_advance
        font(ctx, 70)
        pw = ctx.text_extents("%").x_advance
        x0 = -(nw + pw) / 2
        font(ctx, 132)
        ctx.move_to(x0, 46)
        ctx.show_text(num)
        font(ctx, 70)
        ctx.move_to(x0 + nw + 4, 46)
        ctx.show_text("%")
        ctx.restore()

    # 3) caption rises in
    for i, (line, size, rgb, y, start) in enumerate((
            ("of India's mobile revenue", 56, WHITE, 885, 2.75),
            ("goes to just 2 companies", 40, GREY, 945, 3.0))):
        p = out_cubic(prog(t, start, start + 0.5))
        if p > 0:
            ctx.save()
            ctx.rectangle(0, y - size - 10, W, size + 30)
            ctx.clip()
            font(ctx, size, bold=(i == 0))
            ctx.set_source_rgba(*rgb, p)
            text_center(ctx, line, 540, y + 60 * (1 - p))
            ctx.restore()

    sp = prog(t, 3.3, 3.8)
    font(ctx, 22, bold=False)
    ctx.set_source_rgba(*GREY, 0.75 * sp)
    text_center(ctx, "Source: TRAI, Jan–Mar 2026", 540, 1040)

    vignette(ctx)
    fade = 1 - prog(t, 0, 0.2)
    if fade > 0:
        ctx.set_source_rgba(0, 0, 0, fade)
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
