# Sefer Vakti — İçerik Ekleme Rehberi

Oyun veri odaklıdır: çoğu içerik `www/js/data.js` içindeki tablolara satır eklemekle gelir.
Her değişiklikten sonra **şu üç komutu** çalıştır; veri bozuksa ilk ikisi yakalar:

```bash
node tests/unit-features.js        # mantık + VERİ TUTARLILIĞI testleri
node tests/sim-balance.js 8        # denge botu (genel kazanma oranı ~%60-70 olmalı)
node tests/gallery.js              # görsel galeri (ekran görüntüsü) — yeni sprite/diyar için
```

## Yeni birlik ekleme
1. `data.js` → `Z.UNITS` içine satır ekle (`id, name, icon, cls, hp, dmg, int, range, speed, cost, cd, desc`).
2. Aynı dosyada: `Z.UNIT_ORDER` (sona ekle), `Z.UNLOCK_AT` (kaç bölüm kazanınca açılır), `Z.COUNTER` (yapay zekâ bu sınıfa karşı ne çağırsın), gerekirse `Z.BONUS` (saldırgan sınıf → hasar çarpanı).
3. Düşman ne zaman kullansın? → `Z.levelInfo` içindeki `tiers.push(...)` satırları (ve sonsuz mod için `sim.js` `P.tiers`).
4. **Çizim:** `render.js` → `dXxx(c, pal, team, walk, lunge/atk, t)` fonksiyonu yaz, `renderSprite` içindeki `switch (cls)`'e ekle, `drawUnit` içindeki `ext` tablosuna can çubuğu yüksekliğini ekle.
   - Sprite'lar **yukarı bakar** (ön = −y), orijin birliğin zemin noktasıdır; sınır kutusu x∈[−46,46], y∈[−74,46].
   - Çizgi yardımcısı `line()` kontur ayarını korur; başka `strokeStyle` değiştirirsen sonra `outline(c)` çağır.
   - Animasyon `t` değerlerinde **tam sayı çarpanlar** kullan (`sin(t*4)`), yoksa önbellek döngüsü sıçrar.
