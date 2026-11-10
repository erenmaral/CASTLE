"""pen.py - tiny seeded "pen" for hand-inked 32x32 icon bodies (dev-time helper, NOT shipped logic).

Bodies are straight/smooth paths with seeded wobble (poly, spline, ellipse); the hard shade (body minus the body shifted
up-left) and the ivory tick are derived from the flattened body with shapely and baked into plain path data, so the SVG
sources stay plain symbols. Needs shapely:  pip install shapely   (or pip install --target DIR shapely; export PEN_PYLIB=DIR)
Used by gen_kit.py (containers.svg + p1-charges.svg). New families may use it or be hand-authored; see ../README.md.
"""
import os, sys, math, hashlib
if os.environ.get('PEN_PYLIB'):
    sys.path.insert(0, os.environ['PEN_PYLIB'])
try:
    from shapely.geometry import Polygon, MultiPolygon, LineString, Point, GeometryCollection, box
    from shapely.ops import unary_union
    from shapely import affinity
except ImportError:
    sys.exit('pen.py needs shapely: pip install shapely (or pip install --target DIR shapely and export PEN_PYLIB=DIR)')


def fmt(v, prec=2):
    s = ('%.' + str(prec) + 'f') % v
    if '.' in s:
        s = s.rstrip('0').rstrip('.')
    if s.startswith('0.'):
        s = s[1:]
    elif s.startswith('-0.'):
        s = '-' + s[2:]
    return '0' if s in ('-0', '', '-') else s


class Rng:
    def __init__(self, seed):
        if isinstance(seed, str):
            seed = int(hashlib.md5(seed.encode()).hexdigest()[:8], 16)
        self.s = seed & 0xffffffff

    def r(self):  # mulberry32
        self.s = (self.s + 0x6D2B79F5) & 0xffffffff
        t = self.s
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xffffffff
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296.0

    def u(self, a=1.0):  # uniform in [-a, a]
        return (self.r() * 2 - 1) * a


class Path:
    """Absolute-coordinate path: cmds = [('M',p), ('L',p), ('Q',c,p), ('C',c1,c2,p), ('Z',)]."""

    def __init__(self, cmds=None):
        self.cmds = cmds or []

    def d(self):
        out = []
        for c in self.cmds:
            if c[0] == 'Z':
                out.append('Z')
            else:
                out.append(c[0] + ' '.join(fmt(v) for p in c[1:] for v in p))
        return ''.join(out)

    def flat(self, n=14):
        """Flatten to a list of rings (each a list of points); one ring per M."""
        rings, cur, last = [], [], None
        for c in self.cmds:
            k = c[0]
            if k == 'M':
                if cur: rings.append(cur)
                cur = [c[1]]; last = c[1]
            elif k == 'L':
                cur.append(c[1]); last = c[1]
            elif k == 'Q':
                p0, c1, p1 = last, c[1], c[2]
                for i in range(1, n + 1):
                    t = i / n
                    cur.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c1[0] + t * t * p1[0],
                                (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c1[1] + t * t * p1[1]))
                last = p1
            elif k == 'C':
                p0, c1, c2, p1 = last, c[1], c[2], c[3]
                for i in range(1, n + 1):
                    t = i / n; u = 1 - t
                    cur.append((u ** 3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * p1[0],
                                u ** 3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * p1[1]))
                last = p1
            elif k == 'Z':
                if cur: rings.append(cur); cur = []
        if cur: rings.append(cur)
        return rings

    def geom(self, n=14):
        polys = []
        for r in self.flat(n):
            if len(r) >= 3:
                g = Polygon(r)
                if not g.is_valid: g = g.buffer(0)
                polys.append(g)
        return unary_union(polys) if polys else Polygon()

    def moved(self, dx, dy):
        out = []
        for c in self.cmds:
            out.append((c[0],) + tuple((p[0] + dx, p[1] + dy) for p in c[1:]))
        return Path(out)

    def __add__(self, other):
        return Path(self.cmds + other.cmds)


