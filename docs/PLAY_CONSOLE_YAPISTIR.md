# Play Console — kopyala-yapıştır metinleri

Bu dosya, `docs/PLAY_STORE.md` içindeki adımların **yapıştırılacak metinleridir** (ürün adları/açıklamaları, sürüm notları). Form cevapları (içerik derecelendirme, veri güvenliği, hedef kitle) `docs/PLAY_STORE.md` bölüm 4'tedir.

## 1) Uygulama içi ürünler (Para kazanma → Ürünler → Uygulama içi ürünler)

Kimlikler **aynen** (sonradan değişmez, `www/js/monetize-config.js` ile aynı). Play'de hepsi **tek seferlik ürün** (yönetilen ürün) olarak oluşturulur; "tüketilebilir" ya da "tüketilemez" olması oyunun kendi tarafında belirlenir (elmas paketleri satın alındıktan sonra tüketilir, başlangıç paketi ve reklamsız ürün bir kez alınır). Fiyatlar önerilen USD; diğer ülkeler Play'in otomatik dönüşümüyle.

| Kimlik | Oyundaki davranış | Fiyat | Ad (en-US) | Ad (tr-TR) |
|---|---|---|---|---|
| `sefervakti_gems_80` | Çoklu alınır | $0.99 | 80 Gems | 80 Elmas |
| `sefervakti_gems_450` | Çoklu alınır | $4.99 | 450 Gems | 450 Elmas |
| `sefervakti_gems_1000` | Çoklu alınır | $9.99 | 1000 Gems | 1000 Elmas |
| `sefervakti_gems_2200` | Çoklu alınır | $19.99 | 2200 Gems | 2200 Elmas |
| `sefervakti_gems_6000` | Çoklu alınır | $49.99 | 6000 Gems | 6000 Elmas |
| `sefervakti_starter` | Bir kez alınır | $1.99 | Starter Pack | Başlangıç Paketi |
| `sefervakti_noads` | Bir kez alınır | $3.99 | Remove Ads | Reklamları Kaldır |

Açıklamalar (≤ 200 karakter):

| Kimlik | en-US | tr-TR |
|---|---|---|
| gems_80 / 450 / 1000 / 2200 / 6000 | Gems for heroes, market items and battle boosters. | Kahramanlar, pazar ürünleri ve savaş hazırlık kartları için elmas. |
| starter | One-time offer: 300 gems and 5,000 coins to get your army started. | Tek seferlik teklif: ordunu kurmak için 300 elmas ve 5.000 altın. |
| noads | Removes banner and interstitial ads for good. Optional rewarded ads stay available. | Banner ve geçiş reklamlarını kalıcı olarak kaldırır. İsteğe bağlı ödüllü reklamlar açık kalır. |

Kontrol: ürünlerin durumu **Etkin** olmalı; fiyatlar kaydedilmeli. Oyun ürün listesini Play'den çeker (`www/js/monetize-config.js` → `products`).

## 2) Sürüm notları (ilk sürüm; her dil ≤ 500 karakter)

Play Console'da "Sürüm notları" kutusuna olduğu gibi yapıştırın (etiketler dilleri ayırır):

```
<en-US>
First release! Lead your camp army through 105 real historical sieges, from antiquity to 1904. Two kinds of battle (castle siege and field battle), siege rules, 5 heroes, 11 unit types, daily sieges and quests. Hand-illuminated medieval look, 6 languages, works offline.
</en-US>
<tr-TR>
İlk sürüm! Kampından ordunu yönet, antik çağdan 1904'e uzanan 105 gerçek kuşatmaya katıl. İki savaş türü (kale kuşatması ve kale önü muharebesi), kuşatma kuralları, 5 kahraman, 11 birlik türü, günlük kuşatmalar ve görevler. El yazması tarzı ortaçağ görünümü, 6 dil, çevrimdışı çalışır.
</tr-TR>
<es-ES>
¡Primera versión! Dirige a tu ejército desde el campamento a través de 105 asedios históricos reales, desde la Antigüedad hasta 1904. Dos tipos de batalla, reglas de asedio, 5 héroes, 11 tipos de unidad, asedios y misiones diarias. Estilo de manuscrito iluminado, 6 idiomas, funciona sin conexión.
</es-ES>
<pt-BR>
Primeira versão! Comande seu exército a partir do acampamento em 105 cercos históricos reais, da Antiguidade a 1904. Dois tipos de batalha, regras de cerco, 5 heróis, 11 tipos de unidade, cercos e missões diárias. Visual de manuscrito iluminado, 6 idiomas, funciona offline.
</pt-BR>
<ru-RU>
Первый выпуск! Ведите армию из лагеря через 105 реальных исторических осад — от античности до 1904 года. Два вида боя, правила осады, 5 героев, 11 типов войск, ежедневные осады и задания. Стиль средневековой рукописи, 6 языков, работает без интернета.
</ru-RU>
<zh-CN>
首个版本！从营地出发，指挥大军征战105场真实历史围攻战，跨越古代至1904年。两种战斗、围攻规则、5位英雄、11种兵种、每日围攻与任务。中世纪彩绘手抄本风格，支持6种语言，可离线游玩。
</zh-CN>
```

## 3) Kısa sıralı kontrol (Play Console sol menü)

1. **Panel → Uygulamanızı kurun**: her başlık (gizlilik politikası, reklamlar, uygulama erişimi, içerik derecelendirme, hedef kitle, veri güvenliği, finansal özellikler, sağlık, haber/devlet) için `docs/PLAY_STORE.md` bölüm 4'teki cevaplar.
2. **Ana mağaza girişi**: ad, kısa/tam açıklama (`store/metadata/android/<yerel>/*.txt`), simge, öne çıkan görsel, 6 ekran görüntüsü. Diğer diller için **Çeviriler**.
3. **Test ve yayın → İç test**: `build-N` sürümündeki `.aab` yüklenir; test e-postaları eklenir. Üzerinde satın alma, reklam, onay formu denenir.
4. **Kapalı test** (kişisel hesapsa 12 kişi / 14 gün) → **Production erişimi başvurusu** → Production.
