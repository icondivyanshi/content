"""5-second 1:1 motion graphic: Jio & Airtel sign Starlink deals with SpaceX (March 2025).

    python3 starlink_deal.py   # writes jio-airtel-starlink.mp4 (1080x1080, 30fps)
"""
import math
import os
import random
import subprocess

import cairo

from telecom_80 import (AIRTEL, AIRTEL_LOGO, BG, GREY, JIO, JIO_LOGO, WHITE, clamp, draw_logo,
                        font, glow, in_out, out_back, out_cubic, prog, text_center, vignette)

W = H = 1080
FPS, DURATION = 30, 5.0
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "jio-airtel-starlink.mp4")
SKY = (0.55, 0.75, 1.0)

rng = random.Random(4)
STARS = [(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(0.6, 2.0), rng.uniform(0, 6.3))
         for _ in range(140)]


def rounded_rect(ctx, x, y, w, h, r):
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 1.5 * math.pi)
    ctx.close_path()


def background(ctx, t):
    ctx.set_source_rgb(*BG)
    ctx.paint()
    glow(ctx, 540, -120, 760, SKY, 0.16)
    glow(ctx, 180, 420, 420, JIO, 0.16)
    glow(ctx, 900, 420, 420, AIRTEL, 0.12)
    for x, y, r, ph in STARS:
        a = 0.25 + 0.35 * (0.5 + 0.5 * math.sin(t * 3 + ph))
        ctx.set_source_rgba(1, 1, 1, a)
        ctx.arc((x - t * 8 * r) % W, y, r, 0, 2 * math.pi)
        ctx.fill()


def sat_pos(t):
    x = -120 + (W + 240) * (t / DURATION)
    y = 250 - 120 * math.sin(math.pi * (x + 120) / (W + 240))
    return x, y


def satellite(ctx, t):
    for k in range(1, 22):
        tx, ty = sat_pos(t - k * 0.035)
        ctx.set_source_rgba(*SKY, 0.4 * (1 - k / 22))
        ctx.arc(tx, ty, 3.2 * (1 - k / 26), 0, 2 * math.pi)
        ctx.fill()
    x, y = sat_pos(t)
    x2, y2 = sat_pos(t + 0.02)
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(math.atan2(y2 - y, x2 - x))
    glow(ctx, 0, 0, 70, SKY, 0.35)
    for side in (-1, 1):
        px = side * 22 - (60 if side < 0 else 0)
        ctx.set_source_rgb(0.12, 0.22, 0.45)
        ctx.rectangle(px, -12, 60, 24)
        ctx.fill()
        ctx.set_source_rgba(*SKY, 0.6)
        ctx.set_line_width(1.2)
        for gx in range(1, 4):
            ctx.move_to(px + gx * 15, -12)
            ctx.line_to(px + gx * 15, 12)
        ctx.move_to(px, 0)
        ctx.line_to(px + 60, 0)
        ctx.stroke()
    ctx.set_source_rgb(0.92, 0.94, 1.0)
    rounded_rect(ctx, -20, -10, 40, 20, 4)
    ctx.fill()
    ctx.restore()


def icon_store(ctx, rgb):
    ctx.set_source_rgb(*rgb)
    ctx.set_line_width(5)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.move_to(-34, -14)
    for i in range(5):
        ctx.arc(-34 + 7 + i * 14 + 0.0, -14, 7, 0, math.pi)
    ctx.move_to(-38, -14); ctx.line_to(-30, -34); ctx.line_to(30, -34); ctx.line_to(38, -14)
    ctx.stroke()
    ctx.rectangle(-30, -6, 60, 40)
    ctx.stroke()
    ctx.rectangle(-8, 10, 16, 24)
    ctx.stroke()


def icon_dish(ctx, rgb):
    ctx.set_source_rgb(*rgb)
    ctx.set_line_width(5)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.save()
    ctx.rotate(-0.6)
    ctx.save()
    ctx.scale(1, 0.5)
    ctx.arc(0, 0, 32, 0, math.pi)
    ctx.restore()
    ctx.close_path()
    ctx.stroke()
    ctx.move_to(0, 16); ctx.line_to(0, -14)
    ctx.stroke()
    ctx.arc(0, -16, 4, 0, 2 * math.pi)
    ctx.fill()
    ctx.restore()
    ctx.move_to(4, 18); ctx.line_to(4, 36)
    ctx.move_to(-14, 36); ctx.line_to(22, 36)
    ctx.stroke()
    for i, r in enumerate((10, 18)):
        ctx.arc(-20, -26, r, -math.pi * 0.95, -math.pi * 0.55)
        ctx.stroke()


def beam(ctx, x0, x1, y, rgb, t, start):
    p = out_cubic(prog(t, start, start + 0.5))
    if p <= 0:
        return
    xe = x0 + (x1 - x0) * p
    ctx.set_source_rgba(*rgb, 0.8)
    ctx.set_line_width(4)
    ctx.set_dash([4, 14], -t * 60 * (1 if x1 > x0 else -1))
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.move_to(x0, y)
    ctx.line_to(xe, y)
    ctx.stroke()
    ctx.set_dash([])
    # travelling pulse
    if p >= 1:
        f = ((t - start) * 1.4) % 1
        px = x0 + (x1 - x0) * f
        glow(ctx, px, y, 22, rgb, 0.9)