def _unit(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1.0
    return dx / L, dy / L, L


def poly(pts, rng, wob=0.35, bow=0.25, rad=0.0, closed=True, jitter=True, bows=None):
    """Straight-edged outline with seeded vertex wobble, slightly bowed edges and optional corner radius.
    pts: (x, y) or (x, y, radius). Corner radius > 0 rounds that vertex with a quadratic."""
    V, R = [], []
    for p in pts:
        x, y = p[0], p[1]
        r = p[2] if len(p) > 2 else rad
        if jitter:
            x += rng.u(wob); y += rng.u(wob)
        V.append((x, y)); R.append(r)
    n = len(V)
    A, B = [], []  # corner entry / exit points
    for i in range(n):
        pv, nx = V[(i - 1) % n], V[(i + 1) % n]
        r = R[i]
        if r > 0 and (closed or 0 < i < n - 1):
            ux, uy, L1 = _unit(V[i], pv); vx, vy, L2 = _unit(V[i], nx)
            r1, r2 = min(r, L1 * 0.48), min(r, L2 * 0.48)
            A.append((V[i][0] + ux * r1, V[i][1] + uy * r1)); B.append((V[i][0] + vx * r2, V[i][1] + vy * r2))
        else:
            A.append(V[i]); B.append(V[i])
    cmds = [('M', B[0])]
    last = n if closed else n - 1
    for i in range(last):
        j = (i + 1) % n
        p0, p1 = B[i], A[j]
        ux, uy, L = _unit(p0, p1)
        explicit = bows[i] if (bows is not None and i < len(bows) and bows[i] is not None) else None
        if explicit is not None and abs(explicit) > 1e-6:
            # explicit outward bow (clockwise outline, y down): + bulges out, - is concave
            mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
            off = explicit * (1.0 + rng.u(0.12))
            cmds.append(('Q', (mx + uy * off, my - ux * off), p1))
        elif bows is None and bow > 0 and L > 3.0:
            mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
            off = bow * rng.u(1.0) * min(1.0, L / 12.0)
            cmds.append(('Q', (mx - uy * off, my + ux * off), p1))
        else:
            cmds.append(('L', p1))
        if R[j] > 0 and (closed or 0 < j < n - 1):
            cmds.append(('Q', V[j], B[j]))
    if closed: cmds.append(('Z',))
    return Path(cmds)


def spline(pts, rng, wob=0.3, sharp=(), closed=True, k=1.0, jitter=True):
    """Catmull-Rom through the points (cubic beziers). Indices in `sharp` are corners (straight handles)."""
    V = []
    for p in pts:
        x, y = p[0], p[1]
        if jitter:
            x += rng.u(wob); y += rng.u(wob)
        V.append((x, y))
    n = len(V)
    sharp = set(sharp)
    cmds = [('M', V[0])]
    segs = n if closed else n - 1
    for i in range(segs):
        p0, p1 = V[i], V[(i + 1) % n]
        pm = V[(i - 1) % n] if (closed or i > 0) else p0
        pp = V[(i + 2) % n] if (closed or i + 2 < n) else p1
        if i in sharp or (not closed and i == 0):
            c1 = (p0[0] + (p1[0] - p0[0]) / 3, p0[1] + (p1[1] - p0[1]) / 3)
        else:
            c1 = (p0[0] + (p1[0] - pm[0]) / 6 * k, p0[1] + (p1[1] - pm[1]) / 6 * k)
        if ((i + 1) % n) in sharp or (not closed and i + 1 == n - 1):
            c2 = (p1[0] - (p1[0] - p0[0]) / 3, p1[1] - (p1[1] - p0[1]) / 3)
        else:
            c2 = (p1[0] - (pp[0] - p0[0]) / 6 * k, p1[1] - (pp[1] - p0[1]) / 6 * k)
        cmds.append(('C', c1, c2, p1))
    if closed: cmds.append(('Z',))
    return Path(cmds)


def ellipse(cx, cy, rx, ry, rng, n=12, wob=0.3, rot=0.0):
    """Hand-drawn oval: low-frequency radial wobble (1st-3rd harmonics) + a whisper of per-point noise."""
    h = [(rng.u(1), rng.r() * 2 * math.pi) for _ in range(3)]
    pts = []
    a0 = rng.u(0.3) + rot
    for i in range(n):
        a = a0 + 2 * math.pi * i / n
        f = sum(wob * (0.55, 0.45, 0.3)[k] * h[k][0] * math.cos((k + 1) * a - h[k][1]) for k in range(3))
        pts.append((cx + math.cos(a) * (rx + f), cy + math.sin(a) * (ry + f)))
    return spline(pts, rng, wob=0.04)


def circle_pts(cx, cy, r, n, a0=0.0):
    return [(cx + math.cos(a0 + 2 * math.pi * i / n) * r, cy + math.sin(a0 + 2 * math.pi * i / n) * r) for i in range(n)]


# ---------- derived layers ----------
def geom_polys(g):
    if g.is_empty: return []
    if isinstance(g, Polygon): return [g]
    if isinstance(g, (MultiPolygon, GeometryCollection)):
        out = []
        for h in g.geoms: out += geom_polys(h)
        return out
    return []


def ring_d(pts, prec=1):
    """Closed polyline as M + relative l pairs on a 0.1u grid (deltas of the rounded absolute points: no drift)."""
    q = [(round(x, prec), round(y, prec)) for x, y in pts]
    out = ['M' + fmt(q[0][0], prec) + ' ' + fmt(q[0][1], prec) + 'l']
    prev = q[0]
    toks = []
    for p in q[1:]:
        dx, dy = round(p[0] - prev[0], prec), round(p[1] - prev[1], prec)
        if dx == 0 and dy == 0:
            continue
        toks.append(fmt(dx, prec) + ' ' + fmt(dy, prec))
        prev = p
    return out[0] + ' '.join(toks) + 'z'


def geom_d(g, simp=0.04, min_area=0.15):
    """Polygons -> path data (compact polyline). Exterior + holes."""
    parts = []
    for p in geom_polys(g):
        if p.area < min_area: continue
        p = p.simplify(simp, preserve_topology=True)
        for ring in [p.exterior] + [r for r in p.interiors if Polygon(r).area >= 0.3]:
            pts = list(ring.coords)[:-1]
            if len(pts) < 3: continue
            parts.append(ring_d(pts))
    return ''.join(parts)


def shade(body_geom, dx=2.3, dy=2.1, clip=None):
    """Hard shade = body minus body shifted up-left (a crescent along the lower-right edges)."""
    g = body_geom.difference(affinity.translate(body_geom, -dx, -dy))
    if clip is not None: g = g.intersection(clip)
    return g


def tick_d(body_geom, rng, inset=3.0, length=4.4, towards=(-0.74, -0.67), max_turn=48.0, around=None):
    """Short ivory highlight stroke hugging the top-left of the body at `inset` from the edge (gentle arc, no hooks)."""
    polys = []
    for ins in (inset, inset * 0.85, inset * 0.7, inset * 0.55, inset * 0.4):
        g = body_geom.buffer(-ins, join_style=1)
        polys = geom_polys(g)
        if polys: break
    if not polys: return ''
    best = max(polys, key=lambda p: p.area)
    ring = LineString(list(best.exterior.coords))
    L = ring.length
    step = 0.35
    n = int(L / step)
    P = [ring.interpolate(i * step) for i in range(n)]
    P = [(p.x, p.y) for p in P]
    w = max(3, int(length / step))
    bestv, besti = None, None
    for i in range(n):
        seg = [P[(i + j) % n] for j in range(w + 1)]
        a = math.atan2(seg[1][1] - seg[0][1], seg[1][0] - seg[0][0])
        b = math.atan2(seg[-1][1] - seg[-2][1], seg[-1][0] - seg[-2][0])
        turn = abs((math.degrees(b - a) + 180) % 360 - 180)
        if turn > max_turn: continue
        mx = sum(p[0] for p in seg) / len(seg); my = sum(p[1] for p in seg) / len(seg)
        score = mx * towards[0] + my * towards[1]
        if around is not None:
            score = -math.hypot(mx - around[0], my - around[1])
        if bestv is None or score > bestv:
            bestv, besti = score, i
    if besti is None: return ''
    seg = [P[(besti + j) % n] for j in range(w + 1)]
    p0, pm, p2 = seg[0], seg[len(seg) // 2], seg[-1]
    q = (2 * pm[0] - (p0[0] + p2[0]) / 2, 2 * pm[1] - (p0[1] + p2[1]) / 2)
    return 'M%s %sQ%s %s %s %s' % (fmt(p0[0]), fmt(p0[1]), fmt(q[0]), fmt(q[1]), fmt(p2[0]), fmt(p2[1]))


def offset_d(body_geom, inset, simp=0.04, closed=True):
    """Inner offset outline of the body (polyline path), e.g. a bordure line."""
    g = body_geom.buffer(-inset, join_style=1)
    return geom_d_line(g, simp)


def geom_d_line(g, simp=0.05):
    parts = []
    for p in geom_polys(g):
        p = p.simplify(simp, preserve_topology=True)
        pts = list(p.exterior.coords)[:-1]
        if len(pts) >= 3:
            parts.append(ring_d(pts))
    return ''.join(parts)


# ---------- svg element emitters ----------
def tok(var, hexv):
    return 'var(--%s,%s)' % (var, hexv)


def el_body(d, fill):
    return '<path class="ik" style="fill:%s" d="%s"/>' % (fill, d)


def el_shade(d, fill):
    return '<path class="hs" style="fill:%s" d="%s"/>' % (fill, d)


def el_fill(d, fill, cls='il'):
    """Filled detail with a thin ink edge (cls il)."""
    return '<path class="%s" style="fill:%s" d="%s"/>' % (cls, fill, d)


def el_line(d):
    return '<path class="il" d="%s"/>' % d


def el_ink(d):
    return '<path class="ia" d="%s"/>' % d


def el_tick(d):
    return '<path class="tk" d="%s"/>' % d if d else ''


def symbol(id, items, comment=''):
    head = ('<!-- %s -->\n' % comment) if comment else ''
    return head + '<symbol id="%s" viewBox="0 0 32 32">\n  %s\n</symbol>\n' % (id, '\n  '.join(i for i in items if i))


def composite(id, ct, f1, f2, charge, box, comment=''):
    """Container + one nested charge. The container tokens are exposed as --f1/--f2 (defaults f1, f2) so the page can recolour
    the field/ring while the charge keeps its own --c1..--c3. box = (x, y, w, h) of the charge inside the 32x32 symbol."""
    x, y, w, h = box
    items = ['<use href="#%s" style="--k1:var(--f1,%s);--k2:var(--f2,%s)"/>' % (ct, f1, f2),
             '<use href="#%s" x="%s" y="%s" width="%s" height="%s"/>' % (charge, fmt(x), fmt(y), fmt(w), fmt(h))]
    return symbol(id, items, comment)
