#!/usr/bin/env node
// Castle Siege: History - icon kit builder (Node 22, no dependencies).
//   node scripts/build-icons.js              build www/js/icons.js from art/icons/src/*.svg + art/icons/manifest.json
//   node scripts/build-icons.js --check      validate + fail if the committed www/js/icons.js is stale (CI)
//   node scripts/build-icons.js --selftest   unit-test the runtime (Z.ico, Z.Icons.*) in Node, no DOM
//   node scripts/build-icons.js --list       print every manifest icon with drawn/alias/missing status
// Authoring rules: art/icons/src/README.md. The runtime below is a real function (syntax-checked, unit-testable)
// whose source text is embedded in icons.js, so it must stay ES5 (Chrome 87 WebView baseline, classic <script>).
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
// ICONS_SRC / ICONS_MANIFEST / ICONS_OUT override the locations (used to test the validator against scratch copies).
const DIRS = {
  src: process.env.ICONS_SRC || path.join(ROOT, 'art', 'icons', 'src'),
  manifest: process.env.ICONS_MANIFEST || path.join(ROOT, 'art', 'icons', 'manifest.json'),
  out: process.env.ICONS_OUT || path.join(ROOT, 'www', 'js', 'icons.js')
};

// Shared class rules, injected once into the sprite and into every standalone SVG (canvas / CSS use).
// ik = ink contour (4u), ij = inner contour of a sub-shape (2.4u), il = thin inner line, ia = ink area, hs = flat shape, tk = ivory tick.
// Colours go through custom properties so states can recolour: --c1..--c3 fills, --ink, --il (detail ink), --tk (tick), --sw/--sj/--dash.
const STYLE = [
  '.ik{stroke:var(--ink,#1E1610);stroke-width:var(--sw,4);stroke-linejoin:round;stroke-linecap:round;paint-order:stroke;stroke-dasharray:var(--dash,none)}',
  '.ij{stroke:var(--ink,#1E1610);stroke-width:var(--sj,2.4);stroke-linejoin:round;stroke-linecap:round;paint-order:stroke;stroke-dasharray:var(--dash,none)}',
  '.il{fill:none;stroke:var(--il,var(--ink,#1E1610));stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:var(--dash,none)}',
  '.ia{fill:var(--il,var(--ink,#1E1610));stroke:none}',
  '.hs{stroke:none}',
  '.tk{fill:none;stroke:var(--tk,#F4ECD3);stroke-width:1.5;stroke-linecap:round}'
].join('');

// Underdrawn state (bible 1): no fills, thin dashed --ud contour, no tick. Used for alias variants with "state":"ud".
const STATE_UD = '--c1:none;--c2:none;--c3:none;--f1:none;--f2:none;--k1:none;--k2:none;--ink:var(--ud,#C6B684);--il:none;--tk:none;--sw:1.6;--sj:1;--dash:2 3.6';

const VS16 = String.fromCharCode(0xFE0F);
const ID_RE = /^(?:ic-[a-z0-9]+-[a-z0-9][a-z0-9-]*|ct-[a-z0-9][a-z0-9-]*)$/;
const OLD_ID_RE = /^i-[a-z0-9-]+$/;
const FAMILIES = ['ct', 'chg', 'cur', 'nav', 'act', 'rule', 'hero', 'realm', 'status', 'perk', 'cls', 'mar', 'dec'];

