"""Zafarion ikon ve acilis ekrani uretici (PIL). Calistir: python3 scripts/make-icons.py"""
import os, glob
from PIL import Image, ImageDraw, ImageFilter

RES = os.path.join(os.path.dirname(__file__), '..', 'android', 'app', 'src', 'main', 'res')
NAVY, NAVY2, GOLD, GOLD2 = (11, 16, 32), (38, 52, 110), (255, 210, 77), (245, 158, 11)

def emblem(size, pad=0.18):
    """Altin 'Z' + kilic capraz + tac: seffaf zeminli amblem."""
    S = size * 4
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    m = S * pad; w = S - 2 * m; t = w * 0.2
    x0, y0, x1, y1 = m, m + w * 0.14, S - m, S - m - w * 0.02
    # Z govdesi
    z = [(x0, y0), (x1, y0), (x1, y0 + t), (x0 + t * 1.15, y1 - t), (x1, y1 - t), (x1, y1), (x0, y1), (x0, y1 - t), (x1 - t * 1.15, y0 + t), (x0, y0 + t)]
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0)); ImageDraw.Draw(sh).polygon([(a + S * 0.012, b + S * 0.02) for a, b in z], fill=(0, 0, 0, 140))
    im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(S * 0.012)))
    d.polygon(z, fill=GOLD)
    d.polygon([(x0, y0), (x1, y0), (x1, y0 + t * 0.35), (x0, y0 + t * 0.35)], fill=(255, 238, 170))
    d.polygon([(x0, y1 - t * 0.35), (x1, y1 - t * 0.35), (x1, y1), (x0, y1)], fill=GOLD2)
    # tac
    cx, cy, cw, ch = S / 2, m + w * 0.02, w * 0.36, w * 0.17
    crown = [(cx - cw / 2, cy + ch), (cx - cw / 2, cy), (cx - cw / 4, cy + ch * 0.45), (cx, cy - ch * 0.15), (cx + cw / 4, cy + ch * 0.45), (cx + cw / 2, cy), (cx + cw / 2, cy + ch)]
    d.polygon(crown, fill=(239, 68, 68), outline=GOLD, width=int(S * 0.008))
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
