"""5-second 1:1 motion graphic from a real headline screenshot: the screenshot slides in as a
rounded card over blurred newsprint, then the chosen line is underlined in red pen.
The screenshot itself is never altered.

    python3 screenshot_card.py   # writes starlink-govt-headline.mp4 (1080x1080, 30fps)
"""
import math
import os
import subprocess

import cairo
from PIL import Image, ImageDraw, ImageFilter

from cheapest_data import clamp, in_out, ink_stroke, prog, wobbly_line
from news_card import NEWSPRINT, pil_to_surface

W = H = 1080
FPS, DURATION = 30, 5.0
HERE = os.path.dirname(os.path.abspath(__file__))
IMAGE = os.path.join(HERE, "assets", "starlink-headline.jpg")
OUT = os.path.join(HERE, "starlink-govt-headline.mp4")

# Underlines in the screenshot's own pixel coordinates: (x0, x1, y), drawn in order.
# "Government Hits Back at" / "Musk's Starlink Bias Allegation"
UNDERLINES = [(50, 584, 216), (52, 683, 277)]
PEN = (0.96, 0.22, 0.20)
CARD_W, RADIUS = 1000, 34

SHOT = pil_to_surface(Image.open(IMAGE))
SCALE = CARD_W / SHOT.get_width()
CARD_H = SHOT.get_height() * SCALE


def make_shadow(w, h, r):
    pad = 90
    im = Image.new("L", (int(w) + 2 * pad, int(h) + 2 * pad), 0)
    ImageDraw.Draw(im).rounded_rectangle([pad, pad, pad + w, pad + h], r, fill=170)
    im = im.filter(ImageFilter.GaussianBlur(30))
    return pil_to_surface(Image.merge("RGBA", [Image.new("L", im.size, 0)] * 3 + [im])), pad


SHADOW, SHADOW_PAD = make_shadow(CARD_W, CARD_H, RADIUS)


def rounded(ctx, w, h, r):
    ctx.new_sub_path()
    ctx.arc(w - r, r, r, -math.pi / 2, 0)
    ctx.arc(w - r, h - r, r, 0, math.pi / 2)
    ctx.arc(r, h - r, r, math.pi / 2, math.pi)
    ctx.arc(r, r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()


def draw_frame(ctx, t):
    ctx.save()
    ctx.translate(-300 + 30 * t, -300 + 20 * t)
    ctx.set_source_surface(NEWSPRINT, 0, 0)
    ctx.paint()
    ctx.restore()
    ctx.set_source_rgba(0.05, 0.04, 0.04, 0.55)
    ctx.paint()
    g = cairo.RadialGradient(540, 540, 280, 540, 540, 800)
    g.add_color_stop_rgba(0, 0, 0, 0, 0)
    g.add_color_stop_rgba(1, 0, 0, 0, 0.6)
    ctx.set_source(g)
    ctx.paint()

    zoom = 1 + 0.12 * in_out(prog(t, 1.3, 5.0))
    ctx.save()
    ctx.translate(540, 540)
    ctx.scale(zoom, zoom)
    ctx.translate(-540, -540)

    p = prog(t, 0.15, 1.15)
    e = 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2 if p > 0 else 0
    ctx.translate(540, 540 + 700 * (1 - e))
    ctx.rotate(math.radians(-7) * (1 - e) + math.radians(-1.5) * clamp(e))
    sc = 0.88 + 0.12 * e
    ctx.scale(sc, sc)
    ctx.translate(-CARD_W / 2, -CARD_H / 2)

    ctx.set_source_surface(SHADOW, -SHADOW_PAD, -SHADOW_PAD + 20)
    ctx.paint_with_alpha(clamp(p * 2))
    ctx.save()
    rounded(ctx, CARD_W, CARD_H, RADIUS)
    ctx.clip()
    ctx.scale(SCALE, SCALE)
    ctx.set_source_surface(SHOT, 0, 0)
    ctx.get_source().set_filter(cairo.FILTER_BEST)
    ctx.paint()
    ctx.restore()
    rounded(ctx, CARD_W, CARD_H, RADIUS)
    ctx.set_source_rgba(1, 1, 1, 0.14)
    ctx.set_line_width(2)
    ctx.stroke()

    t0, per = 1.45, 0.7
    for i, (x0, x1, y) in enumerate(UNDERLINES):
        up = in_out(prog(t, t0 + i * per, t0 + (i + 1) * per))
        pts = [(x * SCALE, yy * SCALE) for x, yy in wobbly_line(x0 - 4, x1 + 6, y, 1.3 + i)]
        ink_stroke(ctx, pts, up, PEN, 6)
    ctx.restore()

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