def draw_frame(ctx, t):
    background(ctx, t)
    satellite(ctx, t)

    # date pill
    dp = out_back(prog(t, 0.05, 0.5), 2.0)
    if dp > 0:
        ctx.save()
        ctx.translate(540, 92)
        ctx.scale(dp, dp)
        font(ctx, 30)
        label = "MARCH 2025"
        tw = ctx.text_extents(label).x_advance
        rounded_rect(ctx, -tw / 2 - 26, -30, tw + 52, 58, 29)
        ctx.set_source_rgba(1, 1, 1, 0.1)
        ctx.fill_preserve()
        ctx.set_source_rgba(1, 1, 1, 0.35)
        ctx.set_line_width(2)
        ctx.stroke()
        ctx.set_source_rgb(*WHITE)
        ctx.move_to(-tw / 2, 10)
        ctx.show_text(label)
        ctx.restore()

    # logos -> beams -> Starlink badge
    row = 400
    lj = out_back(prog(t, 0.2, 0.85), 1.4)
    la = out_back(prog(t, 0.3, 0.95), 1.4)
    draw_logo(ctx, JIO_LOGO, -150 + (175 + 150) * lj, row, 150, prog(t, 0.2, 0.5))
    draw_logo(ctx, AIRTEL_LOGO, 1230 - (1230 - 905) * la, row, 160, prog(t, 0.3, 0.6))
    beam(ctx, 265, 395, row, JIO, t, 0.9)
    beam(ctx, 815, 685, row, AIRTEL, t, 0.95)

    bp = out_back(prog(t, 0.6, 1.1), 1.6)
    if bp > 0:
        ctx.save()
        ctx.translate(540, row)
        ctx.scale(bp, bp)
        glow(ctx, 0, 0, 190, SKY, 0.25)
        rounded_rect(ctx, -145, -72, 290, 144, 26)
        ctx.set_source_rgba(0.08, 0.10, 0.18, 0.95)
        ctx.fill_preserve()
        ctx.set_source_rgba(*SKY, 0.6)
        ctx.set_line_width(2.5)
        ctx.stroke()
        font(ctx, 26, bold=False)
        ctx.set_source_rgb(*GREY)
        text_center(ctx, "SpaceX", 0, -18)
        font(ctx, 46)
        ctx.set_source_rgb(*WHITE)
        label = "STARLINK"
        sp = 5
        tw = sum(ctx.text_extents(c).x_advance for c in label) + sp * (len(label) - 1)
        x = -tw / 2
        for c in label:
            ctx.move_to(x, 36)
            ctx.show_text(c)
            x += ctx.text_extents(c).x_advance + sp
        ctx.restore()

    # headline
    for i, (line, size, rgb, y, start) in enumerate((
            ("Jio & Airtel sign deals with SpaceX", 50, WHITE, 590, 1.3),
            ("to bring Starlink internet to India", 36, GREY, 642, 1.5))):
        p = out_cubic(prog(t, start, start + 0.5))
        if p > 0:
            ctx.save()
            ctx.rectangle(0, y - size - 10, W, size + 30)
            ctx.clip()
            font(ctx, size, bold=(i == 0))
            ctx.set_source_rgba(*rgb, p)
            text_center(ctx, line, 540, y + 60 * (1 - p))
            ctx.restore()

    # what the deals mean: two cards
    cards = (("Starlink kits sold", "in their stores", icon_store, JIO),
             ("Installation &", "activation support", icon_dish, AIRTEL))
    for i, (l1, l2, icon, rgb) in enumerate(cards):
        p = prog(t, 2.0 + i * 0.25, 2.7 + i * 0.25)
        if p <= 0:
            continue
        e = out_back(p, 1.3)
        cw, ch = 450, 190
        cx = 540 + (i - 0.5) * 490
        cy = 820 + 140 * (1 - e)
        x, y = cx - cw / 2, cy - ch / 2
        ctx.push_group()
        rounded_rect(ctx, x, y, cw, ch, 24)
        ctx.set_source_rgba(0.10, 0.11, 0.19, 0.92)
        ctx.fill_preserve()
        ctx.set_source_rgba(*rgb, 0.55)
        ctx.set_line_width(2)
        ctx.stroke()
        glow(ctx, x + 90, cy, 90, rgb, 0.25)
        ctx.save()
        ctx.translate(x + 90, cy)
        icon(ctx, WHITE)
        ctx.restore()
        font(ctx, 32)
        ctx.set_source_rgb(*WHITE)
        ctx.move_to(x + 170, cy - 6)
        ctx.show_text(l1)
        font(ctx, 28, bold=False)
        ctx.set_source_rgb(*GREY)
        ctx.move_to(x + 170, cy + 34)
        ctx.show_text(l2)
        ctx.pop_group_to_source()
        ctx.paint_with_alpha(clamp(p * 2))

    sp = prog(t, 3.0, 3.5)
    font(ctx, 22, bold=False)
    ctx.set_source_rgba(*GREY, 0.75 * sp)
    text_center(ctx, "Announced 11–12 March 2025  ·  subject to SpaceX's approvals in India", 540, 1045)

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
