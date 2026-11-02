# ⚔️ Zafarion

2D strateji ve savaş oyunu (Android). Tamamen HTML5 canvas ile yazılmıştır, Capacitor ile APK'ya sarılır.
Hiçbir harici görsel/ses dosyası kullanılmaz — her şey kodla üretilir (telif sorunu yok).

## APK nasıl alınır?
Her `push` sonrası GitHub Actions otomatik APK derler:
**GitHub → bu depo → Releases** → en yeni `Zafarion x.y.z.N` sürümündeki `.apk` dosyasını telefonda indirip kur
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
python3 scripts/make-icons.py         # ikon / açılış ekranı yeniden üret
```

## Yapı
| Yol | Görev |
|---|---|
| `www/js/data.js` | Birlikler, kahramanlar, bölümler, **denge sayıları** |
| `www/js/sim.js` | Savaş simülasyonu (DOM'dan bağımsız, Node'da test edilir) |
| `www/js/render.js` | Canvas çizimi: birlikler, kaleler, efektler |
| `www/js/ui.js` | Menüler, modallar, savaş HUD'u |
| `www/js/save.js` | Kayıt (localStorage), hazine, günlük ödül/görev |
| `android/` | Capacitor Android projesi |
| `.github/workflows/android.yml` | Otomatik APK derleme + Release |

## İmza anahtarı (güncellemelerin üst üste kurulması için — bir kez yapılır)
Anahtar ve şifre **depoda tutulmaz**. Bir kez kendi anahtarınızı üretip GitHub Secrets'a ekleyin:
```bash
keytool -genkeypair -keystore zafarion.keystore -storetype PKCS12 -alias zafarion -keyalg RSA -keysize 2048 -validity 36500
base64 -w0 zafarion.keystore   # çıktıyı kopyalayın
```
GitHub → Settings → Secrets and variables → Actions → **New repository secret**:
- `ZAFARION_KEYSTORE_B64` = base64 çıktısı
- `ZAFARION_KEYSTORE_PASSWORD` = keytool'a girdiğiniz şifre (store ve key şifresi aynı olmalı)

Secret'lar yoksa CI geçici bir anahtar üretir: APK yine kurulur, ama bir sonraki sürümü kurmadan önce eskisini silmeniz gerekir (kayıt gider).
**Anahtar dosyasını ve şifresini asla depoya koymayın; kaybederseniz uygulamayı güncelleyemezsiniz, yedekleyin.**
