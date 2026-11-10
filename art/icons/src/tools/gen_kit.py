#!/usr/bin/env python3
"""gen_kit.py - regenerates art/icons/src/containers.svg, p1-charges.svg and p1-glyphs.svg (the style benchmark).
Deterministic (seeded by symbol id). Do NOT hand-edit those three files: change this script and re-run
  python3 art/icons/src/tools/gen_kit.py && node scripts/build-icons.js
Each charge is: body (ink contour + flat fill), hard shade (derived), details, ivory tick (derived). See ../README.md."""
import sys, math, os
sys.dont_write_bytecode = True  # no __pycache__ inside www/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pen import *

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir) + os.sep

# palette (docs/ART_DIRECTION.md section 2) + derived shade tones
OR, BOLE = '#E9B62A', '#8C3520'
ORS = BOLE  # gold shade = the red bole showing through (gold leaf over bole, the bible's signature)
ARG, ARGS = '#CDD2DB', '#8B94A8'
LAPIS, LAPISD = '#22409A', '#14275F'
VERM, MAD = '#D8391F', '#9A2018'
MAL, VDG = '#1F6B4E', '#3FA58C'
IVO, VEL, VEL2 = '#F4ECD3', '#D8D0AB', '#C6B684'
BIS, NIGHT, INK2 = '#7A5230', '#0F1838', '#4B3B2A'


def C(n, hexv):
    return tok('c%d' % n, hexv)


def K(n, hexv):
    return tok('k%d' % n, hexv)


def rot(pts, deg, cx=16.0, cy=16.0):
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    return [(cx + (x - cx) * ca - (y - cy) * sa, cy + (x - cx) * sa + (y - cy) * ca) for (x, y) in pts]


def union_geom(parts):
    return unary_union([p.geom() for p in parts])


def body_layers(id, parts, c1, c2, sdx=2.3, sdy=2.1, shade_geom=None, tick=True, combined=True, tick_kw=None):
    """[contour+fill body, hard shade, ...] + tick as separate lists for ordering."""
    rng = Rng(id + ':tick')
    g = union_geom(parts)
    if combined:
        body = [el_body(parts[0].d() if len(parts) == 1 else geom_d(g), C(1, c1))]
    else:
        body = [el_body(p.d(), C(1, c1)) for p in parts]
    sg = shade(shade_geom if shade_geom is not None else g, sdx, sdy)
    sh = [el_shade(geom_d(sg), C(2, c2))] if not sg.is_empty else []
    tk = [el_tick(tick_d(g, rng, **(tick_kw or {})))] if tick else []
    return body, sh, tk, g


# ====================================================== CONTAINERS ==================================================
def ct_shield():
    rng = Rng('ct-shield')
    pts = [(7.0, 4.5), (25.0, 4.3), (25.3, 12.6), (23.5, 19.6), (19.6, 25.2), (16.0, 28.0), (12.5, 25.3), (8.6, 19.8), (6.8, 12.8)]
    body = spline(pts, rng, wob=0.3, sharp=(0, 1, 5))
    g = body.geom()
    band = offset_d(g, 2.4)
    items = [el_body(body.d(), K(1, LAPIS)),
             '<path class="il" style="stroke:%s;stroke-width:2.2" d="%s"/>' % (K(2, 'none'), band)]
    return symbol('ct-shield', items, 'ct-shield: heater shield 3:4 (fill 18x24). Tokens --k1 field, --k2 bordure band (none = no band). Charges go inside ~12x15u.')


def ct_round():
    rng = Rng('ct-round')
    body = ellipse(16, 16, 12.0, 11.8, rng, n=10, wob=0.28)
    g = body.geom()
    band = offset_d(g, 2.5)
    items = [el_body(body.d(), K(1, VEL)),
             '<path class="il" style="stroke:%s;stroke-width:2.2" d="%s"/>' % (K(2, 'none'), band)]
    return symbol('ct-round', items, 'ct-round: roundel (fill diameter 24). Tokens --k1 field, --k2 ring band (none = no ring). Charges go inside ~14u.')


