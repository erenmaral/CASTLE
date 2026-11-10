// Icon contact sheet: every symbol in art/icons/src/*.svg (+ manifest aliases) at several css sizes on vellum, lapis,
// night and the three mid-light realm grounds, with id labels - judge legibility at small sizes before wiring anything.
//   node tests/icon-sheet.js <out.png> [id-prefix] [--sizes=24,32,44,64,96] [--dpr=1] [--ud] [--only=id1,id2] [--bbox]
// Examples: node tests/icon-sheet.js /tmp/sheet.png ic-chg      node tests/icon-sheet.js /tmp/ct.png ct- --dpr=2
// --ud adds the "underdrawn" state (tokens none, dashed --ud contour) on vellum and lapis. --bbox prints every fill bbox + centre;
// strays outside the 28u live area are always reported. The sheet applies the legacy
// `.i{fill:none;stroke:currentColor}` rule of the current theme.css on purpose: every shape must set its own paint.
// One Chromium, closed in finally. Not part of the e2e suites.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { loadModel, runtime, STYLE, STATE_UD } = require('../scripts/build-icons.js');

const GROUNDS = [
  { name: 'vellum', bg: '#D8D0AB', fg: '#1E1610', ud: '#4B3B2A' },
  { name: 'lapis', bg: '#22409A', fg: '#F4ECD3', ud: '#C6B684' },
  { name: 'night', bg: '#0F1838', fg: '#F4ECD3', ud: '#C6B684' },
  { name: 'realm0 #8DAA6B', bg: '#8DAA6B', fg: '#1E1610', ud: '#4B3B2A' },
  { name: 'realm1 #D2B070', bg: '#D2B070', fg: '#1E1610', ud: '#4B3B2A' },
  { name: 'realm2 #A9BBD0', bg: '#A9BBD0', fg: '#1E1610', ud: '#4B3B2A' }
];

function parseArgs(argv) {
  const pos = [], opt = {};
  for (const a of argv) {
    const m = /^--([a-z]+)(?:=(.*))?$/.exec(a);
    if (m) opt[m[1]] = m[2] === undefined ? true : m[2]; else pos.push(a);
  }
  return { out: pos[0], prefix: pos[1] || '', opt };
}

(async () => {
  const { out, prefix, opt } = parseArgs(process.argv.slice(2));
  if (!out) { console.error('usage: node tests/icon-sheet.js <out.png> [id-prefix] [--sizes=24,32,44,64,96] [--dpr=1] [--ud] [--bbox] [--only=a,b]'); process.exit(2); }
  const sizes = String(opt.sizes || '24,32,44,64,96').split(',').map(Number).filter(n => n > 0);
  const dpr = Number(opt.dpr) || 1;
  const model = loadModel();
  for (const e of model.errors) console.error('ERROR ' + e);
  if (model.errors.length) process.exit(1);

  const sym = {};
  for (const [id, s] of model.all) sym[id] = s.markup;
  const Z = {};
  runtime(Z, { style: STYLE, ud: STATE_UD, sym, map: {}, by: {}, missing: [] });

  const only = opt.only ? String(opt.only).split(',') : null;
  const ids = Z.Icons.ids.filter(id => id.indexOf(prefix) === 0 && (!only || only.indexOf(id) >= 0));
  if (!ids.length) { console.error('no symbols match prefix ' + JSON.stringify(prefix)); process.exit(1); }

  const cols = GROUNDS.map(g => ({ g, ud: false }));
  if (opt.ud) cols.push({ g: GROUNDS[0], ud: true }, { g: GROUNDS[1], ud: true });
  const rowH = Math.max.apply(null, sizes) + 14;
  const cellW = sizes.reduce((a, b) => a + b, 0) + 10 * (sizes.length - 1) + 20;
  const cell = (c, id) => '<div class="cell' + (c.ud ? ' udc' : '') + '" style="background:' + c.g.bg + ';color:' + c.g.fg + ';height:' + rowH + 'px;--ud:' + c.g.ud + '">' +
    sizes.map(s => '<svg class="i' + (c.ud ? ' ud' : '') + '" style="width:' + s + 'px;height:' + s + 'px"><use href="#' + id + '"/></svg>').join('') + '</div>';
  const head = '<div class="row hd"><div class="lab"></div>' + cols.map(c => '<div class="cell hc" style="background:' + c.g.bg + ';color:' + c.g.fg + '">' + c.g.name + (c.ud ? ' underdrawn' : '') + '<br>' + sizes.join(' / ') + '</div>').join('') + '</div>';
  const rows = ids.map(id => '<div class="row"><div class="lab">' + id + '</div>' + cols.map(c => cell(c, id)).join('') + '</div>').join('');
  const html = '<!doctype html><meta charset="utf-8"><body>' + Z.Icons.sprite +
    '<style>:root{--ink:#1E1610;--ink2:#4B3B2A;--vel2:#C6B684}body{margin:0;background:#efe9d2;font:11px/1.2 ui-monospace,Menlo,Consolas,monospace;color:#1E1610;width:max-content}' +
    '.i{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;display:block;overflow:visible;flex:none}' +
    '.row{display:flex;border-bottom:1px solid #8a8266}.lab{width:176px;padding:6px 8px;box-sizing:border-box;flex:none;display:flex;align-items:center;word-break:break-all}' +
    '.cell{display:flex;align-items:center;justify-content:center;gap:10px;padding:0 10px;box-sizing:border-box;width:' + cellW + 'px;border-left:1px solid #1E161033}' +
    '.hc{height:auto!important;padding:6px;text-align:center;display:block}.hd .lab{font-weight:700}' +
    '.ud{' + STATE_UD + '}</style>' + head + rows + '</body>';

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 2400, height: 800 }, deviceScaleFactor: dpr });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent(html);
    await page.waitForTimeout(150);
    const w = await page.evaluate(() => Math.ceil(document.body.scrollWidth));
    await page.setViewportSize({ width: w, height: 800 });
    // live area: the fill geometry must stay inside 4..28 (the 4u ink contour then ends inside 2..30); report strays and off-centre art
    const boxes = await page.evaluate(list => list.map(id => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
      use.setAttribute('href', '#' + id); use.setAttribute('width', '32'); use.setAttribute('height', '32');
      svg.appendChild(use); document.body.appendChild(svg);
      const b = use.getBBox(); document.body.removeChild(svg);
      return [id, b.x, b.y, b.x + b.width, b.y + b.height];
    }), ids);
    const stray = boxes.filter(b => b[1] < 3.65 || b[2] < 3.65 || b[3] > 28.35 || b[4] > 28.35);
    for (const b of stray) console.log('live-area: ' + b[0] + ' fill bbox ' + b.slice(1).map(v => v.toFixed(1)).join(',') + ' leaves 4..28 (ink would pass 2..30)');
    if (opt.bbox) for (const b of boxes) console.log('bbox ' + b[0].padEnd(24) + b.slice(1).map(v => v.toFixed(1).padStart(5)).join(' ') + '  centre ' + ((b[1] + b[3]) / 2).toFixed(1) + ',' + ((b[2] + b[4]) / 2).toFixed(1));
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    await page.screenshot({ path: out, fullPage: true });
    console.log('wrote ' + out + ' (' + ids.length + ' icons x ' + cols.length + ' grounds, sizes ' + sizes.join('/') + ', dpr ' + dpr + ')');
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