// ---------------------------------------------------------------------------------------------------------------------
// RUNTIME (ES5). Receives Z and the data blob D = { style, sym:{id:markup}, map:{emoji:id}, by:{...}, missing:[...] }.
// ---------------------------------------------------------------------------------------------------------------------
function runtime(Z, D) {
  var SYM = D.sym, MAP = D.map, STYLE = D.style;
  var own = Object.prototype.hasOwnProperty;
  var Icons = Z.Icons = Z.Icons || {};

  function has(id) { return typeof id === 'string' && own.call(SYM, id); }

  var ids = Object.keys(SYM);
  var parts = ['<svg xmlns="http://www.w3.org/2000/svg" id="z-icons" style="display:none" aria-hidden="true" focusable="false"><style>', STYLE, '</style>'];
  for (var i = 0; i < ids.length; i++) parts.push(SYM[ids[i]]);
  parts.push('</svg>');

  Icons.sprite = parts.join('');
  Icons.ids = ids;
  Icons.by = D.by || {};
  Icons.missing = D.missing || [];
  Icons.ud = D.ud || '';
  Icons.has = has;

  // Insert the sprite once, as the first child of #stage (else <body>). Idempotent, no-op without a DOM.
  Icons.inject = function () {
    if (typeof document === 'undefined' || !document.body) return false;
    if (document.getElementById('z-icons')) return true;
    var host = document.getElementById('stage') || document.body;
    var box = document.createElement('div');
    box.innerHTML = Icons.sprite;
    if (!box.firstChild) return false;
    host.insertBefore(box.firstChild, host.firstChild);
    return true;
  };

  // Inline icon markup for one id ('' when the id is not drawn). cls = extra classes, e.g. 'ud' or 'big'.
  Icons.svg = function (id, cls) {
    return has(id) ? '<svg class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>' : '';
  };

  // Standalone SVG text of one icon (symbol + the symbols it nests), for canvas / CSS background use.
  function collect(id, out, seen) {
    if (seen[id] || !has(id)) return;
    seen[id] = 1;
    var re = /href=["']#([^"']+)["']/g, m;
    while ((m = re.exec(SYM[id]))) collect(m[1], out, seen);
    out.push(id);
  }
  Icons.standalone = function (id) {
    if (!has(id)) return null;
    var list = [], seen = {}, defs = '';
    collect(id, list, seen);
    for (var k = 0; k < list.length; k++) defs += SYM[list[k]];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32"><style>' + STYLE + '</style><defs>' + defs +
      '</defs><use href="#' + id + '" width="32" height="32"/></svg>';
  };
  Icons.dataUrl = function (id) {
    var s = Icons.standalone(id);
    if (!s) return null;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
  };

  // Canvas: draws the 32x32 icon scaled into a size x size box at (x, y). Returns true when drawn, false while the cached
  // Image is still decoding (retry next frame), when the id is unknown or without a DOM.
  var imgs = {};
  function load(id) {
    var e = imgs[id];
    if (e) return e;
    if (typeof Image === 'undefined' || !has(id)) return null;
    e = imgs[id] = { img: new Image(), ok: false, bad: false };
    e.img.onload = function () { e.ok = true; };
    e.img.onerror = function () { e.bad = true; };
    e.img.src = Icons.dataUrl(id);
    return e;
  }
  Icons.draw = function (ctx, id, x, y, size) {
    var e = load(id);
    if (!e || e.bad || !e.ok) return false;
    ctx.drawImage(e.img, x, y, size, size);
    return true;
  };
  // Start decoding icons early (all, or the given ids) so the first canvas frames do not miss.
  Icons.warm = function (list) {
    list = list || ids;
    for (var j = 0; j < list.length; j++) load(list[j]);
  };

  // Emoji (incl. optional VS16) -> icon id. Planned map: an id may not be drawn yet; Z.ico leaves such emoji untouched.
  Z.ICO = MAP;

  // Replace mapped emoji ONLY in the text segments of an HTML string (tags and attributes are never touched).
  // A unit = pictograph + optional VS16 + optional skin tone, joined by ZWJ into sequences, or a regional-indicator pair:
  // each unit is looked up whole, and a hit consumes the VS16 / tone / whole sequence with it.
  var BASE = '(?:[\\u2190-\\u21ff\\u2300-\\u23ff\\u25a0-\\u25ff\\u2600-\\u27bf\\u2900-\\u297f\\u2b00-\\u2bff]|[\\ud83c-\\ud83e][\\udc00-\\udfff])';
  var TONE = '(?:\\ud83c[\\udffb-\\udfff])?';
  var UNIT = new RegExp('(?:\\ud83c[\\udde6-\\uddff]){2}|' + BASE + '\\ufe0f?' + TONE + '(?:\\u200d' + BASE + '\\ufe0f?' + TONE + ')*', 'g');
  var QUICK = new RegExp('[\\u2190-\\u21ff\\u2300-\\u23ff\\u25a0-\\u25ff\\u2600-\\u27bf\\u2900-\\u297f\\u2b00-\\u2bff\\ud83c-\\ud83e]');
  var VS16G = new RegExp('\\ufe0f', 'g'), ZWJ = new RegExp('\\u200d'), TONEG = new RegExp('\\ud83c[\\udffb-\\udfff]', 'g');

  function swap(u) {
    var id = MAP[u];
    if (!id) {
      var bare = u.replace(VS16G, '');
      id = MAP[bare];
      if (!id && !ZWJ.test(u)) id = MAP[bare.replace(TONEG, '')];
    }
    return id && has(id) ? '<svg class="i" aria-hidden="true"><use href="#' + id + '"/></svg>' : u;
  }
  Z.ico = function (html) {
    var s = html === null || html === undefined ? '' : String(html);
    if (!QUICK.test(s)) return s;
    var segs = s.split(/(<[^>]*>)/);
    for (var n = 0; n < segs.length; n += 2) if (segs[n]) segs[n] = segs[n].replace(UNIT, swap);
    return segs.join('');
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------------------------------------------------
const FORBIDDEN = [
  [/<(?:linearGradient|radialGradient)\b/i, 'gradients are not allowed (flat fills only)'],
  [/<(?:filter|feGaussianBlur|feTurbulence|feDropShadow)\b/i, 'filters are not allowed'],
  [/<(?:clipPath|mask|pattern|marker)\b/i, '<clipPath>/<mask>/<pattern>/<marker> are not allowed: the sprite is display:none, so Chrome does not resolve resources inside it - bake the geometry'],
  [/<(?:image|script|foreignObject|style|text|a)\b/i, 'only shapes, <g> and <use> are allowed inside a symbol'],
  [/opacity\s*[=:]/i, 'opacity / fill-opacity / stroke-opacity are not allowed (flat pigment only)'],
  [/\bfilter\s*[=:]/i, 'filter is not allowed'],
  [/(?:fill|stroke)\s*[=:]\s*["']?url\(/i, 'paint servers (url()) are not allowed']
];

function squeeze(s) {
  return s.replace(/[\r\n\t]+/g, ' ').replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').replace(/\s+\/>/g, '/>').replace(/\s+>/g, '>').trim();
}

function parseSource(file, text, errors, warnings) {
  const out = [];
  const clean = text.replace(/<!--[\s\S]*?-->/g, '');
  const re = /<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g;
  let m;
  while ((m = re.exec(clean))) {
    const attrs = m[1];
    const id = (/\bid\s*=\s*"([^"]+)"/.exec(attrs) || [])[1];
    const vb = (/\bviewBox\s*=\s*"([^"]+)"/.exec(attrs) || [])[1];
    const where = file + (id ? ' #' + id : '');
    if (!id) { errors.push(file + ': <symbol> without id'); continue; }
    if (!ID_RE.test(id)) errors.push(where + ': bad id (want ic-<set>-<name> or ct-<name>, lowercase)');
    if (vb !== '0 0 32 32') errors.push(where + ': viewBox must be "0 0 32 32" (got ' + JSON.stringify(vb) + ')');
    const stray = attrs.replace(/\b(?:id|viewBox)\s*=\s*"[^"]*"/g, '').trim();
    if (stray) warnings.push(where + ': symbol attributes other than id/viewBox are dropped (' + stray + ')');
    const inner = m[2];
    for (const [rx, why] of FORBIDDEN) if (rx.test(inner)) errors.push(where + ': ' + why);
    if (/="[^"]*'[^"]*"/.test(inner)) errors.push(where + ': single quote inside an attribute value');
    if (!/class="[^"]*\bik\b/.test(inner) && !/<use\b/.test(inner)) warnings.push(where + ': no ink contour (class="ik") and no nested <use>');
    const body = squeeze(inner).replace(/="([^"]*)"/g, "='$1'");
    out.push({ id, file, markup: "<symbol id='" + id + "' viewBox='0 0 32 32'>" + body + '</symbol>' });
  }
  const rest = clean.replace(re, '').replace(/<\?xml[^>]*\?>/g, '').replace(/<\/?svg\b[^>]*>/g, '').trim();
  if (rest) warnings.push(file + ': markup outside <symbol> is ignored: ' + rest.slice(0, 60).replace(/\s+/g, ' '));
  return out;
}

