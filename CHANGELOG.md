# Sefer Vakti — Sürüm Notları

Her güncellemede yeni bir APK otomatik olarak **Releases** sayfasına eklenir.

## 0.6.0 — Sefer Vakti
- 🏷️ **Oyunun adı artık Sefer Vakti** (uygulama adı, tarayıcı sekmesi, açılış ekranı). Paket kimliği aynı kaldı: yeni APK eskisinin üzerine kurulur, kaydın korunur.
- ⚔️ **Canlı ana menü:** arkada gerçek bir savaş (bot oynuyor, her seferinde farklı diyar) ve savaş müziği/ortam sesi çalıyor. Ayarlar'dan *Menüde canlı savaş* kapatılabilir (pil/performans). Menüde 30 kare/sn çizilir.
- 🗺️ **Yeni sefer haritası:** diyar manzaraları (orman, çöl, buz, volkan, bataklık, sonbahar, gece) ve süsleri, yumuşak kıvrımlı yol (tamamlanan kısım altın parlar), madalyon düğümler (⚔️ açık alan = yuvarlak köşeli, 🏰 kale = daire, 👑 patron), diyar başlıkları ve ⭐ ilerlemesi, kilitli diyarlar soluk, konum bayrağı 🚩.
- 🌍 **30 yeni bölüm, 2 yeni diyar (toplam 105 bölüm):** 🍂 *Altın Yaprak Ormanı* (76-90) ve 🌙 *Yıldız Ovası* (91-105) — yeni temalar, bölüm adları ve hikâyeler; son patron **Vakit Tahtı**. Zorluk eğrileri 105. bölüme kadar uzatıldı.
- 📜 **Daha çok görev:** günlük görev sayısı 3→4, havuz 9→21 (açık alan/kale galibiyeti, 2×3 yıldız, daha uzun hedefler); **haftalık görevler** (her pazartesi yenilenir, 3 adet, büyük ödüller; havuz 10); 11 yeni başarım (açık alan/kale/patron galibiyetleri, 90/105. bölüm, 200/300 yıldız…); yıldız ödülleri 160/200/250/300'e kadar uzadı.
- 👑 **Komutan artık yerinde durur:** açık alanda her iki komutan da rakibi kovalamaz, asker basma bölgesinin dışına çıkamaz (yalnızca yakınına gelene karşılık verir).
- 🧰 `tests/unit-v06.js` (görevler, haftalık yenileme, eski kayıt yükseltme, sayaçlar, içerik tutarlılığı), `tests/e2e-v06.js` (canlı menü, harita, görevler, yeni diyarlar), açık alan komutan testi.

## 0.5.0 — Açık Alan Savaşları
- 🏕️ **Açık alan seferleri:** 75 bölümün 30'u (3-4, 8-9, 13-14 …) artık kale kuşatması değil **serbest meydan savaşı**. Savaştan önce *komuta puanı* ile ordunu sahada **istediğin yere yerleştirirsin** (kartı sürükle ya da kartı seç + dokun; birliği sürükleyerek taşı, dokunarak geri al, 🎲 Otomatik ile hızlı diz). Sonra ⚔ SAVAŞ!
- 👑 **Komutan:** iki tarafın da komutanı var; senin komutanın düşerse yenilirsin. Üç hedef: **Komutanı Yok Et**, **🚩 Bayrakları Ele Geçir** (3 bayrak, 100 puan), **⏳ Mevzii Tut**.
- 🌍 **Arazi (bölüme göre sabit harita):** 🌊 nehir (yalnızca 2 sığ geçitten geçilir — ordular geçitlerde çarpışır), 🌲 orman (hareketi yavaşlatır, okçu hasarını ×0.75 azaltır), ⛰️ tepe (+%20 menzil, +%10 hasar), 🪨 kayalar.
- 🧭 **Taktik araçlar:** ⚔ Saldır / 🛡 Savun duruşu, kahraman yeteneğini **sahada bir noktaya** sürükleyerek kullanma (çevresindeki birliklere etki eder), savaş sırasında alt şeritten takviye, ganimet ve madenler.
- 🏃 **Birlikler artık birbirini geçebiliyor:** kale kuşatmalarında hızlı birlik yavaş dostun önünde takılmaz (yola yayılır), açık alanda yandan dolaşır.
- 🔊 **Savaş sesleri yeniden yazıldı:** kılıç/kalkan çarpması, ok vızıltısı, kanca/çığlık, at nalı, savaş davulu ve borusu, savaş yoğunluğuna göre değişen müzik/ortam. Hâlâ hiç ses dosyası yok (hepsi kodla üretiliyor).
- 🎨 Açık alan için yeni çizim motoru: nehir/geçit, orman kümeleri, katmanlı tepeler, bayraklar, komutan sprite'ı (altın taç + sancak), yönüne dönen askerler, yerleştirme önizlemesi. Komutanlara özel görünüm.
- ⚖️ **Denge:** düşman can/hasar eğrisi ve geliri yeniden ayarlandı (bot testleri: kale ≈%66, açık alan ≈%70 kazanma).
- 🧰 `tests/field-balance.js` (açık alan botu), 11 yeni mantık testi (harita, yerleştirme, geçişler, nehir, orman, bayrak, komutan, duruş, ödül), `tests/e2e-v05.js` (sürükle-bırak dahil uçtan uca).

