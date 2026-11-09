# Sefer Vakti — Reklam ve Elmas Satın Alma Rehberi

Bu belge, oyundaki **mağaza / reklam / uygulama içi satın alma** altyapısını gerçek hesaplarınıza nasıl bağlayacağınızı anlatır.

## Şu an ne hazır, ne hazır değil?

| Hazır (kodda) | Sizin yapmanız gereken |
|---|---|
| **Mağaza sekmesi:** 5 elmas paketi, başlangıç paketi (tek seferlik), reklamları kaldır, ücretsiz ödüllü reklam düğmeleri | Google Play Console'da ürünleri oluşturmak |
| **Ödüllü reklam** akışları: mağazadan 💎/🪙, zafer sonunda "ödülü ×2 yap", yenilgide 🪙 | AdMob hesabı + reklam birimleri |
| **Geçiş reklamı** kuralları (her 3 savaşta bir, 6. bölümden sonra, en az 3 dk arayla, reklamsız paket alanlara yok) | — |
| **Banner yuvası** (sefer merkezinde; reklamsız pakette kalkar) | — |
| **Güvenli varsayılan:** reklam/ödeme SDK'sı yoksa mağazada "Yakında" yazar, **kimse bedava elmas alamaz** | — |
| **Test modu** (sahte reklam + sahte ödeme penceresi) | — |
| Yerli adaptörler: `@capacitor-community/admob` ve `cordova-plugin-purchase` bulunursa otomatik devreye girer | **Gerçek cihazda test etmek** (bu adaptörleri burada cihazsız yazdım, doğrulanmadı) |

> **v0.11.0:** `@capacitor-community/admob` ve `cordova-plugin-purchase` artık kurulu; AdMob kimlikleri CI'da GitHub **Variables**'tan yazılır (`ADMOB_APP_ID`, `ADMOB_REWARDED_ID`, `ADMOB_INTERSTITIAL_ID`, `ADMOB_BANNER_ID`; bkz. **docs/PLAY_STORE.md**). Aşağıdaki 2. ve 3. maddelerdeki `npm i` / manifest adımları gerekmez; hesap, reklam birimi ve ürün oluşturma adımları geçerlidir. Gerçek cihazda sınanmadan yayınlamayın.

## 1) Önce test modunda deneyin (tarayıcıda)

Yerel geliştirmede (`www/index.html`, derleme numarası `dev`) adres sonuna `?monetize=test` ekleyin ya da konsolda — yayınlanmış (Pages/APK) sürümde test modu **varsayılan olarak kapalıdır**, çünkü açık olsaydı herkes sahte ödemeyle bedava elmas alabilirdi. Yayınlanmış Pages sürümünde denemek için `monetize-config.js` içinde geçici olarak `allowTestMode: true` yapın:

```js
localStorage.setItem('sv.monetize', 'test'); location.reload();
```

Mağazada sahte reklam (3 sn sayaç) ve sahte ödeme onayı çıkar; elmaslar gerçekten eklenir. Kapatmak: `localStorage.removeItem('sv.monetize')`.
`allowTestMode` yayında **false** kalmalıdır. (Kayıt cihazda saklandığı için kararlı bir oyuncu yine de kendi kaydını düzenleyebilir; bkz. "Güvenlik".)

## 2) Reklamlar (Google AdMob)

1. https://admob.google.com → hesap aç → **Uygulama ekle** (Android).
2. Üç **reklam birimi** oluşturun: *Ödüllü*, *Geçiş (Interstitial)*, *Banner*.
3. Eklentiyi kurun (bilgisayarınızda):
   ```bash
   npm i @capacitor-community/admob
   npx cap sync android
   ```
   (`package.json` ve `package-lock.json` değişir; GitHub Actions'taki derleme `npm ci` + `npx cap sync` yaptığı için sonraki APK'lara otomatik girer.)
4. `android/app/src/main/AndroidManifest.xml` içindeki `<application>` etiketine **AdMob uygulama kimliğinizi** ekleyin:
   ```xml
   <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
   ```
