# İmza anahtarını gizleme + AdMob reklam ayarı

## 1) İmza anahtarı (keystore)
**Şu an:** anahtar depoda **yok** (git geçmişi dahil temiz; `.gitignore` ve CI "Gizli dosya denetimi" adımı yeni sızıntıyı engeller). CI anahtarı kendisi üretip **Actions önbelleğinde** tutuyor. Önbellek 7 gün hiç kullanılmazsa silinir ve bir sonraki derleme *farklı* bir anahtar üretir; bu yüzden anahtarı kalıcı **Secrets**'a taşıyın (bir kez).

1. GitHub → **Settings → Secrets and variables → Actions → Secrets → New repository secret**
   Ad: `KEYSTORE_EXPORT_PASSPHRASE`, değer: en az 16 karakterli uzun bir parola (not edin, sohbette paylaşmayın).
2. **Actions → "Imza anahtarini guvenle disa aktar" → Run workflow.** Bitince çalışmanın sayfasından **anahtar-sifreli** artifact'ını indirin (zip içinde `anahtar.enc`; 1 gün saklanır, AES-256 şifreli).
3. Kendi bilgisayarınızda (Git Bash / macOS / Linux terminali) şifresini çözün:
   `openssl enc -d -aes-256-cbc -pbkdf2 -iter 300000 -in anahtar.enc -out anahtar.txt`
   (parolayı sorar). `anahtar.txt` içinde üç satır vardır: `ALIAS=…`, `PASSWORD=…`, `KEYSTORE_B64=…`.
4. Aynı yerden üç **Secret** oluşturun (değer = `=` işaretinden sonrası):
   `CASTLESIEGE_KEY_ALIAS` ← ALIAS, `CASTLESIEGE_KEYSTORE_PASSWORD` ← PASSWORD, `CASTLESIEGE_KEYSTORE_B64` ← KEYSTORE_B64.
5. `anahtar.txt` ve `anahtar.enc` dosyalarını **silin**, `KEYSTORE_EXPORT_PASSPHRASE` secret'ını silin. Anahtarın bir yedeğini parola yöneticinizde (şifreli) tutun: kaybolursa Play Console'dan "yükleme anahtarı sıfırlama" istemek gerekir.

Sonraki derlemeler günlükte "Kalici anahtar (secret) kullaniliyor" yazar; imza aynı kalır, önbellek önemini yitirir.

## 2) AdMob reklam kimlikleri
Kimlikler **gizli değildir** (APK içinde görünür); gizli olan hesap şifreniz ve imza anahtarıdır.

1. https://admob.google.com → **Uygulamalar → Uygulama ekle → Android**. Uygulama Play'de yayında değilse "Hayır" seçin, adı *Castle Siege: History* yazın. **Uygulama kimliği** `ca-app-pub-…~…` (tilde ile).
2. Uygulamada 3 **reklam birimi** oluşturun: **Ödüllü**, **Geçiş (Interstitial)**, **Banner**. Her birinin kimliği `ca-app-pub-…/…` (slash ile).
3. Kimlikleri verin (ikisinden biri):
   - **Kolay yol:** 4 kimliği bana yazın, `config/admob.json` dosyasına ben işlerim; **ya da**
   - GitHub → Settings → Secrets and variables → Actions → **Variables**: `ADMOB_APP_ID`, `ADMOB_REWARDED_ID`, `ADMOB_INTERSTITIAL_ID`, `ADMOB_BANNER_ID`.
   (Değişkenler doluysa dosyadan önceliklidir.)
4. Dört kimlik de geçerliyse CI otomatik `testMode=false` yapar ve gerçek kimlikleri yazar; biri eksik/bozuksa ya da Google'ın test kimliğiyse reklamlar **test modunda** kalır (güvenli varsayılan, uyarı yazar). Derleme günlüğünde "reklam: gercek kimlikler yazildi" görünmeli.
5. AdMob → **Gizlilik ve mesajlaşma**: AB/İngiltere için **GDPR onay formu** oluşturup yayınlayın (oyundaki *Ayarlar → Reklam gizlilik tercihleri* bunu açar).
6. Play Console → **Uygulama içeriği → Reklamlar: "Evet, reklam içeriyor"**. Uygulama Play'de yayına çıkınca AdMob'da uygulamayı mağaza girişine **bağlayın**.
7. Telefonda test: kendi cihazınızı AdMob'a **test cihazı** ekleyin; **kendi reklamınıza tıklamayın** (hesap kapatılabilir).
