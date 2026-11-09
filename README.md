# Dokun!

Aynı telefonu paylaşan 2-4 arkadaş için hızlı mini oyunlar. Ekran oyuncu sayısına göre bölünür, üstteki oyuncular karşıdan oynar. Çoklu dokunuş desteklenir. Tek dosya (`index.html`), harici dosya yok.

Mini oyunlar (7 tur, her biri bir kez, rastgele sırayla):
- **Tepki:** yeşil olunca ilk dokunan kazanır, erken dokunan o turdan elenir.
- **Seri Dokun:** 5 saniyede en çok dokunan kazanır.
- **Tam Ortada:** kayan topu ortadaki çizgiye en yakın durduran kazanır.
- **Hedef Avı:** çıkan daireye dokun, 6 hedefe ilk ulaşan kazanır.
- **Sayı Sırası:** 1'den 6'ya sırayla dokun, ilk bitiren kazanır.
- **Tek Farklı:** farklı emojiyi ilk bulan kazanır, yanlış dokunan 1,2 sn cezalı.
- **Tut ve Bırak:** basılı tut, tam 3 saniye dolunca bırak. Sayaç ilk 1 saniye görünür, sonra gizlenir.

Ses ve titreşim: tüm sesler Web Audio ile kodla üretilir (dosya yok). Titreşim `navigator.vibrate` ile çalışır; iPhone Safari titreşimi desteklemez, orada yalnızca ses olur. Menüden açılıp kapatılır, tercih hatırlanır.

## Oynamak
Canlı adres (varsayılan dala birleşince yayınlanır): https://erenmaral.github.io/erenmaral/
Telefonda dikey kullan. Yerelde: `npx serve .` veya `index.html` dosyasını tarayıcıda aç.

## Yayın
`.github/workflows/pages.yml` varsayılan daldaki `index.html` dosyasını GitHub Pages'e yayınlar.
Bir kez: depo → Settings → Pages → Source: **GitHub Actions**.
