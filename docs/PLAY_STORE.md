# Google Play'de yayınlama rehberi — Castle Siege: History

Bu belge, oyunu Google Play'e yüklemek için **kodda hazır olanı** ve **sizin (hesap sahibi) yapmanız gerekeni** sıralar. Mağaza metinleri ve görselleri `store/` klasöründe hazırdır.

## 1) Kimlik bilgileri (Play Console'a bunları yazın)

| Alan | Değer |
|---|---|
| **Uygulama adı** (varsayılan dil, en-US) | **Castle Siege: History** |
| **Paket adı** (application ID) | **`io.github.erenmaral.castlesiege`** |
| **Varsayılan dil** (Play Console → Varsayılan dil) | **İngilizce – English (United States) `en-US`** |
| Diğer mağaza dilleri (çeviriler) | `tr-TR` Kale Kuşatması: Tarih · `es-ES` ve `es-419` Asedio de Castillos: Historia · `pt-BR` Cerco de Castelos: História · `ru-RU` Осада замков: История · `zh-CN` 城堡围攻：历史 |
| Uygulama / oyun | **Oyun** |
| Kategori | **Strateji** (Games → Strategy) |
| Etiketler (en çok 5) | Strateji, Savaş, Tarih, Kale savunması/kuşatma, Tek oyunculu |
| Fiyat | Ücretsiz (reklam + uygulama içi satın alma içerir) |
| Sürüm adı / kodu | `0.11.0.<derleme no>` / `<derleme no>` (CI otomatik verir; her derleme bir öncekinden büyüktür) |
| Minimum / hedef Android | Android 7.0 (API 24) / hedef API 36 |
| Yön | Dikey (portre) |
| İzinler | Yalnızca `INTERNET` (faturalandırma ve reklam eklentileri kendi izinlerini ekler) |
| Web sitesi | https://erenmaral.github.io/erenmaral/ (bkz. 3. madde, Pages notu) |
| Gizlilik politikası URL'si | https://erenmaral.github.io/erenmaral/privacy.html |
| Geliştirici e-postası | Play Console'da **sizin e-postanız** (zorunlu, herkese açık görünür) |

**Neden varsayılan dil İngilizce?** Mağaza girişi, çevirisi olmayan her dil (Almanca, Fransızca, Arapça…) için varsayılan dile düşer; İngilizce en geniş kitleye uyar. Oyun içinde de cihaz dili listede yoksa İngilizce açılır (`www/js/i18n.js`); Türkçe, Türkçe cihazlarda otomatik seçilir. İsterseniz varsayılan dili Türkçe yapabilirsiniz, ama o zaman çevirisiz dillerdeki kullanıcılar Türkçe açıklama görür.

**Paket adı kalıcıdır:** ilk AAB'yi Play Console'a yükledikten sonra değiştirilemez. `io.github.erenmaral.castlesiege`, GitHub kullanıcı adınızdan türetilmiş geçerli bir ters-alan adıdır. Başka bir ad isterseniz **yüklemeden önce** `capacitor.config.json`, `android/app/build.gradle` (iki yer), `MainActivity.java` (paket satırı + klasör yolu) ve `res/values/strings.xml` içinde değiştirin; `node tests/unit-v11.js` tutarlılığı denetler.

## 2) Kodda hazır olanlar

- [x] İmzalı **AAB** + APK derlemesi (her push, Releases → `build-N` → `CastleSiegeHistory-<sürüm>.aab`)
- [x] Hedef API 36, 64-bit uyumlu (yerel kod yok), yalnızca gerekli izinler, düz HTTP kapalı, Android yedekleme kuralları
- [x] Adaptif simge, açılış ekranı, 6 dilde yerelleştirilmiş uygulama adı
- [x] Gerçek **Google Play Faturalandırma** (Billing Library 9) ve **AdMob** bağlayıcıları, **UMP onay formu**, Ayarlar'da *Reklam gizlilik tercihleri*
- [x] **Gizlilik Politikası + Kullanım Şartları** (`www/privacy.html`, tr/en); Ayarlar ve Mağaza'dan açılır
- [x] Veri silme: Ayarlar → *Kaydı sıfırla* (hesap/sunucu verisi yok); *Kaydı dışa/içe aktar*
- [x] Mağaza metinleri (başlık ≤30, kısa ≤80, tam ≤4000) 6 dilde, simge 512, öne çıkan görsel 1024×500, 6 ekran görüntüsü 1080×1920 → `store/metadata/android/<yerel>/`
- [x] Otomatik testler (`tests/unit-v11.js`) paket adı, manifest, mağaza sınırları, gizlilik sayfası, reklam ayarı betiğini denetler

## 3) Sizin yapmanız gerekenler (kod bunları yapamaz)

