# Sefer Vakti — Sürüm Notları

Her güncellemede yeni bir APK otomatik olarak **Releases** sayfasına eklenir.

## 0.13.0 — Hatırlatıcı bildirimleri
- 🔔 **Yerel hatırlatıcılar** (`@capacitor/local-notifications`, sunucu yok): **hazine dolunca**, her sabah 10:00'da **günlük ödül + bedava şans çarkı (+ günlük sefer)**, bugünkü ödül alınmadıysa 19:00'da bir yoklama, 3 ve 7 gün gelinmezse 18:30'da "geri dön". Sessiz saat 22:00-08:00. Oyundayken bekleyen hatırlatıcılar iptal edilir; arka plana geçince yenileri planlanır.
- ⚙️ **Ayarlar → Hatırlatıcı bildirimleri** (yalnızca APK'da görünür; Android 13+ izin penceresi açılır). 3. galibiyetten sonra menüye dönünce **bir kez** nazik soru çıkar ("Hatırlatıcılar açılsın mı?"); varsayılan KAPALI.
- 🛡️ **Tam zamanlı alarm yok:** eklentinin eklediği `SCHEDULE_EXACT_ALARM` izni manifestten çıkarıldı (Play özel beyan ister) ve her bildirim `isExactNotification:false` ile planlanır (yaklaşık saat); aksi halde eklenti kullanıcıyı sistem "Alarmlar ve hatırlatıcılar" ekranına yönlendirirdi.
- 🌍 Bildirim metinleri 6 dilde; küçük bildirim ikonu (C + kule siluet, 5 yoğunluk), kanal "Hatırlatıcılar".
- 🧪 `tests/unit-v13.js` (plan, sessiz saat, izin akışı, tam zamanlı alarm yok, manifest) ve `tests/e2e-v13.js` (sahte yerel platformla ayar/izin/planlama/iptal/nazik soru).

## 0.12.0 — Yaldızlı el yazması: yeni görsel kimlik
Mağaza ziyaretçileri grafiklerin "belli ki yapay zekâ işi" olduğunu söyledi. Oyunun tüm görsel dili **13. yüzyıl resimli savaş İncil'i (Morgan/Maciejowski) yönünde, tamamen kodla** yeniden kuruldu (`docs/ART_DIRECTION.md`).
- 🎨 **Palet ve doku:** doygun lacivert / vermilyon / malakit zeminler, baklava-nokta (diaper) desenler, parşömen yalnızca metin bloklarında, tek parlatılmış yaldız plaka; Almendra ve keçe/kilim teması kaldırıldı. Yeni yazı tipleri (SIL OFL): Texturina (başlık/düğme), Pirata One (süslü baş harfler), EB Garamond (gövde, Kiril destekli). Doku ve çerçeveler `www/js/art.js` (`Z.Art`) ile açılışta bir kez üretilir (≈19 ms).
- 🛡️ **~100 emoji ve 12 çizgi ikon yerine 135 özel ikon:** elle çizilmiş arma figürleri (haç, zambak, kule, miğfer...), kahramanlar kalkan üzerinde arma (aslan yüzü, yıldız ve şimşek, büyük miğfer, çarkıfelek, ejder başı), 7 diyar için arma, kural/avantaj/eylem ikonları, harita süsleri (dönemine uygun bitki örtüsü). Kaynaklar `art/icons/src/*.svg`, derleme `node scripts/build-icons.js` → `www/js/icons.js`; kilitli/sahip olunmayan hâller kesikli "alt çizim" durumuyla gösterilir.
- ⚔️ **Savaş alanı:** düz guaş birlikler + kalın mürekkep kontur, vellum haleli; takım kimliği yalnızca renkle değil miğfer/kalkan/arma ile (ev sahibi: lacivert + altın, haç; kale: vermilyon + gümüş, çapraz). Zemin düz renk + baklava desen, mürekkep çimen ve ağaçlar, altın baklava ufuk bandı; kale sırlı çatılı kuleler, kamp yurt ve tuğ yerine çizgili ortaçağ çadırları; sarmaşık-çivi savaş çerçevesi. Kare süresi önceki sürümden iyi (60 birimde ≈8-9 ms).
- 🗺️ **Arayüz:** harita (diyar zeminleri, noktalı yol, kazanılan yol yaldızlı, kilitli = alt çizim), brifing (baş harfli hikâye, mühür tabletleri), sonuç ekranı, dil seçimi bayraksız (TR/EN/... plaketleri), ayarlar (işaret kutuları, noktalı kaydırıcı). Okuma metni artık baklava deseninin üstünde değil, düz plakalarda.
- 📱 **Uygulama ikonu ve açılış ekranı:** altın varaklı Lombardik **"C" baş harfi içinde vermilyon zeminde gümüş bir kule**, lacivert baklava zeminde; uyarlanabilir + tek renk (temalı) simge, Android 12 açılış ekranı.
- 🖼️ **Mağaza görselleri yenilendi:** 1024×500 öne çıkan görsel (başlığı başlatan altın "C", "alt çizimden boyaya" resim), 6 dilde 6'şar altyazılı ekran görüntüsü (harita, kuşatma, brifing, kale önü, ordu, zafer). `node store/make-graphics.js` canlı oyundan yeniden üretir.
- 🐞 Çince ve Portekizce çevirilerde yüzde işareti sayıdan önce yazılmıştı ("%60"), düzeltildi ("60%").
- 🧪 Yeni araçlar/testler: `tests/unit-v12.js` (bütünlük), `tests/art-audit.js` (emoji kalıntısı + dokunma hedefi), `tests/art-sheet.js`, `tests/icon-sheet.js`, `tests/ui-shots.js`, `node scripts/build-icons.js --check|--selftest`.

## 0.11.0 — Google Play yayına hazırlık
- 📦 **Paket adı:** `com.dmdigital.castlesiege` (eski `com.zafarion.game` yerine; Play'e ilk yüklemeden önce değiştirilmesi gerekiyordu, yüklendikten sonra değişmez). Geliştirici adı DM Digital. Yeni uygulama eskisinin yanına ayrı kurulur; ilerleme için **Ayarlar → Kaydı dışa aktar / İçe aktar**.
- 🧱 **AAB:** CI artık hem APK (yan yükleme) hem imzalı **AAB** (Play Console) üretir; ikisi de Releases'e eklenir. Dil bölünmesi kapalı (oyun dilini uygulama içinden değiştirir). `targetSdk 36`, tek izin `INTERNET` (+eklentilerin faturalandırma/reklam izinleri), açık HTTP yok, Android yedekleme kuralları.
- 💳 **Gerçek Google Play Faturalandırma** (`cordova-plugin-purchase` 13.20, Billing Library 9) ve **Google AdMob** (`@capacitor-community/admob` 8.3) eklentileri kuruldu. Reklam kimlikleri GitHub **Variables**'tan (`ADMOB_*`) CI'da yazılır; yoksa Google TEST reklamları (uyarıyla).
- 🛡️ **Onay (UMP):** AB/İngiltere/İsviçre'de reklamdan önce Google onay formu; Ayarlar'da **Reklam gizlilik tercihleri**.
- 🐞 **Hata düzeltmesi:** geçiş reklamında olay adları eklenti v8 ile uyumsuzdu (reklam kapanınca oyun beklemede kalabilirdi); düzeltildi, ayrıca zaman aşımı eklendi. Cordova eklentileri için açılış `deviceready` bekler (en çok 3 sn).
- 🔒 **Gizlilik Politikası + Kullanım Şartları** sayfası (`www/privacy.html`, tr/en); Ayarlar ve Mağaza'dan bağlantı.
- 🖼️ **Mağaza girişi:** 6 dilde başlık/kısa/tam açıklama (`store/metadata/android/<yerel>/`), 512 simge, 1024×500 öne çıkan görsel ve 6 telefon ekran görüntüsü (1080×1920) — `node store/make-graphics.js` ile yeniden üretilir.
- 📘 `docs/PLAY_STORE.md`: uygulama adı, paket adı, varsayılan dil, kategori, içerik derecelendirme ve veri güvenliği cevapları, adım adım yayın kontrol listesi.
- Test: `tests/unit-v11.js`.

## 0.10.4 — Kale önü muharebelerinin arka planı
- 🏕️ **Kale önü muharebesi sahnesi de aynı gerçekçi katmanlarla yenilendi:** ufukta sisli dağlar ve gökyüzü (düşman kalesi artık ufuk çizgisinde duruyor), dokulu zemin, dokulu ve tekerlek izli toprak yol (yol kenarında çim/kum/kar), nehirde derinlik + akış çizgileri + kıyı köpüğü + kamışlar + taş basamaklı geçitler, ışığa göre gölgelendirilmiş tepeler ve kayalar, gölgeli sprite ağaçlı ormanlar, kale ve kamp önünde ezilmiş toprak ve duvar gölgesi; 7 temanın hepsi.
- Savaş başlığı (ör. "KALE ÖNÜ · MEVZİLERİ ELE GEÇİR") dar ekranlarda taşmıyor, yazı ekrana sığacak şekilde küçülüyor.
- Ortak katmanlar (zemin, ufuk, ışık) `scenery.js` içinde paylaşılıyor; hata olursa eski basit arka plana dönülür.

## 0.10.3 — Gerçekçi koridor sahnesi
- 🌄 **Koridor görüntüsü baştan çizildi** (`www/js/scenery.js`, bir kez çizilip önbelleğe alınır; 60 fps korunur): dokulu zemin (fBm gürültü + ot/kum izi/kar/kül ayrıntısı), toprak yollarda tekerlek izi, çakıl, su birikintisi ve kenar çimi, gökyüzünde yumuşak bulutlar ve sisli dağ katmanları, ufukta ağaç/kumul çizgisi.
- 🌲 **Işık ve gölge:** tüm ağaçlar, çalılar ve kayalar ışığa göre gölgelendirilmiş (üst-soldan ışık, yumuşak yer gölgeleri); gün ışığı huzmeleri, yapraklardan sızan ışık lekeleri, sıcak/serin renk tonlaması, vinyet.
- 🏜️ **7 temanın hepsinde:** orman (yaprak/çam), çöl (palmiye, zeytin, kaya, kumul), buz (karlı köknar), yanardağ (yanık ağaç, bazalt, lav çatlakları), bataklık (salkım söğüt, parlayan mantarlar), sonbahar, gece.
- Güvenlik: yeni sahne hata verirse eski basit sahneye döner. Test: `tests/e2e-v10.js` (7 temada kurulum + süre + savaş).

## 0.10.2 — Gerçek karakter simgeleri, şifacı düzeltmesi, akıllı düşman, elmas fiyatları
- 🛡️ **Ordu sekmesi, savaş kartları ve brifingde birlik simgeleri artık oyundaki gerçek karakter çizimi** (emoji değil); düşman listesi düşman renginde.
- 💚 **Şifacı hatası düzeltildi:** önünde düşman kalmayınca düşman kalesini geçip gitmiyor, kalenin 200 birim önünde duruyor (iki taraf için).
- ⚔️ **Düşman artık en çok askerinin olduğu koridordan çıkıyor** (eşitlikte tehdit puanı). Bu savaşı zorlaştırdığı için kale savaşı düşman ölçeği yeniden kalibre edildi (`Z.SCALE_KNOTS.lane` ≈1.78'e iner; bot kazanma oranı %68).
- 💎 **Elmas fiyatları satın alma paketlerine göre ayarlandı** (`docs/MONETIZATION.md` → Elmas fiyatlandırması): Yıldız Hatun 250 (başlangıç paketi 300 💎 ile alınır), Demir Bey 400, Buz Hatun 600, Ejder Hatun 900; Pazar: Altın Kesesi 25, Büyük Sandık 100, Hazine Hızlandırma 35, Bonus Çark 25, hazırlık kartı paketleri 75/75/100; çark 15. Elmas yetmeyince **"Elmas yetmiyor"** penceresi eksik miktarı ve eksiği kapatan en küçük paketi gösterip mağazaya götürür.
- Eski "Seferhan Tahtı" başarım metni düzeltildi.

## 0.10.1 — Oyunun adı: Castle Siege: History
- 🏷️ Oyunun adı **"Castle Siege: History"** oldu ve **dile göre değişir**: Kale Kuşatması: Tarih (tr), Castle Siege: History (en), Asedio de Castillos: Historia (es), Cerco de Castelos: História (pt), Осада замков: История (ru), 城堡围攻：历史 (zh). Sekme başlığı, logolar, ana ekran başlığı ve Android uygulama adı (telefon diline göre) buna uyar; APK adı `CastleSiegeHistory-…apk`. Paket kimliği aynı: güncelleme üstüne kurulur.

## 0.10.0 — Campaign Time: gerçek kuşatmalar, kamp, kuşatma kuralları
- 🏷️ **Oyunun adı sabit "Campaign Time"** ("Sefer Vakti"nin İngilizcesi): her dilde, başlıkta, simgede, APK adında aynı (`Z.NAME`).
- 🏰 **105 bölümün her biri gerçek bir tarihî kuşatma:** Rochester 1215 → Orléans 1429 → Akka 1291 → Kazan 1552 → Malta 1565 → Bağdat 1258 → Viyana 1683 → İstanbul 1453. Haritada ad + yıl, brifingte kısa tarih notu. Diyarlar bölgelere döndü: Batı Avrupa, Kutsal Topraklar, Kuzey Seferleri, Akdeniz, Alçak Ülkeler, Asya, Anadolu ve Balkanlar (manzara temaları aynı kaldı).
- 🏕️ **Senin tarafında kale yok, kamp var:** sivri kazıklı tahta çit, yurtlar, ateşler, nöbet kuleleri ve at kuyruklu **tuğ**; düşman kalesinde. "Kale canı" artık **Kamp canı**, "Kale Surları" **Kamp Tahkimatı**. Askerler yine kamp kapılarından çıkar.
- ⚔️ **Kuşatma mekanikleri:** 🌊 **Hendek** (kalenin önünde yakın dövüşçüler %35 yavaşlar, ahşap köprüler), 🐎 **Yardım Ordusu** (uyarıdan sonra her koridora ağır dalga), ⏳ **Abluka** (eski Savunma Seferi: kampını koru, kale açlıktan teslim olur), 🏰 **Sağlam Surlar**, ve her kale savaşında **gedik**: kale yarıya inince sur yarılır, kale okları %40 zayıflar, saldırgan hasarı +%10.
- 🏕️ Açık alan savaşları **kale önü muharebesi** oldu: üstte düşman kalesi (sur, kuleler, kapı), altta kampın; hedefler "Garnizon Komutanını Yok Et", "Mevzileri Ele Geçir", "Mevzii Tut". Kurallar tür başına ayrı döngüde (hendek/yardım ordusu yalnızca kale kuşatmasında).
- Testler: `tests/unit-v10.js` (6): sabit ad, 105 gerçek kuşatma, kural dağılımı, hendek yavaşlatması, yardım ordusu zamanlaması, gedik, tüm kurallarla çökmeden savaş döngüsü.

## 0.9.2 — Yeni görsel kimlik (frontend-design)
- 🎨 **Arayüz baştan giydirildi:** konu "Türk bozkır seferi" — keçe kahvesi zemin, kan boyası kırmızısı, turkuaz, yaldız altını ve kemik beyazı (6 renk). Parlak degrade/cam efekti yok; düz yüzey, kalın alt kenar ve **dikiş çizgisi**.
- 🚩 **Ana menü:** solda sallanan **tuğ** (at kuyruklu sancak) amblemi, "Sefer Vakti" Almendra başlığı, kilim bandı; düğmeler ortalı kartlar yerine ikonlu, sola yaslı satırlar.
- 🔤 **Yazı:** başlık/düğmelerde Almendra (SIL OFL, `www/fonts/`), sayılar ve HUD için sistem yazısı (okunaklı); Rusça/Çince sistem serif'e düşer.
- 🧭 Emoji ikonlar yerine **SVG ikonlar** (sekmeler, ana menü, para birimleri, ayarlar), kilim şeritli alt sekme çubuğu, düz madalyon harita düğümleri, kilim şeritli pencereler.
- Kod: `www/css/theme.css` (style.css'in üstüne biner; seçiciler/ID'ler değişmedi), `sw.js` önbelleği güncellendi.

## 0.9.1 — Güncelleme çakışması ve ilk açılış
- 🔑 **APK artık eskisinin üzerine kurulur:** secret tanımlı olmadığında her derleme *farklı geçici anahtarla* imzalanıyordu, Android de "mevcut uygulamayla çakışıyor" diye reddediyordu. CI imza anahtarını ilk derlemede üretip Actions önbelleğine kaydeder, sonraki derlemeler aynı anahtarı kullanır (kalıcı çözüm için README'deki secret'lar). **Bir kez** eski uygulamayı silmek gerekir (önce Ayarlar → Kaydı dışa aktar).
- 🏠 **İlk açılışta doğrudan ana menü** (arkada canlı savaş + karşılama penceresi); dil cihaz dilinden otomatik seçilir, değiştirmek için Ayarlar → Dil.

## 0.9.0 — Dengeli zorluk, hazırlık kartları, hata taraması
- ⚖️ **Bölüm zorlukları baştan dengelendi.** Yeni `tests/progression.js` gerçek bir oyuncuyu simüle ediyor (altınla birlik/kahraman/kale yükseltir, yenilince tekrar dener) ve 105. bölümde ortalama birlik seviyesinin **≈25** olduğunu gösterdi; eski denge botu ise 40 varsayıyordu, bu yüzden son bölümler (≈89+) gerçekte neredeyse geçilemezdi. `tests/calibrate.js` her bölüm için "hedef kazanma oranını" veren düşman ölçeğini buldu; sonuç **kale ve açık alan için ayrı** `Z.SCALE_KNOTS` tablolarına yazıldı (`data.js`). Hedef: erken bölümler rahat (~%97 → 1 deneme), 105. bölümde ~%55 (≈2 deneme); yeni ilerleme simülasyonunda diyar başına ortalama deneme sayısı 1.0 → 2.0. Önerilen birlik seviyesi artık gerçek beklenen seviyeye bağlı (`Z.expectedLevel`).
- 🎒 **Hazırlık kartları** (tek kullanımlık, brifingte seçilir, 3. bölümden sonra): 💰 Altın Hazırlığı (+150 altın / açık alanda +120 puan), ⚡ Kahraman Hazır (yetenek savaşın başında hazır), 🛡️ Sur Zırhı (kale +%30 / komutan +%50). Her birinden 1 ile başlarsın; Pazar'dan 3'lü paket alınır, zaferde sandıktan düşebilir.
- 🦁 **Brifingte kahraman seçimi** ve brifingde **3 yıldız hedefi ipucu** (kale canı >%70 / ordunun ≥%65'i).
- 🐞 **Hata taraması:** `tests/fuzz-sim.js` (yüzlerce rastgele kale/açık alan savaşı, rastgele deste/kahraman/kart/geçersiz girdi) gerçek bir çökme buldu — geçersiz koridorla `deploy` çağrısı düşman yapay zekasını çökertiyordu (düzeltildi). `tests/monkey.js` (gerçek tıklama/sürükleme ile rastgele oyun, 6 koşu × 2-3 dk, tr/en) sorun bulmadı. Brifing ipucu kutusunun ekran dışına taşması düzeltildi.
- 🔎 **Kod incelemesi** (bağımsız bir ajan, 12 bulgu) — düzeltilenler: **Android Geri tuşu** sonuç ekranında oyunu "ölü savaş ekranında" bırakıyordu (artık menüye döner); `Save.track(stat, 0)` 0'ı 1 sayıyordu, yani savaş sonunda **madeni yükselt/yetenek kullan/ganimet seç/birlik çağır görevleri oynamadan ilerliyor ve ödül veriyordu** (düzeltildi); `?monetize=test` ile **herkes yayın sürümünde sahte ödemeyle bedava elmas alabiliyordu** (test sağlayıcı artık yalnızca `dev` derlemede ya da `allowTestMode: true` ile açılır); uygulama gece yarısını aşarak açık kalırsa günlük ödül/çark/Günlük Sefer yenilenmiyordu (`rollDay` artık öne gelince, menüye girince ve savaş başında çalışır); *Yeniden Başla/Tekrar* hazırlık kartlarını sessizce tekrar harcıyordu; native satın almada sonradan onaylanan elmas paketi verilmeden tüketilebiliyordu (artık bekleyen istek yoksa doğrudan verilir); ayar anahtarı yenilemesi müzik kapalıyken çalışmıyordu; uygulama ganimet penceresiyle arka plana alınınca müzik geri gelmiyordu; ikinci parmak hayalet sürükleme ikonu bırakıyordu; silinmiş görev kimlikleri ana ekranı bozabilirdi (yeniden seçilir); okunamayan kayıt yedeklenmeden üzerine yazılıyordu (`.bak`); tek bir istisna oyun döngüsünü kalıcı donduruyordu (kare isteği başa alındı).
- 🧰 `tests/playthrough.js` (yeni oyuncu gibi gerçek girdilerle ilk bölümler), `tests/unit-v09.js` (11 test), `tests/e2e-v09.js`, `tests/monkey.js`, `tests/fuzz-sim.js`.

## 0.8.0 — Diller, Mağaza, Sesler
- 🌐 **6 dil:** Türkçe, English, Español, Português (Brasil), Русский, 简体中文. İlk açılışta cihaz diline göre seçilir ve dil penceresi çıkar; Ayarlar → Dil'den değişir (sayfa yenilenir). Hikâyeler, bölüm/diyar adları, görevler, başarımlar, öğretici ve tüm arayüz çevrildi (651 metin). Eksik çeviri varsa Türkçe gösterilir. Çeviri aracı: `node scripts/i18n.js extract|check|build`.
- 🛒 **Mağaza sekmesi:** 5 elmas paketi, Başlangıç Paketi (tek seferlik), Reklamları Kaldır, ücretsiz **ödüllü reklam** düğmeleri (günde 8). Ana menüde elmas çipi ve Mağaza düğmesi. Zafer sonunda *ödülü ×2 yap (reklam)*, yenilgide reklamla altın. Geçiş reklamı kuralları ve banner yuvası. **Reklam/ödeme SDK'sı bağlı değilken mağaza "Yakında" der ve hiçbir şey bedava verilmez.** Kurulum: `docs/MONETIZATION.md` (AdMob + Google Play Faturalandırma adımları, test modu).
- 🔊 **Sesler yenilendi:** her diyarın kendi **ortam sesi** (orman kuşları, çöl/buz rüzgârı, volkan gürültüsü ve çıtırtı, bataklık kurbağaları, sonbahar yaprakları, gece cırcır böcekleri/baykuş), **diyara göre müzik tonu** (dorian, frigien, minör…) ve yumuşak pad/melodi katmanı, menü için ayrı sakin-destansi müzik modu, yeni arayüz sesleri (elmas, ödül, sekme). Ayarlar'da **müzik ve efekt ses düzeyi kaydırıcıları**.
- 🤖 **Oto savaş** düğmesi (8. bölümden sonra; kale ve açık alan) ve **x3 hız**.
- 🧰 `tests/unit-v08.js` (dil + gelir mantığı), `tests/e2e-v08.js` (6 dilde taşma/eksik anahtar denetimi, mağaza test akışı, oto savaş, ses ayarı), `tests/i18n-audit.js` (sahte dil denetimi: sarılmamış metin yakalar).

## 0.7.0 — Ana menü ve öğretici
- 🏠 **Ayrı ana menü:** oyun artık büyük bir ana menüyle açılır (arkada canlı savaş + savaş müziği). **▶ Sefere Devam** sıradaki seferin brifingini açar; *Sefer Haritası, Ordu, Günlük Sefer, Sonsuz Kuşatma, Hazine, Görevler, Ayarlar* düğmeleri ayrı. Harita ana menüde görünmez, kendi ekranındadır; sol üstteki ‹ ve Android geri tuşu ana menüye döner.
- 🔋 Canlı savaş yalnızca ana menüde çalışır; harita/ordu ekranlarında durur (pil ve akıcılık).
- 🎓 **Etkileşimli öğretici:** ilk kez oynayanlar 1. seferi adım adım öğrenerek oynar (kart sürükle, üstünlük üçgeni, başka yola çağır, madeni yükselt, kahraman yeteneği). Parlayan çerçeve ve el işareti gösterir; gerekirse "Öğreticiyi geç".
- 🧹 **Savaşta sol alttaki koridor seçici kalktı:** kartı doğrudan istediğin yola sürükle (kart dokunuşu, dokunarak seçilen yola gönderir).
- 🧰 `tests/e2e-v07.js` (ana menü akışı + öğretici adımları).

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