5. Özel mekanik gerekiyorsa `sim.js`: `spawn()` içinde bayrak ekle (`assassin`, `splash`, `flame` gibi), `stepUnit`/`attack`'ta davranışı yaz.
6. `tests/unit-features.js` içine mekanik testi ekle (kule menzilinden uzak durmak için birimleri x>600'e koy).

## Yeni kahraman
`Z.HEROES` + `Z.HERO_ORDER`; yetenek tipi için `sim.js` `useSkill` içinde `if (hero.type === '…')` bloğu, görsel/ses için `render.js` `case 'skill'` ve `audio.js` `skill()`.

## Yeni diyar (15 bölüm)
1. `Z.REALMS`'e ad ekle; `Z.MAX_LEVEL`'i 15 artır; `Z.LEVEL_NAMES` ve `Z.STORIES`'e **15'er** satır ekle (test sayıyı kontrol eder).
2. `render.js` → `THEMES` dizisine tema ekle (`kind`, renkler, `amb`: atmosfer). `drawTree` içine yeni `kind` dalı, `buildBg` içindeki `T.kind` dallarına (gölet, yol kenarı, çalı) ekleme yap.
3. `style.css` → `.node.rN` düğüm rengi (N = diyar sırası).
4. **Dengeyi ölç:** `LMIN=<ilkBölüm> node tests/sim-balance.js 6 -2` — hedef ~%40-60. `Z.levelInfo` içindeki `scale` ve `aiRate` eğrilerini ayarla (düşman geliri oyuncunun azami gelirini ~27 geçmesin).

## Açık alan (serbest meydan) savaşları
- Hangi bölümün hangi türde olduğu `Z.levelType(n)` içinde (`data.js`): şu an `n % 5` ∈ {3,4} → açık alan. Hedef: `Z.fieldObjective` (komutan / bayrak / dayanma). Yerleştirme bütçesi: `Z.fieldBudget(n)`.
- Simülasyon `www/js/field.js` (`Z.FieldBattle`, DOM'suz, Node'da test edilir), çizim `www/js/fieldrender.js`. Harita `Z.fieldMap(level, objective)`; bölüm numarasından tohumlanır, aynı bölüm hep aynı haritadır.
- Yeni arazi türü eklemek: `fieldMap` içinde üret → `terrainAt`/`stepUnit`/`damage` içinde etkisini tanımla → `R.fieldBuildBg` içinde çiz → `tests/unit-features.js`'e test ekle.
- Denge: `ENEMY_BUDGET`, `HPX` ve `late` çarpanı `field.js` başında; `node tests/field-balance.js 8` hedef ≈ %65–75 kazanma. Savaşlar ~45–70 sn sürmelidir.
- Yeni birim eklerken ayrıca bir şey gerekmez: açık alan, `Z.UNITS` içindeki sınıfı (`cls`, `ranged`, `splash`, `flame`, `assassin` …) olduğu gibi kullanır; yalnızca `render.js` içinde sprite çizimi eklemen yeterli.

## Görevler ve başarımlar
- Günlük görevler `Z.QUEST_POOL`, haftalık görevler `Z.WEEKLY_POOL` (kimlikleri `w_` ile başlar). Her görev bir **sayaca** (`stat`) bağlıdır; sayaçlar `Z.settleBattle` ve `Save.track` içinde artar. Yeni sayaç eklemek için `settleBattle`'da `S.track('ad', n)` çağır ve `tests/unit-v06.js` içindeki geçerli sayaç listesine ekle.
- Günlük sayı `Z.DAILY_QUEST_COUNT`, haftalık sayı `Z.WEEKLY_QUEST_COUNT`. Hafta pazartesi başlar (`weekIndex`).

## Yeni diyar eklemek (özet)
`Z.REALMS`'e ad, `Z.LEVEL_NAMES` ve `Z.STORIES`'e 15'er satır (her 5. bölüm PATRON), `Z.MAX_LEVEL`'i 15 artır, `render.js` içindeki `THEMES`'e tema (+ varsa `leaf` renkleri), `ui.js` haritadaki `RI` (simge) ve `DEC` (süs) dizilerine ve `style.css`'e `.rbg.rN` / `.node.rN` ekle. Ardından `sim-balance.js` ve `field-balance.js` ile dengeyi kontrol et.

## Çeviri (i18n)
- Kaynak dil Türkçedir. Kodda kullanıcıya görünen her metni `$t('Türkçe metin')` ile sar (her dosyanın başında `var $t = Z.t || ...`). Sayı/ad içeren cümlelerde birleştirme yerine **şablon** kullan: `$t('{n}. bölümü tamamla', { n: 10 })` — çevirmen sözcük sırasını değiştirebilsin. Statik HTML için `data-i18n` (metin) ve `data-i18n-title` (aria-label) kullan.
- `node scripts/i18n.js extract out.json` kaynak metinleri listeler; `check` paketlerdeki eksik anahtar / HTML etiketi / yer tutucu hatalarını bulur; `build <klasör>` `<dil>.json` (+ `<dil>.*.json` eklemeleri) dosyalarından `www/js/lang/<dil>.js` üretir. Yeni metinler için yalnızca eksik anahtarları (check çıktısı) çevirtip `<dil>.extra.json` olarak ekle.
- `node tests/i18n-audit.js` sahte dilde (`sefervakti.lang=xx`) ekranları dolaşır; `⟦ ⟧` içine alınmamış harf = sarılmamış metin.
- Yeni dil: `Z.LANGS`'a ekle, `www/js/lang/<kod>.js` üret, `sw.js` önbellek listesine ve `scripts/i18n.js` `LANGS` dizisine ekle, `e2e-v08.js` dil döngüsüne ekle.

## Yeni sefer kuralı
`Z.RULES` (ad, simge, açıklama) → `sim.js` içinde `this.rl('kuralAdi')` ile etkisini yaz → `Z.ruleOf` döngüsüne (`RULE_CYCLE`) ve gerekirse `Z.dailySefer` havuzuna ekle. Çelişen kurallar (`rich`+`famine` gibi) günlük seferde birlikte gelmemeli.

## Yeni ganimet / başarım / pazar ürünü
- Ganimet: `Z.PERKS` + `sim.js` `pickPerk` ve etkisinin uygulandığı yer.
- Başarım: `Z.ACHIEVEMENTS` (`get(d)` kayıttan sayı döndürür; sayaç gerekiyorsa `save.js` `fresh()` `stats`'a ekle).
- Pazar: `Z.MARKET` + `save.js` `buyMarket`.

## Kayıt uyumluluğu (ÇOK ÖNEMLİ)
- Kayıt anahtarı `zafarion.save.v1` **asla değiştirilmez**; mevcut oyuncuların ilerlemesi buradadır.
- Yeni alan eklerken `save.js` `fresh()` içine varsayılanını koy: `load()` eksik alanları otomatik tamamlar (iç içe `stats`, `unitLvl`, `heroLvl` dahil).
- Var olan bir alanı **silme / yeniden adlandırma**; gerekirse eskisini oku, yenisine taşı.
- Yeni birim/kahraman eklenince `unitLvl`/`heroLvl` varsayılanları `fresh()` içinde `Z.UNIT_ORDER`'dan otomatik gelir.

## Ekonomi kuralları
- Yükseltme maliyetleri **üstel ama yumuşak** (`1.28^seviye`) ve **üst sınırlıdır** (`MAX_*_LVL`); sınır aşılırsa arayüz "MAKS" gösterir.
- Altın kaynakları: bölüm ödülü (`rewardCoins`), sandık, hazine (çevrimdışı), günlük giriş, çark, Zor/Efsane çarpanı (×2/×3). Elmas harcama yerleri: kahraman, çark, Pazar.
- Yeni bir kaynak/harcama eklersen `tests/unit-features.js` içine muhasebe testi koy (elmas/altın düşüyor mu, ikinci kez verilmiyor mu).

## Yayın akışı
`git push` → GitHub Actions: **APK** (Releases) ve **tarayıcı sürümü** (Pages) otomatik üretilir.
Sürüm: `www/js/version.js` (`VERSION`) + `package.json`. “Yenilikler” penceresini göstermek için `NOTES_ID`'yi değiştir ve `ui.js` `whatsNew` metnini güncelle.