5. `www/js/monetize-config.js` içinde `rewardedId`, `interstitialId`, `bannerId` alanlarını doldurun. Denerken `testMode: true` kalsın (Google'ın test reklamları gelir); **yayından önce `false` yapın**.
6. **Onay (GDPR/UMP):** AB/İngiltere kullanıcıları için AdMob "Gizlilik ve mesajlaşma" bölümünden onay formu oluşturun. Mağazadaki *Reklam gizlilik tercihleri* düğmesi bu formu açar (eklenti destekliyorsa).
7. Kendi test cihazınızı AdMob'a ekleyin; **kendi reklamınıza kendiniz tıklamayın** (hesap kapatılabilir).

Reklam sıklığı ve ödül miktarları aynı dosyada: `rewardedPerDay`, `rewardedGems`, `rewardedCoins`, `interstitialEvery`, `interstitialMinLevel`, `interstitialMinGapSec`, `doubleWinReward`.

## 3) Elmas paketleri (Google Play Faturalandırma)

1. Google Play Console'da uygulamayı oluşturun (ücretli geliştirici hesabı gerekir) ve **Para kazanma → Ürünler → Uygulama içi ürünler** altında şu kimliklerle ürün açın (kimlikleri `monetize-config.js` içinde değiştirebilirsiniz, ikisi aynı olmalı):

   | Kimlik | Tür | Önerilen fiyat |
   |---|---|---|
   | `sefervakti_gems_80` | Tüketilebilir | $0.99 |
   | `sefervakti_gems_450` | Tüketilebilir | $4.99 |
   | `sefervakti_gems_1000` | Tüketilebilir | $9.99 |
   | `sefervakti_gems_2200` | Tüketilebilir | $19.99 |
   | `sefervakti_gems_6000` | Tüketilebilir | $49.99 |
   | `sefervakti_starter` | Tüketilemez (tek seferlik) | $1.99 |
   | `sefervakti_noads` | Tüketilemez (tek seferlik) | $3.99 |
2. Eklentiyi kurun: `npm i cordova-plugin-purchase` → `npx cap sync android`.
3. Uygulamayı **imzalı** (anahtar deposu secret'ları zaten Actions'ta) sürümle Play Console'a *iç test* kanalına yükleyin; test hesabı ekleyip satın almayı deneyin (gerçek para çekilmez).
4. Mağazadaki fiyat metinleri Play'den gelen yerel fiyatla otomatik güncellenir; gelmezse `monetize-config.js` içindeki `price` yedeği gösterilir.

### Güvenlik (önemli)
Oyun şu an **istemci tarafında** çalışır: kayıt cihazda saklanır ve makbuz sunucuda doğrulanmaz. Yani kararlı bir kullanıcı kayıt dosyasını düzenleyip elmas ekleyebilir (tek oyunculu oyunlarda yaygın bir durum). Gerçek gelir güvenliği için ileride bir **sunucu** (Google Play Developer API ile makbuz doğrulama) ve hesap sistemi gerekir. Aynı makbuz iki kez işlenmez (`iap.tokens`).

## 4) Yayın öncesi kontrol listesi
- [ ] `monetize-config.js`: gerçek reklam birimi kimlikleri, `testMode: false`
- [ ] `AndroidManifest.xml`: AdMob uygulama kimliği
- [ ] Play Console ürünleri açıldı, iç testte satın alma denendi, **satın alımları geri yükle** denendi
- [ ] **Gizlilik politikası** adresi hazır → `links.privacy` (Play Store için zorunlu; reklam ve satın alma kullanan uygulamalarda şart); *Veri güvenliği* formu dolduruldu
- [ ] Çocuklara yönelik değilse hedef kitle ayarı doğru (Aile Politikası)
- [ ] Mağaza açıklamasında "Reklam içerir" / "Uygulama içi satın alma" işaretlendi

## 5) Başka bir SDK kullanmak (Unity Ads, AppLovin, ...)
`Z.Monetize.registerProvider({...})` ile kendi sağlayıcınızı verin. Arayüz:

```js
{ ads: true, iap: true,
  init(config) {},
  showRewarded(placement) -> Promise<boolean>   // true = ödül hak edildi
  showInterstitial()      -> Promise<void>
  banner(show)            // bool
  products(ids)           -> Promise<[{id, price}]>
  purchase(id)            -> Promise<{ok: bool, token: string}>
  restore()               -> Promise<[ürünKimliği]>
  privacyOptions()        -> Promise<void> }
```
Örnek: `www/js/monetize-providers.js` (test ve yerli sağlayıcı).

## 6) Dosyalar
- `www/js/monetize-config.js` — **sizin ayarlarınız** (kimlikler, fiyatlar, sıklıklar, bağlantılar)
- `www/js/monetize.js` — mantık (sınırlar, ödül verme, makbuz tekrar koruması)
- `www/js/monetize-providers.js` — test ve yerli sağlayıcılar
- `www/js/ui.js` — Mağaza sekmesi (`renderShop`), sonuç ekranı reklam düğmeleri
- Testler: `tests/unit-v08.js`, `tests/e2e-v08.js`


## Elmas fiyatlandırması (v0.10.2)
Elmas harcama yerleri, satın alma paketlerine (`Z.MONEY.products`: 80 / 450 / 1000 / 2200 / 6000 💎 + başlangıç paketi 300 💎) göre kurgulandı; ücretsiz kazanç (bölüm/görev/günlük/reklam) ilk kahramana yaklaşık 25-30. bölümde yetişir, sonrakiler satın almaya yönlendirir:

| Ürün | Elmas | Neden bu fiyat |
|---|---|---|
| Yıldız Hatun (kahraman 2) | 250 | Başlangıç paketi (300 💎, $1.99) ile hemen alınır; en küçük paketle (80) alınamaz |
| Demir Bey | 400 | 450'lik paketin içinde |
| Buz Hatun | 600 | 1000'lik pakete yönlendirir |
| Ejder Hatun | 900 | 1000'lik paket tek başına yeter |
| Altın Kesesi / Bonus Çark Hakkı | 25 | En küçük paketin üçte biri |
| Hazine Hızlandırma | 35 | |
| Büyük Sandık | 100 | |
| Hazırlık kartı ×3 (altın / hazır yetenek / kamp çiti) | 75 / 75 / 100 | |
| Şans çarkı (günlük hak bittikten sonra) | 15 | |

- Fiyatlar `data.js` içinde (`Z.HEROES[..].gems`, `Z.MARKET`, `Z.BOOSTERS`, `Z.WHEEL_COST`); `tests/unit-v10.js` kahraman fiyatlarının artan olduğunu ve paket aralığında kaldığını denetler.
- Elmas yetmeyince `UI.needGems(fiyat)` eksik miktarı ve gereken en küçük paketi gösterip mağazaya götürür.
- Ücretsiz elmas kaynakları (ödüller, görevler, reklam: günde en fazla `rewardedPerDay × rewardedGems`) bilerek sınırlı tutuldu; artırmak dönüşümü düşürür.