def ct_loz():
    rng = Rng('ct-loz')
    pts = [(16.0, 3.6), (26.6, 16.0), (16.0, 28.4), (5.4, 16.0)]
    body = poly(pts, rng, wob=0.3, bow=0.3, rad=1.2)
    g = body.geom()
    band = offset_d(g, 2.5)
    items = [el_body(body.d(), K(1, VERM)),
             '<path class="il" style="stroke:%s;stroke-width:2.2" d="%s"/>' % (K(2, 'none'), band)]
    return symbol('ct-loz', items, 'ct-loz: lozenge (field-battle nodes), fill 21x25. Tokens --k1 field, --k2 inner band (none = no band). Charges go inside ~10u.')


def ct_quat():
    rng = Rng('ct-quat')
    lobes = []
    for (cx, cy) in [(16, 10.4), (21.6, 16), (16, 21.6), (10.4, 16)]:
        lobes.append(ellipse(cx, cy, 6.15, 6.15, rng, n=10, wob=0.25))
    lobes.append(ellipse(16, 16, 4.0, 4.0, rng, n=8, wob=0.1))  # fills the centre so the outline has no hole
    g = union_geom(lobes)
    band = offset_d(g, 2.5)
    items = [el_body(geom_d(g), K(1, LAPIS)),
             '<path class="il" style="stroke:%s;stroke-width:2.2" d="%s"/>' % (K(2, 'none'), band)]
    return symbol('ct-quat', items, 'ct-quat: quatrefoil (seals, badges), fill 24x24. Tokens --k1 field, --k2 inner band (none = no band). Charges go inside ~10u.')


# ====================================================== CHARGES =====================================================
def cross_pattee_parts(rng, cx=16.0, cy=16.0, span=12.0, neck=2.55, endw=5.7, bow=-1.1, jit=0.3):
    """One closed outline: four flared arms (concave flanks)."""
    E_l, E_r, N = (-endw, -span), (endw, -span), (neck, -neck)
    pts, bows = [], []
    for k in range(4):
        for p, b in ((E_l, 0.0), (E_r, bow), (N, bow)):
            pts.append(p)
            bows.append(b)
    # edge order: E_l->E_r (end, flat), E_r->N (flank, concave), N->next E_l (flank, concave)
    out = []
    for k in range(4):
        for p in (E_l, E_r, N):
            q = rot([(cx + p[0], cy + p[1])], 90 * k, cx, cy)[0]
            out.append(q)
    return poly(out, rng, wob=jit, bows=bows)


def chg_cross_pattee():
    id = 'ic-chg-cross-pattee'
    rng = Rng(id)
    p = cross_pattee_parts(rng)
    body, sh, tk, g = body_layers(id, [p], OR, ORS)
    return symbol(id, body + sh + tk, 'cross pattee: four flared arms with flat ends. Or on host devices, argent on garrison (recolour with --c1/--c2).')


def chg_saltire():
    id = 'ic-chg-saltire'
    rng = Rng(id)
    pts = [(8.95, 4.4), (16.0, 11.45), (23.05, 4.4), (27.6, 8.95), (20.55, 16.0), (27.6, 23.05), (23.05, 27.6), (16.0, 20.55),
           (8.95, 27.6), (4.4, 23.05), (11.45, 16.0), (4.4, 8.95)]
    p = poly(pts, rng, wob=0.3, bow=0.22)
    body, sh, tk, g = body_layers(id, [p], ARG, ARGS)
    # the NE-SW bar passes over the NW-SE bar: its two edges cross the junction
    cross = [el_line('M%s %sL%s %s' % (fmt(16.0 + rng.u(.2)), fmt(11.45), fmt(11.45), fmt(16.0 + rng.u(.2)))),
             el_line('M%s %sL%s %s' % (fmt(20.55), fmt(16.0 + rng.u(.2)), fmt(16.0 + rng.u(.2)), fmt(20.55)))]
    return symbol(id, body + sh + cross + tk, 'saltire: two crossed bars, the NE-SW bar woven over. Argent on garrison gules.')


