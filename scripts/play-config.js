// Yayin (Play Store) derlemesi icin reklam kimliklerini www/js/monetize-config.js icine yazar.
// Ortam degiskenleri (GitHub: Settings -> Secrets and variables -> Actions -> Variables):
//   ADMOB_APP_ID, ADMOB_REWARDED_ID, ADMOB_INTERSTITIAL_ID, ADMOB_BANNER_ID
// Hepsi doluysa testMode=false yapilir; eksikse Google TEST kimlikleri kalir ve uyari yazilir.
// Kullanim: node scripts/play-config.js [--check]   (--check: yalnizca durumu yazar, dosyayi degistirmez)
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', 'www', 'js', 'monetize-config.js');
const env = process.env, ids = { rewardedId: env.ADMOB_REWARDED_ID, interstitialId: env.ADMOB_INTERSTITIAL_ID, bannerId: env.ADMOB_BANNER_ID };
const full = !!env.ADMOB_APP_ID && /^ca-app-pub-\d+~\d+$/.test(env.ADMOB_APP_ID) && Object.keys(ids).every(k => /^ca-app-pub-\d+\/\d+$/.test(ids[k] || ''));
const warn = m => console.log('::warning::' + m);
if (!full) {
  warn('AdMob kimlikleri eksik/gecersiz: reklamlar Google TEST modunda. Yayin oncesi ADMOB_APP_ID, ADMOB_REWARDED_ID, ADMOB_INTERSTITIAL_ID, ADMOB_BANNER_ID degiskenlerini tanimlayin (docs/PLAY_STORE.md).');
  console.log('reklam: TEST modu'); process.exit(0);
}
if (process.argv.includes('--check')) { console.log('reklam: gercek kimlikler tanimli'); process.exit(0); }
let s = fs.readFileSync(file, 'utf8');
s = s.replace(/testMode:\s*true/, 'testMode: false');
Object.keys(ids).forEach(k => { s = s.replace(new RegExp(k + ":\\s*'[^']*'"), k + ": '" + ids[k] + "'"); });
fs.writeFileSync(file, s);
console.log('reklam: gercek kimlikler yazildi (testMode=false)');
