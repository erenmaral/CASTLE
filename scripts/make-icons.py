"""Sefer Vakti ikon ve acilis ekrani uretici (PIL). Calistir: python3 scripts/make-icons.py"""
import os, glob
from PIL import Image, ImageDraw, ImageFilter

RES = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')
NAVY, NAVY2, GOLD, GOLD2 = (11, 16, 32), (38, 52, 110), (255, 210, 77), (245, 158, 11)

def emblem(size, pad=0.18):
    """Altin kale kulesi + kirmizi sancak (Seferhan): seffaf zeminli amblem."""
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    m = S * pad; w = S - 2 * m
    cx = S / 2
    tw = w * 0.52                       # kule govdesi
    x0, x1 = cx - tw / 2, cx + tw / 2
    top, bot = m + w * 0.30, S - m
    # golge
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0)); ImageDraw.Draw(sh).rectangle([x0 + S * .015, top + S * .02, x1 + S * .015, bot + S * .02], fill=(0, 0, 0, 150))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(S * 0.012)))
    d.rectangle([x0, top, x1, bot], fill=GOLD)
    d.rectangle([x0, top, x1, top + w * 0.04], fill=(255, 238, 170))
    d.rectangle([x0, bot - w * 0.05, x1, bot], fill=GOLD2)
    # siperlikler
    cw = tw / 5
    for i in range(3):
        cxl = x0 + i * cw * 2
        d.rectangle([cxl, top - w * 0.10, cxl + cw, top], fill=GOLD)
    # kapi
    gw = tw * 0.34; gx0 = cx - gw / 2; gy0 = bot - w * 0.30
    d.rectangle([gx0, gy0, gx0 + gw, bot], fill=(60, 36, 12)); d.pieslice([gx0, gy0 - gw / 2, gx0 + gw, gy0 + gw / 2], 180, 360, fill=(60, 36, 12))
    # kucuk pencere
    d.rectangle([cx - tw * .07, top + w * .12, cx + tw * .07, top + w * .26], fill=(60, 36, 12))
    # sancak diregi ve sancak
    px = cx; pt = m - w * 0.02
    d.rectangle([px - w * 0.012, pt, px + w * 0.012, top - w * 0.10], fill=(120, 80, 30))
    flag = [(px + w * 0.012, pt), (px + w * 0.40, pt + w * 0.075), (px + w * 0.30, pt + w * 0.135), (px + w * 0.40, pt + w * 0.195), (px + w * 0.012, pt + w * 0.19)]
    d.polygon(flag, fill=(239, 68, 68), outline=GOLD, width=int(S * 0.008))
    d.ellipse([px + w * 0.10, pt + w * 0.07, px + w * 0.17, pt + w * 0.14], fill=GOLD)
    return im.resize((size, size), Image.LANCZOS)

def bg(size, round_=False):
    S = size * 2
    im = Image.new('RGBA', (S, S), NAVY + (255,)); px = im.load()
    for y in range(S):
        for x in range(S):
            k = min(1, ((x - S * .3) ** 2 + (y - S * .2) ** 2) ** .5 / (S * .9))
            px[x, y] = tuple(int(NAVY2[i] * (1 - k) + NAVY[i] * k) for i in range(3)) + (255,)
    if round_:
        mask = Image.new('L', (S, S), 0); ImageDraw.Draw(mask).ellipse((0, 0, S - 1, S - 1), fill=255); im.putalpha(mask)
    return im.resize((size, size), Image.LANCZOS)

dens = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for name, px in dens.items():
    folder = os.path.join(RES, 'mipmap-' + name)
    sq = bg(px); sq.alpha_composite(emblem(px, 0.12)); sq.save(os.path.join(folder, 'ic_launcher.png'))
    rd = bg(px, True); rd.alpha_composite(emblem(px, 0.14)); rd.save(os.path.join(folder, 'ic_launcher_round.png'))
    fg_px = int(px * 108 / 48)
    fg = Image.new('RGBA', (fg_px, fg_px), (0, 0, 0, 0)); fg.alpha_composite(emblem(fg_px, 0.30)); fg.save(os.path.join(folder, 'ic_launcher_foreground.png'))
open(os.path.join(RES, 'values', 'ic_launcher_background.xml'), 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B1020</color>\n</resources>\n')

# acilis ekranlari: ayni boyutlari koru
for f in glob.glob(os.path.join(RES, 'drawable*', 'splash.png')):
    w, h = Image.open(f).size
    im = bg(max(w, h)).crop((0, 0, w, h)); e = emblem(int(min(w, h) * 0.34), 0.05); im.alpha_composite(e, ((w - e.width) // 2, (h - e.height) // 2)); im.convert('RGB').save(f)
# Web (PWA) ikonlari
WEB = os.path.join(os.path.dirname(__file__), '..', 'www', 'icons'); os.makedirs(WEB, exist_ok=True)
for px in (192, 512):
    im = bg(px); im.alpha_composite(emblem(px, 0.12)); im.save(os.path.join(WEB, 'icon-%d.png' % px))
mk = bg(512); mk.alpha_composite(emblem(512, 0.26)); mk.save(os.path.join(WEB, 'icon-maskable-512.png'))
ap = bg(180); ap.alpha_composite(emblem(180, 0.12)); ap.convert('RGB').save(os.path.join(WEB, 'apple-touch-icon.png'))
print('ikonlar hazir')