### 3.1 GitHub tarafı (bir kez)
1. **Gizlilik sayfasının yayında olması (Play zorunlu kılar).** Pages yalnızca **varsayılan daldan** yayınlanır (`.github/workflows/pages.yml`). Bu dal birleştirilip varsayılan dal olmadan `…/privacy.html` adresi açılmaz. Depoyu iki oyun paylaşıyorsa (bu dal ve `claude/new-game-idea-vqcujr`) Pages tek siteyi gösterir; ya bu oyun için ayrı bir depo açın ya da `privacy.html` adresini sizin sitenizde yayınlanan bir adresle değiştirin (`www/js/monetize-config.js` → `links`, ve Play Console). Adres **herkese açık, giriş istemeyen ve PDF olmayan** bir sayfa olmalı.
2. **İmza (yükleme) anahtarı — önemli.** Secret tanımlamazsanız anahtar Actions önbelleğinde durur ve 7 gün derleme yapılmazsa silinebilir; Play'e yüklenen uygulama için anahtar tutarlı olmalıdır. Bir kez kendi anahtarınızı üretin (README → *İmza anahtarı*; **takma ad `zafarion` kalmalı**) ve `ZAFARION_KEYSTORE_B64`, `ZAFARION_KEYSTORE_PASSWORD` secret'larını ekleyin. Anahtar dosyasını güvenli yere yedekleyin. (*Play Uygulama İmzalama* açıkken bu anahtar yalnızca **yükleme anahtarı**dır; kaybederseniz Google desteği sıfırlayabilir. İmzalama anahtarını Google tutar.)
3. **AdMob kimlikleri (Variables):** Settings → Secrets and variables → Actions → **Variables**: `ADMOB_APP_ID` (`ca-app-pub-…~…`), `ADMOB_REWARDED_ID`, `ADMOB_INTERSTITIAL_ID`, `ADMOB_BANNER_ID` (`ca-app-pub-…/…`). Dördü de geçerliyse CI `testMode=false` yapar; yoksa Google TEST reklamları kalır ve derleme günlüğünde uyarı görürsünüz. **Test kimlikli bir sürümü Production'a göndermeyin.**

