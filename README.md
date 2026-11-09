# ⚔️ Campaign Time (Sefer Vakti)

Oyunun adı **Campaign Time** — "Sefer Vakti"nin İngilizcesi; her dilde sabit kalır (`Z.NAME`, `www/js/version.js`).

**Dikey (portre)** 2D strateji ve savaş oyunu (Android). Tamamen HTML5 canvas ile yazılmıştır, Capacitor ile APK'ya sarılır.
Hiçbir harici görsel/ses dosyası kullanılmaz — her şey kodla üretilir (telif sorunu yok).

**6 dil** (Türkçe, English, Español, Português-BR, Русский, 简体中文), **mağaza ve reklam altyapısı** (bkz. `docs/MONETIZATION.md`).

**Her bölüm gerçek bir tarihî kuşatmadır** (Orléans 1429, Akka 1291, Kazan 1552, Malta 1565, Viyana 1683, İstanbul 1453…): sen **kampından** saldırırsın, düşman kalesindedir. İki savaş türü: 🏰 3 koridorlu **kale kuşatması** ve 🏕️ ordunu kamp önüne serbestçe yerleştirdiğin **kale önü muharebesi** (komutan, mevzi bayrakları, nehir geçitleri, orman, tepe). Kuşatma kuralları: Hendek, Yardım Ordusu, Abluka, Sağlam Surlar; kale yarıya inince **gedik** açılır.

## APK nasıl alınır?
Her `push` sonrası GitHub Actions otomatik APK derler:
**GitHub → bu depo → Releases** → en yeni `Campaign Time x.y.z.N` sürümündeki `.apk` dosyasını telefonda indirip kur
(Ayarlar'dan "bilinmeyen kaynaklardan yüklemeye" izin vermek gerekir).
Tüm sürümler aynı anahtarla imzalandığı için yeni APK eskisinin **üzerine kurulur, kayıtlarınız silinmez**.

## Tarayıcıda oyna (APK gerekmez)
Oyun GitHub Pages'te yayınlanır: **https://erenmaral.github.io/erenmaral/**
Telefonda Chrome'da açıp menüden **Ana ekrana ekle / Uygulamayı yükle** deyin: tam ekran, yatay, çevrimdışı çalışan bir uygulama gibi açılır.
Bir kez yapılacak ayar: depo → **Settings → Pages → Source: GitHub Actions**. (Kayıtlar tarayıcıya özeldir; APK ile tarayıcı sürümü kayıt paylaşmaz.)

## Geliştirme
```bash
npm ci
# Tarayıcıda dene: www/index.html dosyasını aç (veya `npx serve www`)
node tests/sim-balance.js 12          # denge botu: bölüm bazında kazanma oranı
node tests/sim-balance.js 8 -2        # 2 seviye geride bir oyuncu
node tests/sim-balance.js 6 0 endless # sonsuz mod
node tests/e2e-smoke.js               # Playwright ile ekran görüntülü duman testi
node tests/pwa-check.js <adres>       # manifest, service worker ve çevrimdışı açılış kontrolü
node tests/unit-features.js           # şifacı, aura, dondurma, ganimet, çark, kayıt göçü mantık testleri
node tests/e2e-v02.js                 # v0.2 özellikleri + eski kayıtla açılış (ekran görüntülü)
node tests/e2e-v03.js                 # dikey format, koridor seçimi, sefer kuralları
node tests/e2e-v04.js                 # günlük sefer, zorluk, pazar, kayıt taşıma, yeni diyarlar
node tests/gallery.js                 # tüm birliklerin yakın plan görsel galerisi (3 diyar)
node tests/perf.js                    # çizim maliyeti ölçümü
python3 scripts/make-icons.py         # ikon / açılış ekranı yeniden üret
```

## Yeni içerik eklemek
**[docs/ICERIK.md](docs/ICERIK.md)** — birlik, kahraman, diyar, kural, başarım ekleme adımları, denge ölçümü ve kayıt uyumluluğu kuralları.

## Yapı
| Yol | Görev |
|---|---|
| `www/js/data.js` | Birlikler, kahramanlar, bölümler, **denge sayıları** |
| `www/js/sim.js` | Savaş simülasyonu (DOM'dan bağımsız, Node'da test edilir) |
| `www/js/field.js` | **Açık alan** savaş simülasyonu (2D, arazi, komutan; Node'da test edilir) |
| `www/js/render.js` | Canvas çizimi: birlikler, kaleler, efektler |
| `www/js/fieldrender.js` | Açık alan çizimi: arazi, bayraklar, komutan, yerleştirme önizlemesi |
| `www/js/i18n.js`, `www/js/lang/*.js` | Çok dilli destek (`Z.t`), dil paketleri; araç: `scripts/i18n.js` |
| `www/js/monetize*.js` | Mağaza/reklam mantığı ve ayarları (`monetize-config.js` sizin ayar dosyanız) |
| `www/js/ui.js` | Ana menü, sefer merkezi (harita/ordu/hazine/görev), modallar, savaş HUD'u, etkileşimli öğretici |
| `www/js/save.js` | Kayıt (localStorage), hazine, günlük ödül/görev |
| `android/` | Capacitor Android projesi |
| `.github/workflows/android.yml` | Otomatik APK derleme + Release |

> **Not:** Oyun önceki sürümlerde *Zafarion* adını taşıyordu. Paket kimliği (`com.zafarion.game`), kayıt anahtarı ve `ZAFARION_*` secret adları, mevcut kurulumlar ve ilerleme bozulmasın diye bilerek değiştirilmedi.

## İmza anahtarı (güncellemelerin üst üste kurulması için — bir kez yapılır)
Anahtar ve şifre **depoda tutulmaz**. Bir kez kendi anahtarınızı üretip GitHub Secrets'a ekleyin:
```bash
keytool -genkeypair -keystore zafarion.keystore -storetype PKCS12 -alias zafarion -keyalg RSA -keysize 2048 -validity 36500
base64 -w0 zafarion.keystore   # çıktıyı kopyalayın
```
GitHub → Settings → Secrets and variables → Actions → **New repository secret**:
- `ZAFARION_KEYSTORE_B64` = base64 çıktısı
- `ZAFARION_KEYSTORE_PASSWORD` = keytool'a girdiğiniz şifre (store ve key şifresi aynı olmalı)

Secret'lar yoksa CI imza anahtarını **ilk derlemede üretip GitHub Actions önbelleğine kaydeder**; sonraki derlemeler aynı anahtarla imzalanır ve eski sürümün üzerine kurulur. Önbellek, 7 gün hiç erişilmezse (yani 7 gün derleme yapılmazsa) silinebilir; o zaman yeni anahtar üretilir ve bir kez eski uygulamayı silmek gerekir. **Garantili çözüm yukarıdaki secret'ları tanımlamaktır.**
Eski bir derleme kuruluysa ("paket mevcut uygulamayla çakışıyor" hatası): önce **Ayarlar → Kaydı dışa aktar** ile ilerlemenizi kopyalayın, uygulamayı silin, yeni APK'yı kurun, **Ayarlar → İçe aktar** ile kaydı geri yükleyin.
**Anahtar dosyasını ve şifresini asla depoya koymayın; kaybederseniz uygulamayı güncelleyemezsiniz, yedekleyin.**
