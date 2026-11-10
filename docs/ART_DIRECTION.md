<!-- Kaynak: art-bible iş akışı (3 tasarımcı + 2 hakem + sentez). Kod dışı, sanat yönü belgesi. Uygulama sırası bölüm 11'dedir. -->
# Castle Siege: History - Style Bible v1 "The Unfinished Folio"
u = logical px of the 720-wide stage (1u = 0.50-0.57 css px). CSS baseline Chrome 87: no color-mix, no rotate property. Ornament layers always pointer-events:none. sim.js, field.js and every $t() source key stay untouched.

## 1. Concept
You illuminate a picture Bible by winning it: Morgan/Maciejowski war leaves (gold grounds, heavy iron-gall contour, stubby flat figures), Psalter of Saint Louis diapers, Matthew Paris itinerary strip. Player = host (azure + or); castle = garrison (gules + argent).

**SIGNATURE: gold leaf over red bole, earned, never decorative.** One ladder replaces every grey-out filter:
- underdrawn: dashed/pricked --ud line, no fill (35% vellum wash only on mid-light map grounds), plus lock glyph or ghost sprite: locked node, disabled button, empty star, unaffordable item, unowned unit, unwon road.
- gouache: flat pigment + ink contour: open.
- gilt: flat --orp face + bole misregistration inset 3px 3px 0: 3-star node, buy/upgrade, stars, ready skill.
Burnished gradient (--leaf-g) = ONE plate per screen (home CTA, hub coin chip, HUD gold chip, modal primary). Gold <=15% of any viewport, never a hairline (min stroke 4u).

Rules: tincture is the contrast rule (S2); vellum only for text blocks and portrait niches, list cards are saturated grounds led by the coloured miniature; quiet zones: reading blocks, battlefield ground, HUD plates; no glow, blur, vignette, bevel, sheen or shading gradient; imperfection = baked +-0.7u wobble, two-pass ink (core + 0.6u offset --ink2 at .6), unequal radii, never rotate text; per screen one rubricated initial + one bar frame; motion = manicule nudge, one burnish sweep, modal rule draw-on, off under reduced-motion.