### 3.2 Hesap ve uygulama
1. Play Console geliştirici hesabı (tek seferlik ücret + kimlik/telefon doğrulama).
2. **Yeni kişisel hesaplar için kapalı test koşulu:** 13 Kasım 2023'ten sonra açılan kişisel hesaplar, Production'a başvurmadan önce **en az 12 test kullanıcısıyla 14 gün kesintisiz kapalı test** yapmalıdır; kurum hesapları muaftır. Kaynaklar üçüncü taraf özetleridir ([özet](https://ontest.app/blog/google-play-12-testers-14-days-requirement-explained), [özet](https://levelup.gitconnected.com/the-12-tester-tax-google-plays-closed-testing-rule-is-quietly-killing-solo-devs-2cea83c2e338)); güncel kuralı Play Console → *Test ve yayın* sayfasından doğrulayın. Süreyi (≈3 hafta) planlayın.
3. **Uygulama oluştur** → ad `Castle Siege: History`, varsayılan dil `en-US`, *Oyun*, *Ücretsiz*.
4. **Play Uygulama İmzalama**'ya katılın (varsayılan) ve ilk **AAB**'yi yükleyin: GitHub → Releases → son `build-N` → `CastleSiegeHistory-….aab`.
5. **Mağaza girişi:** her dil için `store/metadata/android/<yerel>/` altındaki `title.txt`, `short_description.txt`, `full_description.txt` metinlerini yapıştırın; `images/icon.png` (512), `images/featureGraphic.jpg` (1024×500), `images/phoneScreenshots/*.jpg` (6 adet) yükleyin. Çevirisi olmayan diller için yalnızca en-US yeterli.
6. **Uygulama içi ürünler** (Para kazanma → Ürünler → Uygulama içi ürünler; kimlikler **aynen**, `www/js/monetize-config.js` ile aynı):

   | Ürün kimliği | Tür | Önerilen fiyat |
   |---|---|---|
   | `sefervakti_gems_80` | Tüketilebilir (managed, consumable) | $0.99 |
   | `sefervakti_gems_450` | Tüketilebilir | $4.99 |
   | `sefervakti_gems_1000` | Tüketilebilir | $9.99 |
   | `sefervakti_gems_2200` | Tüketilebilir | $19.99 |
   | `sefervakti_gems_6000` | Tüketilebilir | $49.99 |
   | `sefervakti_starter` | Tüketilemez (tek seferlik) | $1.99 |
   | `sefervakti_noads` | Tüketilemez (tek seferlik) | $3.99 |

   Ürünler etkin değilse mağazada fiyat yedek metinle görünür ve satın alma tamamlanmaz. Bir test hesabıyla **iç test** kanalında satın almayı ve *Satın alımları geri yükle*'yi deneyin. Ürün kimliği silinip yeniden kullanılamaz.
7. **AdMob:** hesap aç → Android uygulaması ekle (paket adı yukarıdaki) → *Ödüllü*, *Geçiş*, *Banner* birimleri → *Gizlilik ve mesajlaşma* bölümünde **AB onay (GDPR) iletisi** oluşturup yayınlayın → kimlikleri 3.1'deki Variables'a girin. Kendi reklamınıza tıklamayın; test cihazınızı ekleyin.
8. **Uygulama içeriği** formları (aşağıdaki cevaplar).
9. Önce **iç test → kapalı test → Production**. Kapalı testte `tr-TR` ve `en-US` metinleri kontrol edin.

## 4) Play Console form cevapları

**Gizlilik politikası:** `https://erenmaral.github.io/erenmaral/privacy.html`

**Reklamlar:** *Evet, uygulamam reklam içeriyor* (AdMob).

**Uygulama erişimi:** Tüm işlevler özel erişim olmadan kullanılabilir (giriş/hesap yok).

**Reklam kimliği (Advertising ID):** *Evet* kullanır — amaç: *Reklam veya pazarlama*. (Manifestte `AD_ID` izni, AdMob SDK'sı tarafından eklenir.)

**Hedef kitle:** **13 yaş ve üzeri** (13–15, 16–17, 18+ seçin; *12 yaş ve altı* seçmeyin). Çocuklara yönelik değildir, Aileler programına girmez.

**İçerik derecelendirme (IARC)** — kategori *Oyun*. Önerilen cevaplar: şiddet → *Evet, fantastik/çizgi film tarzı savaş şiddeti* (kan/ağır şiddet yok); cinsellik, küfür, uyuşturucu, korku → *Hayır*; kullanıcılar arası etkileşim/içerik paylaşımı → *Hayır*; konum paylaşımı → *Hayır*; dijital satın alma → *Evet*; gerçek para kumarı → *Hayır*. **Şans çarkı**: ödülü sanal (oyun içi elmas/altın), gerçek para ödülü yok ve çarkın günlük ücretsiz hakkı vardır; “simüle edilmiş kumar” sorusu çıkarsa dürüstçe değerlendirin (kumarhane oyunu değildir ama çarkı gösteren bir madde varsa *Evet* demek notu yükseltebilir). Sonuç beklenen: ESRB E10+ / PEGI 7 civarı.

**Veri güvenliği formu** (oyunun kendisi sunucu kullanmaz; reklam SDK'sı veri toplar — Google'ın AdMob veri açıklama rehberine göre doğrulayın):
- Veri toplanıyor mu: **Evet** (yalnızca reklam SDK'sı).
- Türler: *Konum → Yaklaşık konum* · *Cihaz veya diğer kimlikler → Reklam kimliği* · *Uygulama etkinliği → Uygulama etkileşimleri* · *Uygulama bilgileri ve performansı → Çökme günlükleri, Tanılama*.
- Amaç: *Reklamcılık veya pazarlama*, *Analiz*, *Dolandırıcılık önleme/güvenlik*.
- Paylaşılıyor mu: **Evet** (Google AdMob). Ad, e-posta, rehber, fotoğraf, hassas konum, mikrofon/kamera: **toplanmaz**.
- Aktarım sırasında şifreleme: **Evet**.
- Kullanıcı veri silme isteyebilir mi: oyun hesap/sunucu verisi tutmaz; ilerleme cihazdadır (kaldırınca silinir, Ayarlar'da sıfırlanır) → *Hayır* (politika sayfasında açıklandı).
- Satın alma bilgisini Google Play işler; oyun yalnızca yerelde jeton saklar.

**Finansal özellikler / Sağlık / Devlet / Haber:** Hayır. **COVID-19 / diğer bildirimler:** Hayır.

## 5) Yayın öncesi son kontrol

- [ ] Pages (veya başka) üzerinde `privacy.html` herkese açık ve yükleniyor
- [ ] `ADMOB_*` Variables tanımlı; derleme günlüğünde "reklam: gerçek kimlikler yazıldı" (uyarı yok)
- [ ] `ZAFARION_KEYSTORE_*` secret'ları tanımlı ve anahtar yedeklendi
- [ ] Ürünler Play Console'da **Etkin**; iç testte satın alma + geri yükleme denendi
- [ ] AdMob'da uygulama Play'e bağlandı (yayın sonrası), AB onay iletisi yayında
- [ ] Gerçek cihazda: açılış, savaş, mağaza, ödüllü reklam, geçiş reklamı, Ayarlar → gizlilik bağlantıları, dil değişimi
- [ ] Mağaza girişi her dil için doldu; ekran görüntüleri ve öne çıkan görsel yüklendi
- [ ] Veri güvenliği, içerik derecelendirme, hedef kitle, reklam bildirimi tamamlandı

## 6) Bilinen sınırlar (dürüst not)

- Eklentiler (AdMob, Faturalandırma) bu ortamda **gerçek cihazda sınanamadı**; CI yalnızca derlemenin geçtiğini gösterir. İç test kanalında mutlaka deneyin.
- Satın almalar **istemci tarafında** işlenir (makbuz sunucuda doğrulanmaz); bkz. `docs/MONETIZATION.md → Güvenlik`.
- Gizlilik/şartlar metinleri bir hukuk danışmanlığı değildir; bölgenize ve işletme biçiminize göre gözden geçirin.
- Mağaza girişini yeniden üretmek için: `python3 store/build-listing.py` (metinler) ve `node store/make-graphics.js` (görseller, Playwright gerekir).