def chg_roundel():
    id = 'ic-chg-roundel'
    rng = Rng(id)
    p = ellipse(16, 16, 11.9, 11.7, rng, n=10, wob=0.28)
    body, sh, tk, g = body_layers(id, [p], ARG, ARGS)
    ring = ellipse(15.8, 15.9, 7.7, 7.5, rng, n=9, wob=0.2)
    return symbol(id, body + sh + [el_line(ring.d())] + tk, 'roundel (plate): plain disc with an inner rim line. Recolour --c1/--c2 for torteau (verm), hurt (lapis), pellet...')


def chg_bezant():
    id = 'ic-chg-bezant'
    rng = Rng(id)
    p = ellipse(16, 16, 12.0, 11.8, rng, n=10, wob=0.28)
    body, sh, tk, g = body_layers(id, [p], OR, ORS)
    beads = []
    n = 12
    for i in range(n):
        a = -math.pi / 2 + 2 * math.pi * i / n + 0.1
        x, y = 15.9 + math.cos(a) * 8.9 + rng.u(0.12), 16.0 + math.sin(a) * 8.8 + rng.u(0.12)
        r = 0.95
        beads.append('M%s %sa%s %s 0 1 0 %s 0a%s %s 0 1 0 %s 0Z' % (fmt(x - r), fmt(y), fmt(r), fmt(r), fmt(2 * r), fmt(r), fmt(r), fmt(-2 * r)))
    cp = cross_pattee_parts(rng, cx=16, cy=16.1, span=5.9, neck=1.25, endw=2.7, bow=-0.5, jit=0.12)
    items = body + sh + ['<path class="hs" style="fill:%s" d="%s"/>' % (C(3, BOLE), ''.join(beads)),
                         '<path class="hs" style="fill:%s" d="%s"/>' % (C(3, BOLE), cp.d())] + tk
    return symbol(id, items, 'bezant: orpiment disc, beaded rim, cross pattee stamped in bole. Coins / gold. --c3 = bole.')


