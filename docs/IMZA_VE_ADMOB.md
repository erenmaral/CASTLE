# İmza anahtarını gizleme + AdMob reklam ayarı

## 1) İmza anahtarı (keystore) — tek secret ile kalıcı yap
**Şu an:** anahtar depoda **yok** (git geçmişi dahil temiz; `.gitignore` ve CI "Gizli dosya denetimi" yeni sızıntıyı engeller). CI anahtarı kendisi üretip **Actions önbelleğinde** tutuyor; önbellek 7 gün kullanılmazsa silinir ve sonraki derleme *farklı* anahtar üretir. Bunu kalıcı yapmak için anahtar parolayla **şifrelenip** `config/signing.enc` olarak depoya yazılır; derleme onu aynı parolayla çözer.

1. GitHub → **Settings → Secrets and variables → Actions → New repository secret**
   Ad: `KEYSTORE_PASSPHRASE`, değer: **en az 24 karakterli, rastgele uzun bir parola** (şifreli dosya depoda durduğu için güvenlik bu parolanın gücüne bağlı; parola yöneticisiyle üretin, sohbette paylaşmayın, bir yedeğini saklayın).
2. **Actions → "Imza anahtarini muhurle (elle calistirilir)" → Run workflow** (bu dalda). Önbellekte anahtar varsa **aynısı** şifrelenir (imza değişmez); yoksa yeni üretilir.
3. İş akışı yeşil bitince `config/signing.enc` dalda belirir. Sonraki her derleme günlüğünde **"Muhurlu kalici anahtar (config/signing.enc) kullaniliyor"** yazar.

Notlar: parola kaybolursa anahtar çözülemez (Play Console'dan "yükleme anahtarı sıfırlama" gerekir). Var olan `signing.enc` yanlışlıkla değiştirilmesin diye iş akışı `overwrite` işaretlenmedikçe durur. İsterseniz daha da güvenli yol: anahtarı 3 ayrı secret olarak (`CASTLESIEGE_KEYSTORE_B64`, `CASTLESIEGE_KEYSTORE_PASSWORD`, `CASTLESIEGE_KEY_ALIAS`) girmek; bunlar varsa öncelikli kullanılır.

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