function aliasMarkup(id, to, style) {
  return "<symbol id='" + id + "' viewBox='0 0 32 32'><use href='#" + to + "'" + (style ? " style='" + style + "'" : '') + '/></symbol>';
}

function cpOf(str) {
  return Array.from(str).map(c => c.codePointAt(0).toString(16).toUpperCase()).filter(h => h !== 'FE0F').join(' ');
}

function loadModel() {
  const errors = [], warnings = [];
  const symbols = new Map(); // id -> { id, file, markup }
  const files = fs.existsSync(DIRS.src) ? fs.readdirSync(DIRS.src).filter(f => /\.svg$/i.test(f)).sort() : [];
  for (const f of files) {
    for (const s of parseSource(f, fs.readFileSync(path.join(DIRS.src, f), 'utf8'), errors, warnings)) {
      if (symbols.has(s.id)) errors.push('duplicate id ' + s.id + ' (' + symbols.get(s.id).file + ' and ' + s.file + ')');
      else symbols.set(s.id, s);
    }
  }

  let man = { version: 1, icons: [], map: [], keep: [], drop: [] };
  if (fs.existsSync(DIRS.manifest)) {
    try { man = JSON.parse(fs.readFileSync(DIRS.manifest, 'utf8')); } catch (e) { errors.push('manifest.json: ' + e.message); }
  } else warnings.push('art/icons/manifest.json not found');

  // manifest.icons: catalogue of every id that must exist
  const catalog = new Map();
  for (const ic of man.icons || []) {
    if (!ic.id) { errors.push('manifest.icons: entry without id'); continue; }
    if (catalog.has(ic.id)) { errors.push('manifest.icons: duplicate id ' + ic.id); continue; }
    if (!ID_RE.test(ic.id)) errors.push('manifest.icons ' + ic.id + ': bad id');
    if (FAMILIES.indexOf(ic.family) < 0) errors.push('manifest.icons ' + ic.id + ': family ' + JSON.stringify(ic.family) + ' not in ' + FAMILIES.join(','));
    if (['S', 'M', 'L'].indexOf(ic.size) < 0) errors.push('manifest.icons ' + ic.id + ': size must be S, M or L');
    if (['kit', 'batch'].indexOf(ic.draw) < 0) errors.push('manifest.icons ' + ic.id + ': draw must be "kit" or "batch"');
    if (!ic.motif) warnings.push('manifest.icons ' + ic.id + ': empty motif');
    catalog.set(ic.id, ic);
  }

  // aliases: legacy i-* ids + manifest icons that declare alias_of (+ optional "state":"ud" or "alias_style")
  const aliasList = [];
  for (const a of man.aliases || []) {
    if (!OLD_ID_RE.test(a.id || '')) errors.push('manifest.aliases: bad legacy id ' + JSON.stringify(a.id));
    aliasList.push({ id: a.id, to: a.to, style: a.style || '' });
  }
  for (const ic of catalog.values()) {
    if (!ic.alias_of) continue;
    aliasList.push({ id: ic.id, to: ic.alias_of, style: ic.alias_style || (ic.state === 'ud' ? STATE_UD : '') });
    if (symbols.has(ic.id)) errors.push('manifest.icons ' + ic.id + ': has alias_of but is also drawn in src/ (pick one)');
  }
  const all = new Map(symbols); // drawn + alias markup
  const unresolved = [];
  let progress = true, pending = aliasList.slice();
  while (progress && pending.length) {
    progress = false;
    const next = [];
    for (const a of pending) {
      if (all.has(a.id)) { errors.push('alias ' + a.id + ': id already defined'); progress = true; continue; }
      if (all.has(a.to)) { all.set(a.id, { id: a.id, file: '(alias)', markup: aliasMarkup(a.id, a.to, a.style) }); progress = true; } else next.push(a);
    }
    pending = next;
  }
  for (const a of pending) unresolved.push(a.id + ' -> ' + a.to);
  if (unresolved.length) warnings.push('aliases waiting for their target to be drawn: ' + unresolved.join(', '));

  // nested references must resolve
  for (const s of all.values()) {
    const re = /href='#([^']+)'/g; let m;
    while ((m = re.exec(s.markup))) if (!all.has(m[1])) errors.push(s.id + ': <use> references unknown/undrawn symbol #' + m[1]);
  }

  // drawn vs catalogue
  for (const id of symbols.keys()) if (!catalog.has(id)) warnings.push('drawn but not in manifest.icons: ' + id);
  const kitMissing = [], batchLeft = [];
  for (const ic of catalog.values()) {
    if (all.has(ic.id)) continue;
    (ic.draw === 'kit' ? kitMissing : batchLeft).push(ic.id);
  }
  if (kitMissing.length) warnings.push('draw:"kit" icons not drawn yet: ' + kitMissing.join(', '));

  // map: emoji -> icon id
  const map = {}, seenCp = {};
  const keepCp = {};
  for (const k of man.keep || []) keepCp[(k.cp || '').toUpperCase()] = 1;
  for (const e of man.map || []) {
    if (!e.cp || !e.chars || !e.id) { errors.push('manifest.map: entry needs cp, chars, id: ' + JSON.stringify(e)); continue; }
    const cp = e.cp.toUpperCase();
    if (cpOf(e.chars) !== cp) errors.push('manifest.map ' + e.id + ': cp ' + e.cp + ' does not match chars ' + e.chars + ' (' + cpOf(e.chars) + ')');
    if (seenCp[cp]) errors.push('manifest.map: code point ' + cp + ' mapped twice');
    seenCp[cp] = 1;
    if (keepCp[cp]) errors.push('manifest.map: code point ' + cp + ' is also listed in keep');
    if (!catalog.has(e.id) && !all.has(e.id)) errors.push('manifest.map ' + cp + ': target ' + e.id + ' is neither drawn nor in manifest.icons');
    const base = Array.from(e.chars).filter(c => c !== VS16).join('');
    map[base] = e.id;
    if (Array.from(base).length === 1) map[base + VS16] = e.id;
  }
  for (const d of man.drop || []) if (seenCp[(d.cp || '').toUpperCase()]) errors.push('manifest.drop: code point ' + d.cp + ' is also mapped');
  for (const d of man.drop || []) for (const id of d.instead || []) if (!catalog.has(id) && !all.has(id)) errors.push('manifest.drop ' + d.cp + ': instead-id ' + id + ' is unknown');
  const mapIds = Array.from(new Set(Object.keys(map).map(k => map[k])));
  const missing = mapIds.filter(id => !all.has(id)).sort();
  const todo = Array.from(catalog.values()).filter(ic => !all.has(ic.id)).map(ic => ic.id);

  // data-site tables (by): every id mentioned must be known
  const by = man.by || {};
  (function walk(v, trail) {
    if (typeof v === 'string') { if (/^(?:ic|ct)-/.test(v) && !catalog.has(v) && !all.has(v)) errors.push('manifest.by ' + trail + ': unknown id ' + v); } else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], trail + '.' + k);
  })(by, 'by');

  return { errors, warnings, symbols, all, catalog, map, by, missing, todo, mapIds, manifest: man, kitMissing, batchLeft, aliasList };
}

