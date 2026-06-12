#!/usr/bin/env python3
"""Build designed Chrome Web Store marketing screenshots into dist/assets/.

Run: .venv/bin/python scripts/crop_assets.py

Not raw UI crops: each 1280x800 asset is a composed card — brand gradient
background, headline + subline, and the real product screenshot cropped to
its money region inside a fake-browser window with a soft shadow. Crops are
hand-tuned to the raw grabs in screenshots/ (kept local, gitignored).
"""
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "screenshots")
OUT = os.path.join(ROOT, "dist", "assets")
os.makedirs(OUT, exist_ok=True)

PURPLE = (124, 58, 237)
GRAD_TOP = (49, 16, 110)
GRAD_BOT = (109, 40, 217)
LAVENDER = (221, 214, 254)
BAR_BG = (26, 26, 30)
PILL_BG = (45, 45, 52)

TIMES = {  # macOS names contain U+202F before AM/PM; match by timestamp
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
    assert len(matches) == 1, f"{key}: expected 1 file for {ts}, got {matches}"
    S[key] = matches[0]


def load(name):
    img = Image.open(os.path.join(SRC, S[name]))
    if img.mode != "RGB":
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
        img = bg
    return img


def font(size, bold=True):
    for path, idx in [
        ("/System/Library/Fonts/Helvetica.ttc", 1 if bold else 0),
        ("/System/Library/Fonts/HelveticaNeue.ttc", 0),
        ("/Library/Fonts/Arial.ttf", 0),
    ]:
        try:
            return ImageFont.truetype(path, size, index=idx)
        except Exception:
            continue
    return ImageFont.load_default()


def centered_text(draw, cx, cy, text, f, fill=(255, 255, 255)):
    x0, y0, x1, y1 = draw.textbbox((0, 0), text, font=f)
    draw.text((cx - (x1 - x0) / 2 - x0, cy - (y1 - y0) / 2 - y0), text, font=f, fill=fill)


def canvas_bg():
    img = Image.new("RGBA", (1280, 800))
    for y in range(800):
        t = y / 800
        row = tuple(round(GRAD_TOP[i] + (GRAD_BOT[i] - GRAD_TOP[i]) * t) for i in range(3))
        img.paste(Image.new("RGBA", (1280, 1), row + (255,)), (0, y))
    return img


def browser_card(content, url, card_w):
    """Fake browser window: dark top bar with traffic lights + URL pill."""
    BAR = 36
    content_h = round(content.height * card_w / content.width)
    card = Image.new("RGB", (card_w, BAR + content_h))
    d = ImageDraw.Draw(card)
    d.rectangle((0, 0, card_w, BAR), fill=BAR_BG)
    for i, c in enumerate([(255, 95, 87), (254, 188, 46), (40, 200, 64)]):
        d.ellipse((16 + i * 22, BAR / 2 - 6, 28 + i * 22, BAR / 2 + 6), fill=c)
    pw = int(card_w * 0.46)
    px = (card_w - pw) // 2
    d.rounded_rectangle((px, 7, px + pw, BAR - 7), radius=(BAR - 14) // 2, fill=PILL_BG)
    centered_text(d, card_w // 2, BAR // 2, url, font(15, bold=False), fill=(175, 175, 185))
    card.paste(content.resize((card_w, content_h), Image.LANCZOS), (0, BAR))
    return card


def paste_card(canvas, card, x, y, radius=14):
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle(
        (x - 6, y + 4, x + card.width + 6, y + card.height + 20),
        radius=radius + 6,
        fill=(0, 0, 0, 115),
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(16)))
    mask = Image.new("L", card.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, card.width, card.height), radius=radius, fill=255
    )
    canvas.paste(card, (x, y), mask)


def headline(draw, title, sub, ty=52, sy=118):
    centered_text(draw, 640, ty, title, font(50))
    centered_text(draw, 640, sy, sub, font(25, bold=False), fill=LAVENDER)


def save(canvas, outname):
    canvas.convert("RGB").save(os.path.join(OUT, outname))


def asset_01_worldcup():
    c = canvas_bg()
    d = ImageDraw.Draw(c)
    headline(d, "Match results, hidden until you watch",
             "The same r/worldcup page — Spoiler Shield off vs. on")
    box = (757, 470, 2221, 1789)  # post column: title + score card / blur + badge
    for name, x, label in (("wc_before", 50, "WITHOUT"), ("wc_after", 665, "WITH SPOILER SHIELD")):
        card = browser_card(load(name).crop(box), "reddit.com/r/worldcup", 565)
        centered_text(d, x + 282, 178, label, font(20), fill=LAVENDER)
        paste_card(c, card, x, 198)
    save(c, "01_worldcup_before_after.png")


def asset_02_f1():
    c = canvas_bg()
    d = ImageDraw.Draw(c)
    headline(d, "Race day on Reddit, spoiler-free",
             "Titles AND thumbnails blurred — click a post when YOU choose to reveal it")
    box = (707, 430, 2240, 1900)  # tall post column with BOTH reveal badges
    card = browser_card(load("f1_after").crop(box), "reddit.com/r/formula1", 560)
    paste_card(c, card, 360, 192)
    save(c, "02_formula1_blurred_feed.png")


def asset_03_home():
    c = canvas_bg()
    d = ImageDraw.Draw(c)
    headline(d, "Recommended subs can't ambush you",
             "Spoilers blur even from subreddits you don't follow")
    box = (707, 420, 2900, 1525)
    card = browser_card(load("home_after").crop(box), "reddit.com", 1060)
    paste_card(c, card, 110, 185)
    save(c, "03_home_feed_ambush.png")


def asset_04_packs():
    c = canvas_bg()
    d = ImageDraw.Draw(c)
    fL = font(54)
    for i, line in enumerate(["One-click", "topic packs"]):
        d.text((70, 250 + i * 64), line, font=fL, fill=(255, 255, 255))
    fS = font(24, bold=False)
    for i, line in enumerate(
        ["World Cup, F1, Cricket, NBA, UFC —", "community-curated and open source.",
         "", "Updates only ever add;", "your own topics are never touched."]
    ):
        d.text((72, 420 + i * 34), line, font=fS, fill=LAVENDER)
    box = (700, 330, 2260, 1346)  # community packs panel on the options page
    card = browser_card(load("options").crop(box), "Spoiler Shield — options", 660)
    paste_card(c, card, 560, 162)
    save(c, "04_community_packs.png")


def promo_tile():
    W, H = 880, 560
    img = Image.new("RGB", (W, H))
    for y in range(H):
        t = y / H
        row = tuple(round(PURPLE[i] + ((66, 21, 130)[i] - PURPLE[i]) * t) for i in range(3))
        img.paste(Image.new("RGB", (W, 1), row), (0, y))
    icon = Image.open(os.path.join(ROOT, "extension", "icons", "icon128.png"))
    icon = icon.resize((230, 230), Image.LANCZOS)
    img.paste(icon, (70, 165), icon)
    draw = ImageDraw.Draw(img)
    size = 80
    while size > 40:
        f = font(size)
        x0, _, x1, _ = draw.textbbox((0, 0), "Spoiler Shield", font=f)
        if x1 - x0 <= 500:
            break
        size -= 4
    draw.text((340, 210), "Spoiler Shield", font=f, fill=(255, 255, 255))
    draw.text((344, 230 + size + 20), "Watch first. Scroll later.",
              font=font(36, bold=False), fill=(233, 213, 255))
    img.resize((440, 280), Image.LANCZOS).save(os.path.join(OUT, "promo_tile_440x280.png"))


asset_01_worldcup()
asset_02_f1()
asset_03_home()
asset_04_packs()
promo_tile()
print("assets written to dist/assets/")
