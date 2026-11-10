#!/usr/bin/env python3
"""Rebuild the Chinese store-art font: store/art/feature-cjk-serif-700.woff2 and -900.woff2.

Why: the Play Store art (store/make-feature.js, store/make-screens.js) must not depend on whatever CJK face a machine happens to have
(the build box only has a sans), and the manuscript voice wants a serif next to Texturina. The bible's CJK stack names Noto Serif SC, but
the game ships no CJK bundle, so the store art embeds a tiny subset of it: only the glyphs listed in store/art/feature-cjk-serif.txt
(about 60 glyphs, 8-9 KB per weight). Noto Serif SC is SIL OFL 1.1 (store/art/feature-cjk-serif-OFL.txt); the subset keeps its name table.

The scripts read feature-cjk-serif.txt and stop with a clear message when a Chinese string needs a character that is not in it. To add one:
append it to feature-cjk-serif.txt, run this script again, commit the two woff2 files.

Source: the npm package @fontsource/noto-serif-sc (the font cut into unicode-range slices, static weights). Needs fontTools and brotli:

    mkdir /tmp/cjk && cd /tmp/cjk && npm pack @fontsource/noto-serif-sc@5.3.1 && mkdir pkg && tar -xzf fontsource-noto-serif-sc-5.3.1.tgz -C pkg
    pip install --target /tmp/cjk/pylib fonttools brotli
    python3 -I store/art/feature-cjk-subset.py /tmp/cjk/pkg/package /tmp/cjk/pylib

(extract only package/*.css and package/files/*.woff2 if you like; the tarball is 86 MB). Run it from the repository root; -I keeps the
interpreter away from the current directory.
"""
import json, os, re, sys

pkg, pylib = sys.argv[1], sys.argv[2]
sys.path.insert(0, pylib)
from fontTools.ttLib import TTFont
from fontTools import subset, merge

HERE = os.path.dirname(os.path.abspath(__file__))
text = ''.join(open(os.path.join(HERE, 'feature-cjk-serif.txt'), encoding='utf8').read().split())
cps = sorted(set(ord(c) for c in text))
tmp = os.path.join(HERE, '.cjk-tmp')
os.makedirs(tmp, exist_ok=True)

for weight in (700, 900):
    css = open(os.path.join(pkg, '%d.css' % weight), encoding='utf8').read()
    slices = {}
    for sid, rng in re.findall(r'/\* noto-serif-sc-\[(\w+)\]-%d-normal \*/.*?unicode-range: ([^;]+);' % weight, css, re.S):
        ranges = []
        for part in rng.split(','):
            part = part.strip()[2:]
            a, b = part.split('-') if '-' in part else (part, part)
            ranges.append((int(a, 16), int(b, 16)))
        for cp in cps:
            if any(a <= cp <= b for a, b in ranges):
                slices.setdefault(int(sid), []).append(chr(cp))
    missing = [chr(c) for c in cps if not any(chr(c) in v for v in slices.values())]
    if missing:
        sys.exit('not in Noto Serif SC: ' + ''.join(missing))
    parts = []
    for sid, chars in sorted(slices.items()):
        f = TTFont(os.path.join(pkg, 'files', 'noto-serif-sc-%d-%d-normal.woff2' % (sid, weight)))
        o = subset.Options()
        o.layout_features = []; o.name_IDs = ['*']; o.notdef_outline = True; o.glyph_names = False; o.hinting = False; o.flavor = None
        o.drop_tables += ['DSIG', 'GSUB', 'GPOS', 'GDEF', 'kern', 'vhea', 'vmtx', 'VORG', 'BASE', 'JSTF', 'MATH']
        s = subset.Subsetter(o); s.populate(text=''.join(chars)); s.subset(f)
        out = os.path.join(tmp, 'part-%d-%d.ttf' % (sid, weight)); f.save(out); parts.append(out)
    merged = os.path.join(tmp, 'merged-%d.ttf' % weight)
    merge.Merger().merge(parts).save(merged)
    font = TTFont(merged); font.flavor = 'woff2'
    dst = os.path.join(HERE, 'feature-cjk-serif-%d.woff2' % weight); font.save(dst)
    have = set(TTFont(merged)['cmap'].getBestCmap().keys())
    assert all(c in have for c in cps), 'glyph lost in the merge'
    print(os.path.basename(dst), os.path.getsize(dst), 'bytes,', len(cps), 'characters')
for fn in os.listdir(tmp):
    os.unlink(os.path.join(tmp, fn))
os.rmdir(tmp)
