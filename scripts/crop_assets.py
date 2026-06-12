#!/usr/bin/env python3
"""Build Chrome Web Store assets from raw screenshots/ into dist/assets/.

Run with the project venv: .venv/bin/python scripts/crop_assets.py

Crop boxes are hand-tuned per screenshot (verified visually): before/after
pairs become single split-frame comparisons with a label band, menu bar /
browser chrome / Reddit's logged-out promo rail are cut, and crops are taken
at native pixel scale so the 1280x800 results stay sharp. Raw inputs:
3024x1964 full-screen Retina grabs; options page is a 2888x1740 window grab.
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "screenshots")
OUT = os.path.join(ROOT, "dist", "assets")
os.makedirs(OUT, exist_ok=True)

PURPLE = (124, 58, 237)
DARK = (31, 31, 35)

# Resolved by timestamp substring: macOS screenshot names contain a narrow
# no-break space (U+202F) before AM/PM, so exact-name matching is fragile.
TIMES = {
    "f1_before": "11.55.58",
    "f1_after": "11.56.22",
    "home_after": "11.56.52",
    "wc_before": "11.57.48",
    "wc_after": "11.57.56",
    "options": "11.58.14",
}
_files = os.listdir(SRC)
S = {}
for key, ts in TIMES.items():
    matches = [f for f in _files if ts in f]
    assert len(matches) == 1, f"{key}: expected 1 file matching {ts}, got {matches}"
    S[key] = matches[0]


def load(name):
    img = Image.open(os.path.join(SRC, S[name]))
    if img.mode != "RGB":  # flatten any alpha (window grabs) onto white
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
        img = bg
    return img


def font(size, bold=True):
    candidates = [
        ("/System/Library/Fonts/Helvetica.ttc", 1 if bold else 0),
        ("/System/Library/Fonts/HelveticaNeue.ttc", 0),
        ("/Library/Fonts/Arial.ttf", 0),
    ]
    for path, idx in candidates:
        try:
            return ImageFont.truetype(path, size, index=idx)
        except Exception:
            continue
    return ImageFont.load_default()


def centered_text(draw, cx, cy, text, f, fill=(255, 255, 255)):
    x0, y0, x1, y1 = draw.textbbox((0, 0), text, font=f)
    draw.text((cx - (x1 - x0) / 2 - x0, cy - (y1 - y0) / 2 - y0), text, font=f, fill=fill)


def before_after(before, after, outname):
    """1280x800 split frame: 40px label band on top, then the same native
    1280x1520 post column from each page state, side by side."""
    box = (760, 444, 2040, 1964)
    band = 40
    canvas = Image.new("RGB", (1280, 800), (255, 255, 255))
    canvas.paste(load(before).crop(box).resize((640, 760), Image.LANCZOS), (0, band))
    canvas.paste(load(after).crop(box).resize((640, 760), Image.LANCZOS), (640, band))
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 639, band), fill=DARK)
    draw.rectangle((640, 0, 1280, band), fill=PURPLE)
    centered_text(draw, 320, band // 2, "WITHOUT SPOILER SHIELD", font(22))
    centered_text(draw, 960, band // 2, "WITH SPOILER SHIELD", font(22))
    draw.rectangle((637, band, 642, 800), fill=(255, 255, 255))
    canvas.save(os.path.join(OUT, outname))


def home_feed(outname):
    """WC badge between normal posts; menu bar + promo rail cut."""
    box = (707, 360, 3024, 1808)
    w, h = box[2] - box[0], box[3] - box[1]
    assert abs(w / h - 1.6) < 0.01
    load("home_after").crop(box).resize((1280, 800), Image.LANCZOS).save(
        os.path.join(OUT, outname)
    )


def options_shot(outname):
    """Options window: include header through Save button; the page is pure
    white, so pad the sides to reach 1.6 aspect invisibly."""
    img = load("options").crop((200, 60, 2760, 1700))  # 2560x1640
    canvas = Image.new("RGB", (2624, 1640), (255, 255, 255))  # 1640*1.6
    canvas.paste(img, (32, 0))
    canvas.resize((1280, 800), Image.LANCZOS).save(os.path.join(OUT, outname))


def promo_tile():
    """440x280 small promo tile, rendered at 2x for crisp downscale."""
    W, H = 880, 560
    img = Image.new("RGB", (W, H))
    top, bottom = (124, 58, 237), (66, 21, 130)
    for y in range(H):
        t = y / H
        row = tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3))
        img.paste(Image.new("RGB", (W, 1), row), (0, y))
    icon = Image.open(os.path.join(ROOT, "extension", "icons", "icon128.png"))
    icon = icon.resize((230, 230), Image.LANCZOS)
    img.paste(icon, (70, 165), icon)
    draw = ImageDraw.Draw(img)
    # Fit the title inside the space right of the icon (340..850).
    size = 80
    while size > 40:
        f = font(size)
        x0, _, x1, _ = draw.textbbox((0, 0), "Spoiler Shield", font=f)
        if x1 - x0 <= 500:
            break
        size -= 4
    draw.text((340, 210), "Spoiler Shield", font=f, fill=(255, 255, 255))
    draw.text(
        (344, 230 + size + 20),
        "Watch first. Scroll later.",
        font=font(36, bold=False),
        fill=(233, 213, 255),
    )
    img.resize((440, 280), Image.LANCZOS).save(
        os.path.join(OUT, "promo_tile_440x280.png")
    )


before_after("wc_before", "wc_after", "01_worldcup_before_after.png")
before_after("f1_before", "f1_after", "02_formula1_before_after.png")
home_feed("03_home_feed_ambush.png")
options_shot("04_options_community_packs.png")
promo_tile()
print("assets written to dist/assets/")