## 2. Palette
```css
:root{--ink:#1E1610;--ink2:#4B3B2A;--night:#0F1838;--lapis:#22409A;--lapisd:#14275F;--diap:#1B2F78;--azur:#4474C0;
--verm:#D8391F;--mad:#9A2018;--mal:#1F6B4E;--vdg:#3FA58C;--orp:#E9B62A;--leaf:#D4A02F;--bole:#8C3520;--pur:#5B2E7A;
--vel:#D8D0AB;--vel2:#C6B684;--ivo:#F4ECD3;--arg:#CDD2DB;--bis:#7A5230;--flesh:#E7B99C;--ud:var(--vel2);
--leaf-g:linear-gradient(112deg,#C99A2E,#F3D879 30%,#FBE9A0 42%,#D4A02F 62%,#E9C25A);
--bg:var(--night);--panel:var(--diap);--panel2:var(--lapisd);--line:var(--ink);--txt:var(--ivo);--mut:var(--vel2);
--gold:var(--orp);--gold2:var(--leaf);--blue:var(--lapis);--purple:var(--pur);--red:#FF8A70;--green:#7FD6B8}
#stage{--hit:calc(44px/var(--s,.55))}  /* --s is inline on #stage (main.js:20): never declare --hit on :root */
.story,.slip,.rule-box,.tbl,#toast,#info-title{--gold:#6E5008;--green:#17553B;--red:#8E1F12;--mut:var(--ink2);--ud:var(--ink2);color:var(--ink)}
```
Tinctures: lapis = azure, verm = gules, mal = vert, pur = purpure, orp/leaf = or, ivo/arg = argent, ink = sable. Art-only burnish, never under text: --leaf-art linear-gradient(112deg,#8A5A10,#D8A530 18%,#FBE9A0 34%,#D4A02F 50%,#A06E18 66%,#E9C25A 82%,#8A5A10), same stops in Z.leaf().
The remap keeps legacy var(--gold|--green|--red|--mut) text in ui.js and style.css readable with zero JS edits. Sweep style.css leaks (.rbg r0-6, .wheel/WCOL, .stars .off, #gold-chip em, #obj-chip, .sim-tag/.dot, slider accent) so no Tailwind default survives.
Contrast (recomputed): ink/vel 11.5, ink2/vel 6.9, mad/vel 5.2, lapis/vel 6.0, #17553B/vel 5.6, #6E5008/vel 4.8, ivo/lapis 7.8, ivo/diap 10.3, ivo/night 14.7, orp/night 9.3, orp/diap 6.5, orp/lapis 4.9, ivo/mad 6.9, ivo/mal 5.4, ink/leaf-g >=6.9, vel2/diap 6.1.
By ground: ivo or orp on lapis, diap, night, pur, ink; ivo only on mal and mad (orp 3.4/4.3); ink on vel, arg, orp, leaf-g; --mad text only on vellum or orp at 24u+. Verm = fills, sprites, flames only (ivo/verm 3.9). No colour on colour. Text floor 22u; 30u bold is not WCAG large.

## 3. Grounds and textures
- Z.Art (www/js/art.js): tiles drawn once to canvas at 2x, exported with toDataURL to CSS vars (--dp-lapis --dp-quat --dp-gold --dp-vine --dp0..6 --grain --frame --ivy), reused via createPattern; no feTurbulence or runtime blur; boot bakes only --dp-lapis --grain --frame --ivy (<=25 ms); Z.ready waits for it and fonts.
- Diaper Z.Art.diaper(ground,lattice,dot,seed): 3x3 super-tile of 48u lozenges (outline 2.5u, inner lozenge, dot r2.6), motifs jittered +-0.8u, 1 in 9 rotated +-1.5 deg, centre lozenge counterchanged to --mad at .55. --dp-lapis #1B2F78/#2F52B0/#E9B62A (hub, modal, #hub-top, #tabs, #boot); --dp-quat 56u quatrefoil #9A2018/#B8382A/#E9B62A (packs, result); --dp-gold 24u #D4A02F, ring #8A5A10 r4, dot #FBE9A0 (horizon band, niche, cartouche); --dp-vine 40u #1F6B4E/#2E8764/#E9B62A (quests); chequy 24u conic-gradient (enemy verm/ivo, host lapis/orp).
- --frame (modal 22u, baked 2x, border-image slice 44): ink 3 | lapis 8 | ink 2 | leaf-art 6 | ink 3, ivy bud every 44u, quatrefoil corners; --ivy 36u: ink stem, malachite 3-lobe leaves, orp berries. Vellum = --vel + --grain (192px, sepia alpha 0-.09, 9 follicle dots) + ruling on prose blocks only (line-height 34px) + 3 foxing spots; no vignette.
- Realm grounds are mid-light: azure units 3.4-4.7:1, ink contour 6.5-9.1:1, --ink2 underdrawing 3.9-5.5:1 on all seven. --dp0..6 = ground/lattice (dot = lattice); node field+numeral; 46u blazon:
R0 W. Europe #8DAA6B/#7C9A5B; lapis+ivo; azure fleur-de-lis or. R1 Holy Lands #D2B070/#C29E5C; #E0AE36+ink; Jerusalem cross or on argent (tincture breach tolerated). R2 Northern #A9BBD0/#95AAC4; arg+ink; cross sable on argent. R3 Mediterranean #8CBBAA/#79A898; mad+ivo; Maltese cross argent on gules. R4 Low Countries #A8B07A/#979F69; mal+ivo; bendy or/azure, bordure gules. R5 Asia #A99AB5/#9888A6; pur+ivo; sun in splendour or on azure. R6 Anatolia/Balkans #8E9CBF/#7D8CB0; ink+orp; crescent or on vert.

## 4. Typography
OFL woff2. Rub = Texturina 700 latin+latin-ext (37.1 KB), 22-62u: logo, .modal h1, .btn, .hbig, .tab, chips, .c-name (lining-nums only on Rub; EB Garamond digits are already lining). Top = Pirata One 400 (15.2 KB): .realm b, .sect, versals, <=3 words, Title Case. Hand = EB Garamond 600 declared font-weight:400 800, latin+latin-ext+cyrillic (103.9 KB): body 26u/34u, captions 24u.
```css
:root{--f-rub:Rub,Hand,"Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif;--f-top:Top,Hand,"Noto Serif CJK SC",serif;--f-body:Hand,"Noto Serif CJK SC","Source Han Serif SC","Songti SC",serif;font-synthesis:none}
body{font:600 26px/1.3 var(--f-body)}:lang(zh){letter-spacing:0}   /* font-display:block; no CJK bundle; ru falls back to Hand */
```
- Numerals: live counters and combat numbers (#gold-val, .c-cost, damage, HP, timers, rewards) stay system-ui 800 tabular-nums (theme.css:65 rule minus .node .nn); static plate numerals (.node .nn, level badges) EB Garamond 700. Never Texturina digits (oldstyle, proportional).
- Async boot: Promise.race([Promise.all(specs.map(s=>document.fonts.load(s,SAMPLE[lang]).catch(()=>0))),1500 ms]), SAMPLE tr "ĞİŞığş", ru "Жщя" (load() defaults to " " and fetches only Latin); canvas font 700 54px Rub,Hand,serif; then Z.Art bake, then Z.ready.
- 156 KB (+1.7% APK). Remove Almendra; ship 3 OFL texts; list every font, OFL, js/art.js, js/icons.js in index.html AND sw.js ASSETS. Gate before wiring: scale-0.5 specimen of "Castle Siege: History", Normal/Hard/Legend, Heal/Hero, longest ru/es/pt tab and button labels at 22-30u; e2e-v08 overflow in 6 languages.
- Rubric --mad only inside vellum (<b>, .rule-box b, drop cap); .sect = Pirata One 36u --orp over the --ivy bar; no text-transform on .modal h1. Drop cap on .story.dc only (text >45 chars): 2.2em Pirata One --mad on an --orp square, 3u ink border, display:flow-root; remove the leading scroll glyph from .story (ui.js:281); :lang(zh) reset; test İ, Ş, Cyrillic initials.

## 5. Components (rewrite theme.css; style.css gets only the leak sweep)
```css
.panel,.ucard,.pack,.offer,.quest,.ach,.perk{--dp:none;background:var(--dp) 0 0/144px,var(--card,var(--lapisd));color:var(--ivo);border:3px solid var(--ink);border-radius:3px 9px 4px 8px/8px 4px 9px 3px;box-shadow:0 5px 0 var(--ink)}
.ucard{--card:var(--lapis);--dp:var(--dp-lapis)}.quest,.ach{--card:var(--mal);--dp:var(--dp-vine)}.pack,.offer{--card:var(--mad);--dp:var(--dp-quat)}.perk{--card:var(--pur)}
.panel::before,.btn::after,.hbig::after{display:none}
.niche{background:var(--dp-gold) 0 0/24px;border:3px solid var(--ink);border-radius:50% 50% 4px 4px/42% 42% 4px 4px}
.story,.slip,.rule-box,.tbl,#toast,#info-title{background:var(--grain) 0 0/96px,var(--vel);border:3px solid var(--ink);border-radius:2px 9px 3px 8px}
.story{display:flow-root;font:600 26px/34px var(--f-body);padding:14px 18px;background:repeating-linear-gradient(0deg,#0000 0 33px,rgba(30,22,16,.14) 33px 34px),var(--grain) 0 0/96px,var(--vel)}
.story.dc::first-letter{float:left;font:400 2.2em/.8 var(--f-top);color:var(--mad);background:var(--orp);border:3px solid var(--ink);padding:6px 10px 0;margin:2px 10px 0 0}
.story:lang(zh)::first-letter{float:none;font:inherit;color:inherit;background:none;border:0;padding:0;margin:0}
.btn{font:700 30px/1 var(--f-rub);color:var(--ivo);background:var(--lapis);min-height:max(64px,var(--hit));border:3px solid var(--ink);border-radius:3px 8px 4px 7px/7px 4px 8px 3px;box-shadow:0 5px 0 var(--ink)}
.btn.gold,.daily-card{background:var(--orp);color:var(--ink);box-shadow:inset 3px 3px 0 var(--bole),0 5px 0 var(--ink)}
.curr,.hbtn,.fbtn,#rule-chip,#obj-chip,#combo-chip,#hint,#perk-row i,#gold-chip{background:var(--night);color:var(--ivo);border:3px solid var(--ink);border-radius:3px 9px 3px 9px;box-shadow:0 4px 0 var(--ink)}
.hbig,.modal .actions .btn.gold:last-of-type,#hub-top .curr:not(.plus),#gold-chip{background:var(--leaf-g);color:var(--ink);box-shadow:inset 3px 3px 0 var(--bole),0 5px 0 var(--ink)}
.btn.red{background:var(--mad)}.btn.green{background:var(--mal)}.btn:active{transform:translateY(4px);box-shadow:none}
.btn[disabled],.btn.off{background:none;color:var(--ud);border:3px dashed var(--ud);box-shadow:none;filter:none}
.modal{background:var(--dp-lapis) 0 0/144px,var(--diap);color:var(--ivo);border:22px solid transparent;border-image:var(--frame) 44/22px round;box-shadow:none}.modal::before{display:none}
.modal h1{font:700 46px/1.05 var(--f-rub);color:var(--ivo);text-shadow:0 3px 0 var(--ink)}
.node{--nf:var(--lapis);--nc:var(--ivo);--rim:0 0 0 0 #0000;--sh:0 5px 0 var(--ink);width:88px;height:96px;background:none;border:0;box-shadow:none;color:var(--nc)}
.node::before{content:"";position:absolute;inset:8px 0 0;border-radius:50%;background:var(--nf);border:4px var(--bs,solid) var(--bc,var(--ink));box-shadow:var(--rim),var(--sh)}
.node>*{position:relative}.node.fld::before{inset:21px 13px 13px;border-radius:0;transform:rotate(45deg)}.maptrack{--ud:var(--ink2)}
.node.r1{--nf:#E0AE36;--nc:var(--ink)}.node.r2{--nf:var(--arg);--nc:var(--ink)}.node.r3{--nf:var(--mad)}.node.r4{--nf:var(--mal)}.node.r5{--nf:var(--pur)}.node.r6{--nf:var(--ink);--nc:var(--orp)}
.node.done{--rim:inset 0 0 0 4px var(--nf),inset 0 0 0 8px var(--orp)}.node.s3{--nf:var(--orp);--nc:var(--ink);--rim:inset 3px 3px 0 var(--bole)}
.node.locked{--nf:rgba(216,208,171,.35);--nc:var(--ud);--bs:dashed;--bc:var(--ud);--sh:0 0 0 0 #0000}
.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);pointer-events:none}
.hbtn,.round,#btn-home,#home-settings,.fbtn,.btn.small,.diff,.lang-btn,.bchip,.smile .btn,.ach .btn,.tab{min-width:var(--hit);min-height:var(--hit)}input[type=range]{height:var(--hit);accent-color:var(--lapis)}
```
- #hub-top and #tabs: --dp-lapis over --night, 4u --orp edge + 3u ink; .tab Rub 22u ivory, active = flat gilt. .badge = --mad plate, ivory 22u (.fld lapis). Battle cards: night plate, arch radius 46% 46% 6px 6px/22% 22% 6px 6px, vellum arched niche for the sprite; .poor = dashed --ud border + 50% night veil + cost #FF8A70 (never transparent over the canvas); ready skill = one translateX sweep, no box-shadow keyframes. Army .big = gold niche; vellum slips only for reward lines.
- HUD top row at s=0.5 (720u): 14 | pause 88 | speed 88 | auto 88 | gold chip 256, two lines (value 34u; cap + rate 22u; field "command points" label ellipsises, value never truncated) | Mine 140x88 | 14, gaps 8; shift #hud-info, #perk-row, #hint down 24u; verify ru and zh at 360x640 and 412x915.
- Language chooser: plaque with a 2-letter code from CSS content:attr(data-code) (CSS-only, so i18n-audit passes; data-code set at ui.js:643) + native name text (existing Z.LANGS names), 84u min height; active = orp inset ring + tick; no flags (drop Z.LANGS[].flag reads, ui.js:629,643).
- Footer: delete the br and $t("Tüm grafik ve sesler kodla üretilmiştir.") at ui.js:635; scripts/i18n.js only reports stale pack keys, so CI stays green.

## 6. Icon system and runtime swap
- Emoji stay in data.js and $t() keys: translate first, replace after lookup; never run Z.ico over [data-i18n] nodes. www/js/icons.js injects ONE inline sprite (ids ic-<set>-<name>; the 12 old i-* ids stay as symbol aliases of the new art for the 20 index.html refs), exports Z.ICO (91 whitelisted code points; VS16/ZWJ/flag pairs consumed whole, brackets and arrow untouched) and Z.ico(str) returning <svg class="i" aria-hidden="true"><use href="#id"/></svg>; .i = {width:1em;height:1em;display:inline-block;vertical-align:-.14em;overflow:visible}.
- Accessors for data-driven sites: UI.heroIco(id) (lion, helm, dragon glyphs map to hero shields; bolt and snowflake stay generic for boosters); realm/decor arrays (ui.js:190-191) emit symbol or motif ids; units and the drag ghost use the cached UI.unitImg sprite.
- Sinks: UI.modal, the 5 renderHub strings, #chest-area, #tut-text, hudBuild/fieldHudUpdate/hudUpdate templates, monetize-providers.js:11. Text sinks (UI.toast, #obj-chip, #combo-chip, #info-title, #rule-chip, #hint, #skill-ico, #hb-main, #hb-sub) use UI.setIco(el,str) = escape + innerHTML. Hand-edit the 9 static glyphs in index.html (hand = manicule); canvas triangles (render.js:479, fieldrender.js:114) = Path2D with ink outline.
- Test twin, no test edits: only #info-title (hourglass), #rule-chip (fire), #skill-ico (hero glyph) get <span class="vh" aria-hidden="true">GLYPH</span>, glyph only, no Latin letters. Keep #perk-row icons as <i> (e2e-v02:48).
- No production MutationObserver. tests/art-audit.js visits every screen and fails on: any of the 91 code points outside .vh; a tap box under 44 css px at 360x640 or 390x844; a token pair under S2; gold-hue pixels over 15%.

## 7. Battlefield
Sprites (hooks: outline/OUT/fe, end of renderSprite + fieldrender.js:182, mgrad, PAL):
- Ink: opaque --ink; 2.6u contour by 8-offset dilation at bake; 1.6u inner strokes; fe() stroke-then-fill; figure >=3u inside the 92x120 box.
- Halo: 2u vellum at alpha <=.45 (under the alpha>150 crop) on every realm; 3 ink ground ticks replace shadow ellipses (render.js:861-862). R.icoMode (UI.unitImg, drag ghost) skips both; UI.unitImg(cls,team,"ghost") = baked --ink2 silhouette at .45 for unowned units.
- Fill: flat gouache; mgrad() = flat base + hard shade crescent + ivory tick; radial glows = two flat discs; heads x1.15, hands/feet x1.2.
- PAL (delete duplicates fieldrender.js:294/298): host main #22409A dark #14275F light #4474C0 trim #E9B62A metal #E3E7EE metalD #7E889D cloth #14275F; garrison main #D8391F dark #8E1F12 light #F0705A trim #F4ECD3 metal #8B94A8 metalD #4A5368 cloth #8E1F12. Not colour-only: host flat-top great helm or kettle hat + kite shield; garrison conical nasal helm + round shield, no horns; healer, catapult, golem get team marks.
- device(c,kind,x,y,r,pal,team) counter-flips for team 1 (render.js:894 flips it): host cross pattee or, garrison saltire argent; on tabards, dBanner flag, dCav caparison.
- HP = flat ink ribbons (3u border, ally --mal, enemy --verm), no per-frame gradients (render.js:715-731, 914-920; fieldrender.js:267-273). Damage text system-ui 900, ink stroke 6u: dealt #F4ECD3, crit #E9B62A, taken #FF8A70, heal #7FD6B8. Banner = swallow-tail banderole, ink text.
Castle: ashlar #B9AE98, 6 ink courses not ~108 bricks, 3u contour; fish-scale cones in --verm with orp ball replace the pinwheel; gonfanons gules + argent saltire; gates #5A3A22, ink portcullis, orp keystone; moat --azur + ivory wavy bands. Camp (yurts and tug out): azure/ivory pavilions with orp finials, bister palisade, standard in the gate.
Cache: bake castle and camp lazily, keyed [team][tier <.3/<.6/full per render.js:635,704,710][moat], evict the previous tier, invalidate on R.resize only (the home demo restarts every ~2.8 s); handle the camp mirrored transform (render.js:615-618). No ctx.filter.
Scenery, staged: delete lightGrade shafts, dapple, fog, vignette, soft-light grade; then groundLayer = flat realm ground + canvas diaper pattern .10 + <=400 ink tufts; lanes #E3CFA0 with 3u ink edges; trees = bister trunk + 3 lobed #3F8F5A clumps + ink contour via the *Sprite fns; horizon = --dp-gold band (top 150u corridor, 110u field), no sky gradient, sun, cloud, fog or shaft. Both fallback builders (render.js:127-295, fieldrender.js:49-161) call the same flat helpers; no getImageData posterise.
Frame: R.ovl baked 9-slice (ink 3 | leaf-art 6 | ink 3 = 12u, ivy sprig every 56u, orp studs r12u), one drawImage per frame (render.js 528/529; fieldrender.js 438/439); no DOM vignette. #info-title = vellum cartouche; #skill-ico = hero shield on --pur.

## 8. Map, briefing, result, home
Map (ui.js:190-218 structure kept: 7 .rbg, 7 .realm, >=90 .dec, .flagmark, 105 .node as direct <button> children, 42 .fld; no content-visibility or per-element filters):
- .rbg = realm ground + --dp0..6; .realm = flat-orpiment cartouche (--dp-gold) with 46u blazon and "Diyar n" in Pirata One 36u --mad.
- Road (ui.js:202-204): full path = .rd-dash only (pricked --ink2 dots); won stretch (pts.slice(0,upto)) = .rd-edge ink 30u + .rd-bole 20u + .rd-done orp 12u.
- Nodes per S5: roundel (castle), lozenge (field), boss = roundel x1.25 with double ink ring; .ty tower/pavilion/crown; s1/s2/s3 class added at ui.js:207; .st = orp mullets (empty = ink outline); .rl rule roundel 36u; .flagmark = verm+orp pennon, manicule nudging the current node.
- 112 .dec become <span class="dec m-oak" style="font-size:.."> with .dec{width:1em;height:1em;background:var(--m) center/contain no-repeat}; time renderMap with performance.now() before and after.
Briefing: blazon + h1 + .badge; .story.dc; .diff = 3 seal tablets (locked = underdrawn + lock); .rule-box = vellum slip, --mad left bar; .big-stars = 3 orp mullets; .bchip = mini shields; enemy frieze on chequy verm/ivo, own deck on chequy lapis/orp; Back + Army lapis, START = burnished plate.
Result: victory = banderole title, stars stamp in (clip-path wipe), lapis coffer (two-frame swap); defeat = underdrawn modal, vellum + ink, gold withdrawn.
Home: .tug slot = gilt lance + three-tail gonfanon (verm, lapis, arg) keeping .tails paths and sway; .hl-name Rub 62u ivory on a night plate; opaque --diap page-foot behind the buttons replaces gradient scrims; CTA = burnished plate. Seed the store-screenshot save (cleared ~29, 2-3 stars) so most visible nodes are painted.

## 9. Key art and native
- App icon (adaptive 108dp): background raster --dp-lapis diaper; foreground gold-leaf Lombardic C (--leaf-art, 3dp ink contour, thick/thin 3:2, thinnest stroke >=5dp, bar serifs), diameter <=60dp inside the 66dp safe circle, counter --verm holding an argent tower (ink contour, >=70% of counter height, no pennon) so it reads at 48 px; <monochrome> = C + tower in both adaptive XMLs. All icon PNGs (incl. full-bleed icon-512, maskable, legacy) share the art; keep icon-192/512/maskable-512/apple-touch filenames. Render via Playwright; check 48/72/192 px.
- Splash: delete the 11 drawable*/splash.png; add drawable/splash.xml layer-list (solid #0F1838 + centred WebP emblem, 34% of short side) and values-v31 windowSplashScreenBackground #0F1838 + windowSplashScreenAnimatedIcon; verify API 24, 30, 33. #0F1838 is also the first-frame colour in capacitor.config.json, manifest background/theme, index.html theme-color, #boot, ic_launcher_background.xml; #boot = night + C emblem whose ink outline draws on (static under reduced-motion).
- Feature graphic 1024x500 JPEG q92, no alpha, key content x130-900: --dp-lapis ground, 12u frame; left Texturina 700 title with Lombardic C versal + "105 real sieges" banderole; right --dp-gold horizon, castle, host frieze from game sprites (px=6), paint-front: left third underdrawing (edge-detected --ink2 on vellum) blending to colour by x=70%.
- Screenshots 1080x1920 JPEG q90, no alpha, x6: 0-300 caption band (--dp-lapis + --mad banderole, Texturina 700 74px ivory, ink stroke 6px, <=3 words, 6 locales via store/build-listing.py), live capture scaled .811 at x102 in an 18px ink|gold frame. EN: 105 real sieges / Read the siege / Break the walls / Take the field / Raise your host / Daily deeds. Fonts as base64 data: URIs (file:// fonts fail on about:blank pages); zh system CJK, ru embedded EB Garamond. Run last; every asset in sw.js ASSETS.

## 10. Twelve AI tells and their fixes
1 emoji: heraldic symbols. 2 Lucide strokes: gouache + ink. 3 Tailwind defaults: tokens. 4 cream parchment + serif + terracotta + gold hairline: lapis diaper page, vellum only in text blocks, saturated list grounds. 5 fantasy fonts: Texturina, Pirata One, EB Garamond. 6 gloss, glow, vignette: matte, one burnished plate. 7 perfect geometry: unequal radii, jittered tiles. 8 photoreal scenery: flat ground, gold horizon. 9 radial-gradient sprites: flat + ink. 10 pinwheel roofs, empty crests: scaled cones, true blazons. 11 biome emoji decor: period flora. 12 generated-by-code footer, template store art: footer deleted, paint-front art.

## 11. Implementation order and gates
After every phase: node scripts/i18n.js check, tests/i18n-audit.js, e2e-v08 (overflow selectors extended to #hud .hbtn, .card .c-name, #rule-chip, #hint, .fbtn, .lang-btn, modal buttons; 6 languages), monkey.js, pwa-check.
1 Foundations: fonts, async boot, sw.js/index.html lists; tokens, aliases, vellum remap; theme.css rewrite + style.css sweep; --hit + HUD top row; footer deleted.
2 Z.Art + icons P1/P2 (sinks, twins, accessors), whole screens at a time (mixed emoji/SVG is worse than either). Gates: e2e-v02:48, v03:55, v04:52, v09:25-28 unedited; art-audit; renderMap time.
3 Screens + P3 icons. Gates: e2e-v06 (.node offsetTop, .realm.r6), smoke:78, i18n-audit.
4 Sprites + P4 icons. Gates: tests/gallery.js 7 realms x 2 teams x 11 classes (azure body vs ground >=3:1, ink contour >=6:1, halo, castle contour); tests/perf.js 60 units frame ms <= today.
5 Castle/camp bake, scenery, frame, HUD skin, fallbacks. Gates: e2e-v10 (<400 ms x 7 themes, no scenery warn, R.buildBgBasic), e2e-v07, perf.js.
6 Native + store art last (live screenshots). Gates: pwa-check, API 31+ splash, 6 locales.

## 12. Icon manifest outline (fan out one agent per family)
Construction, all families: symbol ic-<set>-<name>, viewBox 0 0 32 32, 28u live area; layers: ink outer contour (stroke-width 4, paint-order stroke), flat token fills (3 + ink max, rule of tincture), one hard shade shape bottom-right, one charge, ivory tick 1.5u top-left, gold only for precious things. Seeded 0.4u wobble; no filters, gradients, opacity or stroke-only art; fills style="fill:var(--c1,#hex)" so states recolour (underdrawn: --c1..3:none, stroke var(--ud) dashed). Containers (nested use): ct-shield heater 3:4, ct-round, ct-loz, ct-quat. Sizes S 28u (no shade/tick, stroke >=1.75u), M 44-64u, L 96-128u; animals only M>=56u and L (S = flat silhouette). Gate: Playwright contact sheet at 24/32/44/64/96u on vellum, lapis, night and three realm grounds before wiring. Phases: P1 containers + 14 charges (cross pattee, saltire, roundel, six-point mullet, fleur-de-lis, tower, great helm, garb, bugle, hourglass, bezant, cabochon, heater shield, crescent); P2 cur, nav, act, status, rule, perk; P3 hero, realm, cls; P4 drolleries, marginalia.
1 cur (12): bezant (orp disc, beaded rim, cross pattee), cabochon (vdg gem, orp quatrefoil collet), purse, coffer (lapis, iron straps; open variant), rota fortunae, crown, chalice, medal, framed miniature + play triangle (ads), mullet (empty = outline).
2 nav (the 12 old i-* ids, filled): crossed swords, heater shield, purse, coffer, scroll, itinerary map, codex page, interlace knot, cog, chevron, bezant, cabochon.
3 act (~22, vel roundel): pause, speed, auto (loop arrow), pickaxe, dice, ink cross (clear, quit), swords, heater shield, manicule, lock hasp, card, lane road, speaker, drum, buzz, scroll arrows (export, import, copy), restore, slashed roundel (no ads), candle, T-O map roundel (language), target, play.
4 rule (18, ct-round on night, 4u orp ring): rich purse; swift wind-curls; heavy heater shield; ambush dagger; famine garb; rally bugle; fortress tower; survive hourglass; moat barry wavy; relief crossed pennoned lances. Tiers swords/flame/skull; objectives crown/pennon/hourglass; battle type tower/pavilion.
5 hero (5, ct-shield, S/L variants): aslan gules, lion face or; yildiz purpure, six-point estoile or + ink bolt; demir sable, great helm argent; buz argent, eight-spoke escarbuncle azure; ejder vert, dragon head or. Owned = orp bordure; unowned = underdrawn.
6 realm (7, ct-round 46u): S3 blazons. Map decor = CSS motif tiles, six per realm from oak, pine, olive, date palm, cypress, willow, windmill, poppy, rock pile, reed tuft, snowy fir; no cactus, snowman, frog, mushroom.
7 status (~12): hand-inked tick and cross, restart arrow, verm ivy-heart (HP), orp up arrowhead (upgrade), hourglass, flame, snow mullet, new seal.
8 cls: portraits = sprites (UI.unitImg, ghost, R.icoMode); hint-key glyphs: spearhead, pennoned lance, bow + arrow. 9 perk/booster (~10, ct-round): bezants, cuirass, sword, hourglass, pavilion, arrow, ivy leaf, coffer, estoile, bolt.
10 mar: ivy bar 36u, frame 22u, quatrefoil corner, line-filler (lapis/verm 16u bars), manicule, pilcrow and roman numerals via CSS content only, 4 drolleries at L only (hare with lance, snail, ape herald, drake), pointer-events none, <=1 per viewport, map only.

### Critical Files for Implementation
- /home/user/erenmaral/www/css/theme.css
- /home/user/erenmaral/www/js/render.js
- /home/user/erenmaral/www/js/ui.js
- /home/user/erenmaral/www/js/scenery.js
- /home/user/erenmaral/www/index.html