// ---------------------------------------------------------------------------------------------------------------------
// icons.js text
// ---------------------------------------------------------------------------------------------------------------------
function jsEsc(str) {
  return JSON.stringify(str).replace(new RegExp('[\\u007f-\\uffff]', 'g'), c => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
}

function buildJs(model) {
  const ids = Array.from(model.all.keys()); // drawn (file order) then aliases
  const sym = ids.map(id => '    ' + JSON.stringify(id) + ': ' + JSON.stringify(model.all.get(id).markup)).join(',\n');
  const mapKeys = Object.keys(model.map).sort((a, b) => (cpOf(a) < cpOf(b) ? -1 : cpOf(a) > cpOf(b) ? 1 : a.length - b.length));
  const map = mapKeys.map(k => '    ' + jsEsc(k) + ': ' + JSON.stringify(model.map[k]) + ', // ' + cpOf(k) + (k.indexOf(VS16) >= 0 ? ' VS16' : '')).join('\n');
  return [
    '// Castle Siege: History - icon kit (manuscript / heraldic SVG symbols). GENERATED by `node scripts/build-icons.js` from',
    '// art/icons/src/*.svg + art/icons/manifest.json - edit those, never this file. Style rules: docs/ART_DIRECTION.md section 12.',
    '// Z.Icons.sprite/ids/inject/has/svg/draw/warm/standalone/dataUrl/by/missing/ud, Z.ICO (emoji -> id), Z.ico(html) (emoji swap in text segments).',
    '(function (Z) {',
    "  'use strict';",
    '  var D = {',
    '    style: ' + JSON.stringify(STYLE) + ',',
    '    ud: ' + JSON.stringify(STATE_UD) + ',',
    '    sym: {',
    sym,
    '    },',
    '    map: {',
    map,
    '    },',
    '    by: ' + JSON.stringify(model.by) + ',',
    '    missing: ' + JSON.stringify(model.missing),
    '  };',
    '  (' + runtime.toString().replace(/\n/g, '\n  ') + ')(Z, D);',
    '})(globalThis.Z = globalThis.Z || {});',
    ''
  ].join('\n');
}

// ---------------------------------------------------------------------------------------------------------------------
// Self test (Node, no DOM)
// ---------------------------------------------------------------------------------------------------------------------
function selftest() {
  const assert = require('assert');
  let checks = 0;
  const ok = (cond, msg) => { checks++; assert.ok(cond, msg); };
  const eq = (a, b, msg) => { checks++; assert.strictEqual(a, b, msg); };
  const u = (...c) => String.fromCodePoint(...c);
  const GEM = u(0x1F48E), SWORDS = u(0x2694), COIN = u(0x1FA99), LION = u(0x1F981), DRAGON = u(0x1F409), SHIELD = u(0x1F6E1), HAND = u(0x1F446), FIRE = u(0x1F525), CRAB = u(0x1F980);
  const FLAG_TR = u(0x1F1F9, 0x1F1F7), FLAG_BR = u(0x1F1E7, 0x1F1F7), ZWJ = u(0x200D), TONE = u(0x1F3FD);

  const sym = { 'ic-cur-cabochon': "<symbol id='ic-cur-cabochon' viewBox='0 0 32 32'><path class='ik' d='M0 0'/></symbol>", 'ic-cur-bezant': "<symbol id='ic-cur-bezant' viewBox='0 0 32 32'><use href='#ic-cur-cabochon'/></symbol>", 'ic-nav-swords': "<symbol id='ic-nav-swords' viewBox='0 0 32 32'><path class='ik' d='M1 1'/></symbol>", 'ic-hero-aslan': "<symbol id='ic-hero-aslan' viewBox='0 0 32 32'><path class='ik' d='M2 2'/></symbol>" };
  const map = { [GEM]: 'ic-cur-cabochon', [SWORDS]: 'ic-nav-swords', [SWORDS + VS16]: 'ic-nav-swords', [COIN]: 'ic-cur-bezant', [LION]: 'ic-hero-aslan', [DRAGON]: 'ic-hero-ejder', [SHIELD]: 'ic-nav-shield', [FLAG_TR]: 'ic-nav-flag', [HAND]: 'ic-nav-swords' };
  const Z = {};
  runtime(Z, { style: STYLE, ud: STATE_UD, sym, map, by: { x: 1 }, missing: ['ic-nav-shield'] });
  const svg = id => '<svg class="i" aria-hidden="true"><use href="#' + id + '"/></svg>';

  eq(Z.ico(GEM + ' 12'), svg('ic-cur-cabochon') + ' 12', 'plain emoji');
  eq(Z.ico(SWORDS + VS16 + ' x'), svg('ic-nav-swords') + ' x', 'VS16 consumed');
  eq(Z.ico(SWORDS + ' x'), svg('ic-nav-swords') + ' x', 'bare symbol');
  eq(Z.ico('<b title="' + GEM + '">' + GEM + '</b>'), '<b title="' + GEM + '">' + svg('ic-cur-cabochon') + '</b>', 'attributes untouched');
  eq(Z.ico('<span data-x="a>b">' + COIN + '</span>'), '<span data-x="a>b">' + svg('ic-cur-bezant') + '</span>', 'tag with > in an attribute stays safe');
  eq(Z.ico(SHIELD + ' shield'), SHIELD + ' shield', 'mapped but undrawn id is left as emoji');
  const keepAs = CRAB + ' ' + u(0x2192) + ' ' + u(0x25BC) + ' ' + u(0x27E6) + 'x' + u(0x27E7);
  eq(Z.ico(keepAs), keepAs, 'unmapped, arrows, triangles and brackets untouched');
  eq(Z.ico(FLAG_TR + ' TR'), FLAG_TR + ' TR', 'flag pair consumed whole, mapped-but-undrawn stays');
  eq(Z.ico(FLAG_BR), FLAG_BR, 'unmapped flag pair untouched');
  eq(Z.ico(LION + ZWJ + FIRE), LION + ZWJ + FIRE, 'unknown ZWJ sequence untouched (no dangling ZWJ)');
  eq(Z.ico(HAND + TONE + ' tap'), svg('ic-nav-swords') + ' tap', 'skin tone consumed with its base');
  eq(Z.ico(GEM + GEM + LION), svg('ic-cur-cabochon') + svg('ic-cur-cabochon') + svg('ic-hero-aslan'), 'adjacent emoji');
  eq(Z.ico('plain text & <i>tags</i>'), 'plain text & <i>tags</i>', 'ASCII fast path');
  const cjk = u(0x4E2D, 0x6587, 0x3001, 0x3002);
  eq(Z.ico(cjk), cjk, 'CJK punctuation untouched');
  eq(Z.ico(null), '', 'null -> empty');
  eq(Z.ico(42), '42', 'number -> string');
  ok(Z.ICO[GEM] === 'ic-cur-cabochon' && Z.ICO[SWORDS + VS16] === 'ic-nav-swords', 'Z.ICO exported');
  ok(Z.Icons.has('ic-cur-cabochon') && !Z.Icons.has('ic-nav-shield') && !Z.Icons.has('nope') && !Z.Icons.has(null), 'has()');
  eq(Z.Icons.svg('ic-cur-cabochon', 'ud'), '<svg class="i ud" aria-hidden="true"><use href="#ic-cur-cabochon"/></svg>', 'svg() with class');
  eq(Z.Icons.svg('ic-missing'), '', 'svg() of unknown id');
  ok(/^<svg [^>]*style="display:none"/.test(Z.Icons.sprite) && /<\/svg>$/.test(Z.Icons.sprite) && Z.Icons.sprite.indexOf("<symbol id='ic-nav-swords'") > 0, 'sprite shape');
  eq(Z.Icons.inject(), false, 'inject is a no-op without DOM');
  eq(Z.Icons.draw({ drawImage() { throw new Error('must not draw'); } }, 'ic-cur-cabochon', 0, 0, 24), false, 'draw returns false without Image');
  const st = Z.Icons.standalone('ic-cur-bezant');
  ok(st.indexOf("<symbol id='ic-cur-cabochon'") > 0 && st.indexOf("<symbol id='ic-cur-bezant'") > 0 && st.indexOf('<use href="#ic-cur-bezant"') > 0, 'standalone svg nests dependencies');
  ok(/^data:image\/svg\+xml;charset=utf-8,%3Csvg/.test(Z.Icons.dataUrl('ic-cur-bezant')) && !/['()]/.test(Z.Icons.dataUrl('ic-cur-bezant')), 'dataUrl is CSS-safe');
  eq(Z.Icons.standalone('nope'), null, 'standalone of unknown id');
  eq(Z.Icons.by.x, 1, 'by tables exported');
  eq(Z.Icons.missing[0], 'ic-nav-shield', 'missing list exported');
  ok(Z.Icons.ud.indexOf('--f1:none') >= 0 && Z.Icons.ud.indexOf('--il:none') >= 0, 'underdrawn declarations exported');

  // the real generated file must load in a bare sandbox (no window, no document) and export the whole API
  if (fs.existsSync(DIRS.out)) {
    const sb = { globalThis: null };
    sb.globalThis = sb;
    vm.createContext(sb);
    vm.runInContext(fs.readFileSync(DIRS.out, 'utf8'), sb, { filename: 'icons.js' });
    const Zr = sb.Z;
    ok(Zr && typeof Zr.ico === 'function' && Zr.ICO && Zr.Icons && typeof Zr.Icons.draw === 'function' && typeof Zr.Icons.sprite === 'string', 'icons.js exports Z.ico, Z.ICO, Z.Icons');
    eq(Zr.Icons.inject(), false, 'icons.js inject no-op');
    const attr = '<i title="' + GEM + '">x</i>';
    eq(Zr.ico(attr), attr, 'icons.js leaves attributes alone');
    for (const k of Object.keys(Zr.ICO)) ok(typeof Zr.ICO[k] === 'string', 'Z.ICO values are ids');
    const first = Zr.Icons.ids[0];
    if (first) ok(Zr.Icons.has(first) && Zr.Icons.standalone(first).indexOf('<symbol') > 0, 'icons.js first symbol resolves');
    // every drawn icon: the mapped emoji of a drawn id is swapped, an undrawn one is not
    for (const k of Object.keys(Zr.ICO)) {
      const out = Zr.ico(k + ' 1');
      if (Zr.Icons.has(Zr.ICO[k])) ok(out.indexOf('<use href="#' + Zr.ICO[k] + '"/>') > 0 && out.slice(-2) === ' 1', 'drawn id is swapped: ' + Zr.ICO[k]);
      else ok(out === k + ' 1', 'undrawn id stays emoji: ' + Zr.ICO[k]);
    }
  }
  return checks;
}

// ---------------------------------------------------------------------------------------------------------------------
function report(model, quiet) {
  const log = quiet ? () => {} : console.log;
  const drawn = model.symbols.size, aliases = model.all.size - drawn;
  log('icons: ' + drawn + ' drawn + ' + aliases + ' aliases, ' + model.catalog.size + ' in manifest (' + model.todo.length + ' still to draw), ' + Object.keys(model.map).length + ' Z.ICO keys');
  if (model.missing.length) log('map targets not drawn yet (' + model.missing.length + '): ' + model.missing.join(' '));
  for (const w of model.warnings) log('warn  ' + w);
  for (const e of model.errors) console.error('ERROR ' + e);
}

function main(argv) {
  const model = loadModel();
  if (argv.indexOf('--list') >= 0) {
    for (const ic of model.catalog.values()) console.log((model.all.has(ic.id) ? (model.symbols.has(ic.id) ? 'drawn ' : 'alias ') : '  --  ') + ic.id.padEnd(26) + ic.size + ' ' + ic.draw.padEnd(5) + ' ' + ic.motif);
    return 0;
  }
  if (argv.indexOf('--selftest') >= 0) {
    const n = selftest();
    console.log('selftest ok (' + n + ' checks)');
    return 0;
  }
  report(model, argv.indexOf('--quiet') >= 0);
  if (model.errors.length) return 1;
  const js = buildJs(model);
  if (argv.indexOf('--check') >= 0) {
    const cur = fs.existsSync(DIRS.out) ? fs.readFileSync(DIRS.out, 'utf8') : '';
    if (cur !== js) { console.error('ERROR www/js/icons.js is stale: run node scripts/build-icons.js'); return 1; }
    console.log('www/js/icons.js is up to date (' + (js.length / 1024).toFixed(1) + ' KB)');
    return 0;
  }
  fs.writeFileSync(DIRS.out, js);
  console.log('wrote ' + path.relative(ROOT, DIRS.out) + ' (' + (js.length / 1024).toFixed(1) + ' KB)');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
module.exports = { loadModel, buildJs, runtime, selftest, STYLE, STATE_UD, DIRS };