def chg_mullet():
    id = 'ic-chg-mullet'
    rng = Rng(id)
    R, r = 12.0, 5.8
    pts = []
    rr0 = [R + rng.u(0.25) for _ in range(6)]
    for i in range(12):
        a = -math.pi / 2 + math.pi * i / 6 + rng.u(0.03)
        rr = rr0[i // 2] if i % 2 == 0 else r + rng.u(0.2)
        pts.append((16 + math.cos(a) * rr, 16.0 + math.sin(a) * rr))
    p = poly(pts, rng, wob=0.12, bow=0.12, jitter=True)
    body, sh, tk, g = body_layers(id, [p], OR, ORS, tick_kw=dict(inset=2.6, length=3.6))
    return symbol(id, body + sh + tk, 'six-point mullet (estoile): stars, ratings. Or. Empty star = underdrawn state.')


# ---------------------------------------------------------------- more charges
def sc(pts, k, cx=16.0, cy=16.0):
    return [(cx + (p[0] - cx) * k, cy + (p[1] - cy) * k) + tuple(p[2:]) for p in pts]


def mirror(pts, cx=16.0):
    return [(2 * cx - x, y) for (x, y) in pts][::-1]


def chg_fleur():
    id = 'ic-chg-fleur'
    rng = Rng(id)
    F = 0.95
    center = spline(sc([(16, 3.4), (18.7, 6.6), (19.9, 10.6), (19.5, 14.6), (18.0, 18.2), (16, 20.4), (14.0, 18.2), (12.5, 14.6), (12.1, 10.6), (13.3, 6.6)], F),
                    rng, wob=0.2, sharp=(0,))
    R = [(18.4, 15.2), (21.6, 11.6), (25.2, 10.6), (28.0, 12.6), (28.6, 16.0), (26.8, 19.8), (24.6, 16.5), (22.0, 17.3), (20.2, 19.0), (18.4, 20.2)]
    earR = spline(sc(R, F), rng, wob=0.22, sharp=(5,))
    L = sc(mirror(R), F)
    earL = spline(L, rng, wob=0.22, sharp=(len(L) - 1 - 5,))
    band = poly(sc([(9.4, 19.8), (22.6, 19.4), (22.8, 22.8), (9.2, 23.0)], F), rng, wob=0.2, bow=0.2, rad=1.0)
    foot = spline(sc([(14.4, 22.6), (14.9, 26.0), (16, 28.8), (17.1, 26.0), (17.6, 22.6)], F), rng, wob=0.15, sharp=(2,))
    fR = sc([(19.0, 22.6), (21.8, 23.4), (24.0, 25.6), (24.9, 28.2), (22.2, 27.4), (20.2, 25.8), (19.2, 24.4)], F)
    footR = spline(fR, rng, wob=0.15, sharp=(3,))
    fL = mirror(fR)
    footL = spline(fL, rng, wob=0.15, sharp=(len(fL) - 1 - 3,))
    parts = [center, earL, earR, band, foot, footL, footR]
    body, sh, tk, g = body_layers(id, parts, OR, ORS)
    lines = [el_line('M%s %sL%s %s' % (fmt(16 + (9.7 - 16) * F), fmt(16 + (19.8 - 16) * F), fmt(16 + (22.4 - 16) * F), fmt(16 + (19.5 - 16) * F))),
             el_line('M%s %sL%s %s' % (fmt(16 + (9.5 - 16) * F), fmt(16 + (22.9 - 16) * F), fmt(16 + (22.6 - 16) * F), fmt(16 + (22.7 - 16) * F))),
             ]
    return symbol(id, body + sh + lines + tk, 'fleur-de-lis: central petal, two curled ears, band, three-petal foot. Or on azure (France / W. Europe blazon).')


def chg_tower():
    id = 'ic-chg-tower'
    rng = Rng(id)
    pts = [(7.6, 4.4), (11.9, 4.4), (11.9, 7.8), (14.1, 7.8), (14.1, 4.4), (17.9, 4.4), (17.9, 7.8), (20.1, 7.8), (20.1, 4.4), (24.4, 4.4),
           (24.4, 11.6), (22.9, 11.6), (23.7, 28.0), (8.3, 28.0), (9.1, 11.6), (7.6, 11.6)]
    p = poly(pts, rng, wob=0.22, bow=0.12, rad=0.45)
    body, sh, tk, g = body_layers(id, [p], ARG, ARGS)
    door = el_ink('M13.3 28.2L13.3 22.4Q13.3 18.9 16 18.9Q18.7 18.9 18.7 22.4L18.7 28.2Z')
    slit = el_ink('M15.1 12.9H16.9V16.4H15.1Z')
    courses = [el_line('M9.2 11.6H22.8')]
    return symbol(id, body + sh + courses + [door, slit] + tk, 'tower (castle): embattled tower, arched gate, arrow slit, ledge and courses. Argent; gate in ink.')


def chg_helm():
    id = 'ic-chg-helm'
    rng = Rng(id)
    pts = [(8.6, 5.4, 1.5), (23.4, 5.4, 1.5), (24.5, 13.0), (24.0, 21.0), (22.7, 27.6, 0.7), (9.3, 27.6, 0.7), (8.0, 21.0), (7.5, 13.0)]
    p = poly(pts, rng, wob=0.22, bow=0.4)
    body, sh, tk, g = body_layers(id, [p], ARG, ARGS)
    slit = el_ink('M9.6 12.5H14.6V15.1H9.6ZM17.4 12.5H22.4V15.1H17.4Z')
    straps = [el_line('M14.6 5.8V12.5M17.4 5.8V12.5M14.6 15.1V27.4M17.4 15.1V27.4')]
    dots = '<path class="ia" d="M19.7 18.6a.85 .85 0 1 0 1.7 0a.85 .85 0 1 0 -1.7 0ZM19.7 21.7a.85 .85 0 1 0 1.7 0a.85 .85 0 1 0 -1.7 0ZM19.7 24.8a.85 .85 0 1 0 1.7 0a.85 .85 0 1 0 -1.7 0ZM10.6 18.6a.85 .85 0 1 0 1.7 0a.85 .85 0 1 0 -1.7 0ZM10.6 21.7a.85 .85 0 1 0 1.7 0a.85 .85 0 1 0 -1.7 0ZM10.6 24.8a.85 .85 0 1 0 1.7 0a.85 .85 0 1 0 -1.7 0Z"/>'
    return symbol(id, body + sh + straps + [slit, dots] + tk, 'great helm: flat-topped cylinder, T-slit with centre strap, breaths. Argent (steel); sable field for the Demir hero.')


def chg_garb():
    id = 'ic-chg-garb'
    rng = Rng(id)
    Bx, By = 16.0, 18.8
    ears = []
    spec = [(-46, 12.2), (-23, 14.0), (0, 15.2), (23, 14.0), (46, 12.2)]
    for ang, ln in spec:
        k = ln / 15.2
        loc = [(-0.9, -1.4), (-1.1, -5.0 * k), (-2.1, -9.0 * k), (-2.0, -12.2 * k), (0, -ln), (2.0, -12.2 * k), (2.1, -9.0 * k), (1.1, -5.0 * k), (0.9, -1.4)]
        pts = rot([(Bx + x, By + y) for (x, y) in loc], ang, Bx, By)
        ears.append(spline(pts, rng, wob=0.15, sharp=(4,), closed=True))
    butts = poly([(10.4, 20.6), (21.8, 20.2), (25.4, 27.8), (6.6, 28.0)], rng, wob=0.2, bows=[0, -0.8, 0.0, -0.8], rad=0.6)
    parts = [butts] + ears
    g = union_geom(parts)
    body = [el_body(geom_d(g), C(1, OR))]
    sg = shade(g, 2.3, 2.1)
    shade_el = [el_shade(geom_d(sg), C(2, ORS))]
    ear_lines = ['<path class="il" style="fill:none" d="%s"/>' % ' '.join(e.d() for e in ears[:2] + ears[3:])]
    band = poly([(9.2, 17.2), (22.8, 16.6), (23.0, 20.6), (9.0, 21.2)], rng, wob=0.15, bow=0.3, rad=1.0)
    band_el = '<path class="ij" style="fill:%s" d="%s"/>' % (C(3, VERM), band.d())
    lines = [el_line('M13.5 21.4L12.1 27.4M16 21.2L16 27.6M18.6 21.2L19.9 27.4')]
    tk = [el_tick(tick_d(g, Rng(id + ':t'), inset=2.2, length=3.8, towards=(-0.9, -0.43)))]
    return symbol(id, body + shade_el + ear_lines + [band_el] + lines + tk, 'garb (wheatsheaf): five ears fanned over a gules band, splayed stalks. Or; band --c3 gules. Famine.')


def tube(centre, widths, rng, wob=0.15, sharp_ends=True):
    """Variable-width tube around a smooth centre line -> closed spline path (left side out, right side back)."""
    n = len(centre)
    L, Rr = [], []
    for i in range(n):
        a = centre[max(0, i - 1)]; b = centre[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        l = math.hypot(dx, dy) or 1
        nx, ny = -dy / l, dx / l
        w = widths[i] / 2
        L.append((centre[i][0] + nx * w, centre[i][1] + ny * w))
        Rr.append((centre[i][0] - nx * w, centre[i][1] - ny * w))
    pts = L + Rr[::-1]
    return spline(pts, rng, wob=wob, sharp=(0, n - 1, n, 2 * n - 1))


def bez(pts, n=40):
    """Catmull-Rom sample through key points -> dense list."""
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n // (len(pts) - 1)):
            t = k / (n // (len(pts) - 1))
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1])
    return out


def chg_bugle():
    id = 'ic-chg-bugle'
    rng = Rng(id)
    key = [(5.6, 15.5), (6.2, 20.3), (10.4, 23.8), (16.2, 24.2), (21.1, 21.0), (23.5, 14.9), (24.1, 7.5)]
    cl = bez(key, n=30)
    N = len(cl)
    widths = []
    for i in range(N):
        t = i / (N - 1)
        widths.append(3.0 + 1.0 * t + 4.6 * (max(0.0, (t - 0.40) / 0.60) ** 1.8))
    horn = tube(cl, widths, rng, wob=0.1)
    body, sh, tk, g = body_layers(id, [horn], OR, ORS, tick_kw=dict(inset=1.9, length=4.2))
    # bell mouth (ink ellipse) at the end
    ex, ey = cl[-1]
    mouth = ellipse(ex - 0.2, ey + 0.2, widths[-1] / 2 - 0.5, 1.7, rng, n=8, wob=0.08)
    bands = []
    band_d = ''
    for t in (0.30, 0.52):
        i = int(t * (N - 1))
        a = cl[i - 1]; b = cl[i + 1]
        dx, dy = b[0] - a[0], b[1] - a[1]
        l = math.hypot(dx, dy); ux, uy = dx / l, dy / l
        nx, ny = -uy, ux
        w = widths[i] / 2 + 0.1
        c = cl[i]
        t2 = 1.15
        pts = [(c[0] + nx * w - ux * t2, c[1] + ny * w - uy * t2), (c[0] + nx * w + ux * t2, c[1] + ny * w + uy * t2),
               (c[0] - nx * w + ux * t2, c[1] - ny * w + uy * t2), (c[0] - nx * w - ux * t2, c[1] - ny * w - uy * t2)]
        band_d += 'M' + 'L'.join(fmt(x) + ' ' + fmt(y) for x, y in pts) + 'Z'
    sx, sy = cl[0]
    items = body + sh + ['<path class="il" style="fill:%s" d="%s"/>' % (C(3, VERM), band_d), el_ink(mouth.d())] + tk
    return symbol(id, items, 'bugle-horn (olifant): curved horn, tapering to the mouthpiece, flared bell with a dark mouth, two gules bands. Or. Rally / horn.')


def chg_hourglass():
    id = 'ic-chg-hourglass'
    rng = Rng(id)
    glass_pts = [(9.8, 7.2), (22.2, 7.2), (22.0, 10.6), (19.4, 13.5), (17.0, 15.3), (16.9, 16.8), (19.4, 18.6), (22.0, 21.4), (22.2, 24.8), (9.8, 24.8), (10.0, 21.4), (12.6, 18.6), (15.1, 16.8), (15.0, 15.3), (12.6, 13.5), (10.0, 10.6)]
    glass = spline(glass_pts, rng, wob=0.15, sharp=(0, 1, 8, 9))
    gg = glass.geom()
    gshade = shade(gg, 2.2, 2.0)
    top = poly([(6.6, 3.9), (25.4, 3.8), (25.5, 7.6), (6.4, 7.8)], rng, wob=0.15, bow=0.3, rad=1.0)
    bot = poly([(6.4, 24.4), (25.5, 24.2), (25.4, 28.2), (6.6, 28.3)], rng, wob=0.15, bow=0.3, rad=1.0)
    sand_low = spline([(11.8, 24.8), (13.6, 22.2), (16.0, 19.6), (18.4, 22.2), (20.2, 24.8)], rng, wob=0.1, sharp=(0, 4))
    sand_up = spline([(11.6, 11.2), (20.4, 11.2), (18.6, 13.2), (16.9, 15.0), (15.1, 15.0), (13.4, 13.2)], rng, wob=0.1, sharp=(0, 1))
    tk = [el_tick(tick_d(gg, Rng(id + ':t'), inset=1.7, length=3.6))]
    items = [el_body(glass.d(), C(1, IVO)), el_shade(geom_d(gshade), C(2, VEL2)),
             '<path class="il" style="fill:%s" d="%s"/>' % (C(3, BIS), sand_up.d()),
             '<path class="il" style="fill:%s" d="%s"/>' % (C(3, BIS), sand_low.d()),
             '<path class="il" d="M16 15.2L16 19.8"/>',
             '<path class="il" d="M8.1 7.8V24.2M23.9 7.8V24.2"/>',
             el_body(top.d(), C(3, BIS)), el_body(bot.d(), C(3, BIS))] + tk
    return symbol(id, items, 'hourglass: ivory glass, bister frame and sand. Survive / time. --c1 glass, --c2 glass shade, --c3 frame + sand.')


def chg_cabochon():
    id = 'ic-chg-cabochon'
    rng = Rng(id)
    lobes = [ellipse(cx, cy, 5.7, 5.7, rng, n=8, wob=0.15) for (cx, cy) in [(16, 9.7), (22.3, 16), (16, 22.3), (9.7, 16)]]
    g = union_geom(lobes)
    col = [el_body(geom_d(g), C(3, OR))]
    gem = ellipse(16, 16, 7.5, 7.3, rng, n=10, wob=0.2)
    gg = gem.geom()
    gsh = shade(gg, 2.3, 2.1)
    items = col + ['<path class="ij" style="fill:%s" d="%s"/>' % (C(1, VDG), gem.d()), el_shade(geom_d(gsh), C(2, MAL)),
                   el_tick(tick_d(gg, Rng(id + ':t'), inset=1.9, length=4.2)),
                   '<circle class="tk" cx="20.2" cy="12" r=".1"/>']
    return symbol(id, items, 'cabochon: domed verdigris gem in an orpiment quatrefoil collet. Gems. --c1 gem, --c2 gem shade, --c3 collet.')


def chg_shield():
    id = 'ic-chg-shield'
    rng = Rng(id)
    pts = [(7.0, 4.5), (25.0, 4.3), (25.3, 12.6), (23.5, 19.6), (19.6, 25.2), (16.0, 28.0), (12.5, 25.3), (8.6, 19.8), (6.8, 12.8)]
    p = spline(pts, rng, wob=0.3, sharp=(0, 1, 5))
    body, sh, tk, g = body_layers(id, [p], LAPIS, LAPISD)
    band = offset_d(g, 2.5)
    items = body + sh + ['<path class="il" style="stroke:%s;stroke-width:2" d="%s"/>' % (C(3, OR), band)] + tk
    return symbol(id, items, 'heater shield (charge): azure with an orpiment bordure. Army, defence. --c3 = bordure.')


def chg_crescent():
    id = 'ic-chg-crescent'
    rng = Rng(id)
    outer = ellipse(16, 14.5, 12.0, 11.8, rng, n=12, wob=0.25)
    inner = ellipse(16.2, 9.3, 9.5, 9.3, rng, n=12, wob=0.25)
    g = outer.geom().difference(inner.geom())
    # keep the two horns clean: a spline through the crescent boundary is overkill, bake the polygon
    body_d = geom_d(g, simp=0.03)
    sg = shade(g, 2.3, 2.1)
    tk = tick_d(g, Rng(id + ':t'), inset=2.2, length=4.4)
    items = [el_body(body_d, C(1, OR)), el_shade(geom_d(sg), C(2, ORS)), el_tick(tk)]
    return symbol(id, items, 'crescent: horns up. Or on vert (Anatolia / Balkans blazon), argent for night marks.')


# ====================================================== GLYPH EXEMPLARS =============================================
# Marks that tempt stroke-only art (tick, cross, arrow, play): drawn as filled, hand-cut, inked shapes instead.
def gl_tick():
    id = 'ic-status-tick'
    rng = Rng(id)
    p = poly([(4.6, 17.6), (7.8, 13.6), (12.4, 18.4), (24.2, 5.4), (28.0, 8.6), (12.6, 27.0)], rng, wob=0.25, bow=0.2, rad=0.5)
    body, sh, tk, g = body_layers(id, [p], VDG, MAL, tick_kw=dict(inset=2.0, length=3.6))
    return symbol(id, body + sh + tk, 'tick: filled hand-cut check mark, verdigris with ink contour (done / claimed / selected). Not a stroke.')


def gl_cross():
    id = 'ic-status-cross'
    rng = Rng(id)
    s, w, L = math.sqrt(0.5), 2.6, 12.2
    c = lambda a, b: (16 + (a) * s, 16 + (b) * s)
    j = w * math.sqrt(2)
    pts = [c(-L + w, -L - w), (16, 16 - j), c(L - w, -L - w), c(L + w, -L + w), (16 + j, 16), c(L + w, L - w), c(L - w, L + w), (16, 16 + j), c(-L + w, L + w), c(-L - w, L - w), (16 - j, 16), c(-L - w, -L + w)]
    p = poly(pts, rng, wob=0.25, bow=0.18, rad=0.4)
    body, sh, tk, g = body_layers(id, [p], VERM, MAD, tick_kw=dict(inset=1.9, length=3.4))
    return symbol(id, body + sh + tk, 'cross: filled hand-cut x mark, vermilion with ink contour (failed / removed). Not a stroke.')


def gl_up():
    id = 'ic-status-up'
    rng = Rng(id)
    p = poly([(16.0, 4.4), (27.2, 16.4), (20.0, 16.4), (20.0, 27.6), (12.0, 27.6), (12.0, 16.4), (4.8, 16.4)], rng, wob=0.25, bow=0.15, rad=0.7)
    body, sh, tk, g = body_layers(id, [p], OR, ORS, tick_kw=dict(inset=2.1, length=3.8))
    return symbol(id, body + sh + tk, 'up arrowhead: gilt block arrow (upgrade). Or.')


def gl_play():
    id = 'ic-act-play'
    rng = Rng(id)
    p = poly([(7.6, 5.4), (26.6, 16.0), (7.8, 26.6)], rng, wob=0.25, bow=0.25, rad=1.4)
    return symbol(id, [el_body(p.d(), C(1, 'currentColor'))], 'play: hand-cut right triangle for button labels; fill follows the text colour (--c1 overrides). No shade or tick (S glyph).')


def build():
    cts = [ct_shield(), ct_round(), ct_loz(), ct_quat()]
    chg = [chg_cross_pattee(), chg_saltire(), chg_roundel(), chg_bezant(), chg_mullet(), chg_fleur(), chg_tower(), chg_helm(), chg_garb(),
           chg_bugle(), chg_hourglass(), chg_cabochon(), chg_shield(), chg_crescent()]
    gly = [gl_tick(), gl_cross(), gl_up(), gl_play()]
    hdr_c = ('<!-- Containers (docs/ART_DIRECTION.md 12). GENERATED by tools/gen_kit.py - edit the script, not this file.\n'
             '     Nest one with <use href="#ct-round" style="--k1:var(--f1,#0F1838);--k2:var(--f2,#E9B62A)"/> so the composite exposes\n'
             '     --f1 (field) / --f2 (ring or bordure; none = no band) while its charge keeps --c1..--c3. -->\n')
    hdr_p = ('<!-- P1 charges: the style benchmark. GENERATED by tools/gen_kit.py (seeded wobble, baked shade and tick) - edit the script, not this file.\n'
             '     Tokens: --c1 body, --c2 hard shade, --c3 detail colour (see each comment). -->\n')
    hdr_g = ('<!-- Glyph exemplars (tick, cross, up arrow, play): marks that tempt stroke-only art are filled, hand-cut, inked shapes.\n'
             '     GENERATED by tools/gen_kit.py - edit the script, not this file. -->\n')
    open(OUT + 'containers.svg', 'w').write(hdr_c + '\n'.join(cts))
    open(OUT + 'p1-charges.svg', 'w').write(hdr_p + '\n'.join(chg))
    open(OUT + 'p1-glyphs.svg', 'w').write(hdr_g + '\n'.join(gly))


if __name__ == '__main__':
    build()
    print('wrote containers.svg, p1-charges.svg and p1-glyphs.svg')