## 0.4.0 — Sürdürülebilir Seferhan
- 🌋 **2 yeni diyar, 75 bölüm:** **Volkan Diyarı** (lav çatlaklı yollar, yanmış ağaçlar, kor yağmuru, ufukta yanardağlar) ve **Gölge Bataklığı** (sis, ateşböcekleri, ışıldayan mantarlar, sazlıklar). Diyar bölüm adları temalarına uygun.
- 🗡️ **Suikastçı:** çok hızlı; düşman saflarının arasından geçip okçu/büyücü/şifacıyı avlar. 🗿 **Taş Dev:** çok dayanıklı, darbesi çevreye de vurur. 🔥 **Alevci:** kısa menzilli alev, yanma hasarı.
- 🐉 **Ejder Hatun** kahramanı: *Ejder Nefesi* ile koridoru 6 sn yakar.
- 📅 **Günlük Sefer:** her gün tarihe göre değişen, **2 kurallı** özel savaş; ilerlemene göre ölçeklenir. Ödül günde bir kez.
- 🔥💀 **Zor ve Efsane kademeleri:** Normal'de kazandığın seferleri güçlü düşmanlarla tekrar oyna; ödül ×2 / ×3, her kademede ilk galibiyette bonus elmas.
- 🛒 **Pazar:** elmasla altın kesesi, büyük sandık, hazine hızlandırma, bonus çark hakkı.
- 📤 **Kayıt taşıma:** Ayarlar'dan kayıt kodunu dışa/içe aktar (APK ↔ tarayıcı ↔ yeni telefon).
- 🏆 Yeni başarımlar (9): son bölümler, Zor/Efsane, Günlük Sefer, Pazar, birlik seviyeleri.
- ⚖️ **Ekonomi uzun vadeye göre yeniden dengelendi:** yükseltme maliyet eğrisi yumuşatıldı (`1.28^sv`), birlik seviye sınırı 25→40, kahraman/kale/hazine için de üst sınırlar ("MAKS"). Son diyarların zorluk ve düşman geliri eğrisi ayarlandı.
- 🧰 **Geliştirici:** `docs/ICERIK.md` içerik ekleme rehberi, 10 yeni mantık testi ve veri tutarlılığı testi (bölüm/ad/hikâye sayısı, her birimin COUNTER'ı vb.), `tests/e2e-v04.js`.

## 0.3.1 — Grafik yenileme
- 🏰 **Kaleler çok daha belirgin:** tuğla dokulu yüksek sur, silindirik kuleler ve konik çatılar, taş kemerli kapılar (kafes dişleri, yarı açık kanatlar), meşaleler, takım kalkanları ve sancaklar. Hasar alınca çatlar, siperlikler kırılır, kuleler yanar.
- 🌲 **Orman yolları:** koridorlar artık ormanın içinden kıvrılan toprak yollar. İki yanı yoğun orman (kuşbakışı çam ve geniş yapraklı ağaçlar, çalılar, çiçekler, kütükler, kayalar, göletler). Çölde palmiye/kaktus/kaya, buzda karlı çam ve buz kristalleri. **Her sefer kendi manzarasına sahip.**
- ⚔️ **Daha güzel askerler:** kontur çizgileri, metal parlaklığı, pelerinler, miğfer tüyleri, ayrıntılı silahlar. Sprite'lar %28 büyütüldü. Düşmanlar boynuzlu ve koyu zırhlı, atlar takıma göre beyaz/siyah.
- ✨ **Efektler:** güneş huzmeleri, kenar karartması, düşen yapraklar, ok ve büyü izleri, taş dumanı, kılıç darbesi yayları, savaş izleri.
- 🎨 Arayüzde parlak düğmeler, kartlar ve paneller.

## 0.3.0 — Dikey Seferler
- 📱 **Oyun artık dikey (portre):** menüler, harita ve savaş telefonu dik tutarak oynanır. Android'de ekran dikeye kilitli, tarayıcı sürümü de dikey açılır.
- ⚔️ **Dikey savaş:** kalen altta, düşman kalesi üstte; 3 koridor yan yana, birlikler yukarı doğru yürür. Birlikler kuşbakışı yeniden çizildi.
- 🎯 **Koridor seçimi:** alttaki **1-2-3 düğmeleri**, sahada koridora dokunmak ya da kartı koridora sürüklemek. Seçili koridorun kapısında altın ok görünür.
- 🗺️ **Her bölüm ayrı bir sefer:** kendi hikâyesi, **sefer kuralı** ve hedefi var. Sefer brifingi ekranı eklendi.
  - Kurallar: 💰 Altın Damarı, 🌪️ Fırtına Rüzgârı, 🛡️ Zırhlı Ordu, 🗡️ Pusu, 🌾 Kıtlık, 📯 Moral Çağrısı, 🏰 Kale Kuşatması, ⏳ Savunma Seferi (süreyi doldur).
  - Her diyarın bölüm adları kendi temasına uygun hâle getirildi (çöl/buz).
- Harita dikey kaydırmalı bir yola dönüştü; yıldız ödülleri üstte yatay kaydırmalı.
- Denge: sefer kuralları eklendi, genel kazanma oranı ~%68 (3 seviye ilerideki oyuncuda ~%82).

## 0.2.0 — Seferhan
- ✏️ **Oyunun adı Seferhan oldu** (eski adı Zafarion). Yeni ikon: sancaklı kale kulesi. İlerleme ve kayıtlar korunur.
- 🗺️ **3 diyar, 45 bölüm:** Yeşil Vadi, Kızıl Çöl (kum tozu), Buz Diyarı (kar yağışı). Her diyarın kendi manzarası var.
- 💚 **Şifacı:** koridordaki yaralı dostları iyileştirir (6. bölümden sonra açılır).
- 🚩 **Sancaktar:** yanındaki dostlara %20 hasar bonusu (10. bölümden sonra açılır).
- ❄️ **Buz Hatun** kahramanı: *Don Fırtınası* ile koridoru dondurur.
- ⚔️ **Savaş Ganimeti:** savaş sırasında 3 güçten birini seç (9 farklı güç) — her savaş farklı oynanır.
- 🎡 **Şans Çarkı:** günlük bedava çevirme, sonrası 💎 ile.
- ⭐ **Yıldız ödülleri** (6 kilometre taşı) ve 🏆 **18 başarım**.
- 🌐 **Tarayıcı sürümü (GitHub Pages / PWA):** ana ekrana eklenebilir, çevrimdışı çalışır.
- Denge: son diyarların zorluk artışı yumuşatıldı; savaşta ganimet seçimi eklendiği için erken bölümler biraz kolaylaştı.

## 0.1.0 — İlk sürüm
- ⚔️ **Sefer:** 30 bölüm, her 5. bölüm patron. Yıldız sistemi (kale canına göre 1–3 ⭐).
- 🎯 **Savaş:** 3 koridorlu gerçek zamanlı 2D strateji. Kartı koridora sürükle. Birlik üstünlük döngüsü: 🔱 > 🐎 > 🏹 > 🔱.
- 🛡️ **6 birlik:** Mızrakçı, Okçu, Süvari, Şövalye, Büyücü, Mancınık (bölüm ilerledikçe açılır), her biri 25 seviyeye kadar yükselir.
- 🦁 **3 kahraman** ve yetenekleri: Zafer Naraası, Yıldırım Fırtınası, Çelik Siper.
- ⛏ Savaş içi maden yükseltmesi, 🔥 öldürme serisi bonusu, x2 hız.
- ♾️ **Sonsuz Kuşatma** modu.
- 💰 **Hazine:** uygulama kapalıyken bile altın birikir (8 saate kadar).
- 🎁 Günlük giriş ödülü (7 günlük seri), günlük görevler, zafer sandığı.
- Tüm grafik ve sesler kodla üretilmiştir — harici telifli dosya yok.
