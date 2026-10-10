"""5-second 1:1 "news clipping" motion graphic: a rounded article card slides in over a
blurred newsprint background, then the key line gets underlined in red pen.

The headline is quoted verbatim from Zee News; keep it verbatim if you change it.
Needs the NP * fonts from ./fonts installed (see cheapest_data.py).

    python3 news_card.py       # writes india-cheapest-news-card.mp4 (1080x1080, 30fps)
"""
import math
import os
import random
import subprocess

import cairo
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from cheapest_data import INK, RED, clamp, in_out, ink_stroke, out_cubic, prog, wobbly_line

W = H = 1080
FPS, DURATION = 30, 5.0
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "india-cheapest-news-card.mp4")

SOURCE = "Zee News"
SOURCE_URL = "zeenews.india.com/technology"
HEADLINE = ("India has one of the cheapest mobile data pricing in the world, "
            "THIS is the worldwide rank")
UNDERLINE = "one of the cheapest mobile data pricing in the world"

CARD_W, PAD = 900, 56
HEAD_SIZE, LINE_H = 56, 70


def pil_to_surface(im):
    im = im.convert("RGBA")
    arr = np.asarray(im).astype(np.float32)
    a = arr[..., 3:4] / 255
    bgra = np.concatenate([arr[..., 2:3] * a, arr[..., 1:2] * a, arr[..., 0:1] * a, arr[..., 3:4]], axis=2)
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, im.width, im.height)
    view = np.ndarray((im.height, surf.get_stride() // 4, 4), np.uint8, surf.get_data())
    view[:, :im.width] = bgra.astype(np.uint8)
    surf.mark_dirty()
    return surf


def make_newsprint():
    """Blurred page of fake newsprint (grey word-bars in columns): reads as 'newspaper', says nothing."""
    bw, bh = 1400, 1400
    im = Image.new("RGB", (bw, bh), (232, 225, 210))
    d = ImageDraw.Draw(im)
    rng = random.Random(11)
    cols, gutter = 4, 40
    cw = (bw - gutter * (cols + 1)) / cols
    for c in range(cols):
        x0 = gutter + c * (cw + gutter)
        y = 60
        while y < bh - 40:
            if rng.random() < 0.08:  # a heading block
                for _ in range(2):
                    x = x0
                    while x < x0 + cw - 40:
                        w = rng.uniform(40, 120)
                        d.rectangle([x, y, min(x + w, x0 + cw), y + 22], fill=(60, 55, 50))
                        x += w + 14
                    y += 34
                y += 14
                continue
            x = x0
            while x < x0 + cw:
                w = rng.uniform(14, 70)
                d.rectangle([x, y, min(x + w, x0 + cw), y + 8], fill=(120, 113, 104))
                x += w + 8
            y += 20
        d.line([x0 + cw + gutter / 2, 40, x0 + cw + gutter / 2, bh - 40], fill=(150, 142, 130), width=2)
    im = im.filter(ImageFilter.GaussianBlur(5))
    return pil_to_surface(im)


def layout_headline(ctx):
    ctx.select_font_face("NP Bold", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(HEAD_SIZE)
    space = ctx.text_extents(" ").x_advance
    words = HEADLINE.split()
    target = UNDERLINE.split()
    start = next(i for i in range(len(words)) if [w.strip(",") for w in words[i:i + len(target)]] == target)
    marked = set(range(start, start + len(target)))
    placed, x, line = [], 0, 0
    maxw = CARD_W - 2 * PAD
    for i, w in enumerate(words):
        ww = ctx.text_extents(w).x_advance
        if x > 0 and x + ww > maxw:
            x, line = 0, line + 1
        # don't underline the trailing comma
        uw = ctx.text_extents(w.rstrip(",")).x_advance
        placed.append((w, x, line, ww, uw, i in marked))
        x += ww + space
    return placed, line + 1


def make_card():
    tmp = cairo.Context(cairo.ImageSurface(cairo.FORMAT_ARGB32, 10, 10))
    placed, nlines = layout_headline(tmp)
    head_top = PAD + 110
    card_h = head_top + nlines * LINE_H + 50
    surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, CARD_W, card_h)
    ctx = cairo.Context(surf)
    r = 30
    ctx.new_sub_path()
    ctx.arc(CARD_W - r, r, r, -math.pi / 2, 0)
    ctx.arc(CARD_W - r, card_h - r, r, 0, math.pi / 2)
    ctx.arc(r, card_h - r, r, math.pi / 2, math.pi)
    ctx.arc(r, r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()
    ctx.set_source_rgb(1, 1, 1)
    ctx.fill()

    # source row
    ctx.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    ctx.set_font_size(32)
    ctx.set_source_rgb(*INK)
    ctx.move_to(PAD, PAD + 30)
    ctx.show_text(SOURCE)
    ctx.select_font_face("Inter", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(22)
    ctx.set_source_rgb(0.45, 0.45, 0.47)
    ctx.move_to(PAD, PAD + 64)
    ctx.show_text(SOURCE_URL)
    ctx.set_source_rgb(0.88, 0.88, 0.88)
    ctx.rectangle(PAD, PAD + 86, CARD_W - 2 * PAD, 2)
    ctx.fill()

    # headline
    ctx.select_font_face("NP Bold", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(HEAD_SIZE)
    ctx.set_source_rgb(*INK)
    for w, x, line, _, _, _ in placed:
        ctx.move_to(PAD + x, head_top + HEAD_SIZE + line * LINE_H)
        ctx.show_text(w)

    # underline segments, one per line, in reading order
    segs = {}
    for w, x, line, ww, uw, m in placed:
        if m:
            a, b = segs.get(line, (x, x + uw))
            segs[line] = (min(a, x), max(b, x + uw))
    underline = [(PAD + a, PAD + b, head_top + HEAD_SIZE + line * LINE_H + 14)
                 for line, (a, b) in sorted(segs.items())]
    return surf, card_h, underline


def make_shadow(card_h):
    pad = 80
    im = Image.new("L", (CARD_W + 2 * pad, card_h + 2 * pad), 0)
    ImageDraw.Draw(im).rounded_rectangle([pad, pad, pad + CARD_W, pad + card_h], 30, fill=150)
    im = im.filter(ImageFilter.GaussianBlur(28))
    rgba = Image.merge("RGBA", [Image.new("L", im.size, 0)] * 3 + [im])
    return pil_to_surface(rgba), pad


NEWSPRINT = make_newsprint()
CARD, CARD_H, UNDERLINE_SEGS = make_card()
SHADOW, SHADOW_PAD = make_shadow(CARD_H)


def draw_frame(ctx, t):
    # background: drifting blurred newsprint, darkened
    ctx.save()
    ctx.translate(-300 + 30 * t, -300 + 20 * t)
    ctx.set_source_surface(NEWSPRINT, 0, 0)
    ctx.paint()
    ctx.restore()
    ctx.set_source_rgba(0.06, 0.05, 0.04, 0.5)
    ctx.paint()
    g = cairo.RadialGradient(540, 540, 300, 540, 540, 800)
    g.add_color_stop_rgba(0, 0, 0, 0, 0)
    g.add_color_stop_rgba(1, 0, 0, 0, 0.55)
    ctx.set_source(g)
    ctx.paint()

    # camera: slow push toward the underlined line once the card has landed
    zoom = 1 + 0.10 * in_out(prog(t, 1.4, 5.0))
    ctx.save()
    ctx.translate(540, 540)
    ctx.scale(zoom, zoom)
    ctx.translate(-540, -540)

    # card motion: rises from below, tilting into place, with a soft overshoot
    p = prog(t, 0.15, 1.15)
    e = 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2 if p > 0 else 0
    cx, cy = 540, 540 + 700 * (1 - e)
    rot = math.radians(-7) * (1 - e) + math.radians(-1.2) * clamp(e)
    sc = 0.88 + 0.12 * e
    ctx.translate(cx, cy)
    ctx.rotate(rot)
    ctx.scale(sc, sc)
    ctx.translate(-CARD_W / 2, -CARD_H / 2)
    ctx.set_source_surface(SHADOW, -SHADOW_PAD, -SHADOW_PAD + 18)
    ctx.paint_with_alpha(clamp(p * 2))
    ctx.set_source_surface(CARD, 0, 0)
    ctx.paint()

    # red pen underline, line by line
    n = len(UNDERLINE_SEGS)
    t0, per = 1.45, 0.55
    for i, (x0, x1, y) in enumerate(UNDERLINE_SEGS):
        up = in_out(prog(t, t0 + i * per, t0 + (i + 1) * per))
        ink_stroke(ctx, wobbly_line(x0 - 4, x1 + 6, y, 1.3 + i), up, RED, 6)
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
