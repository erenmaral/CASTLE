// Yayin (Play Store) derlemesi icin reklam kimliklerini www/js/monetize-config.js icine yazar.
// Ortam degiskenleri (GitHub: Settings -> Secrets and variables -> Actions -> Variables):
//   ADMOB_APP_ID, ADMOB_REWARDED_ID, ADMOB_INTERSTITIAL_ID, ADMOB_BANNER_ID
// Ayni 4 kimlik config/admob.json dosyasina da yazilabilir (degisken yoksa o kullanilir).
// Hepsi doluysa testMode=false yapilir; eksikse Google TEST kimlikleri kalir ve uyari yazilir.
// Kullanim: node scripts/play-config.js [--check]   (--check: yalnizca durumu yazar, dosyayi degistirmez)
const fs = require('fs'), path = require('path');
const file = path.join(__dirname, '..', 'www', 'js', 'monetize-config.js');
// Oncelik: GitHub Variables (ortam degiskenleri) > config/admob.json (depoda, herkese acik kimlikler)
let cfgFile = {}; try { cfgFile = JSON.parse(fs.readFileSync(process.env.ADMOB_CONFIG_FILE || path.join(__dirname, '..', 'config', 'admob.json'), 'utf8')); } catch (e) { /* dosya yok: yalniz degiskenler */ }
const env = process.env, pick = (v, f) => (v && v.trim()) || (f && String(f).trim()) || '';
const appId = pick(env.ADMOB_APP_ID, cfgFile.appId);
const ids = { rewardedId: pick(env.ADMOB_REWARDED_ID, cfgFile.rewardedId), interstitialId: pick(env.ADMOB_INTERSTITIAL_ID, cfgFile.interstitialId), bannerId: pick(env.ADMOB_BANNER_ID, cfgFile.bannerId) };
const full = /^ca-app-pub-\d+~\d+$/.test(appId) && Object.keys(ids).every(k => /^ca-app-pub-\d+\/\d+$/.test(ids[k]));
// Google'in herkese acik TEST kimlikleri (ca-app-pub-3940256099942544) yayin surumune YAZILMAZ
const isGoogleTest = [appId].concat(Object.keys(ids).map(k => ids[k])).some(v => /ca-app-pub-3940256099942544/.test(v));
const warn = m => console.log('::warning::' + m);
if (!full || isGoogleTest) {
  warn('AdMob kimlikleri eksik/gecersiz: reklamlar Google TEST modunda. Yayin oncesi ADMOB_APP_ID, ADMOB_REWARDED_ID, ADMOB_INTERSTITIAL_ID, ADMOB_BANNER_ID degiskenlerini (GitHub Variables) ya da config/admob.json dosyasini doldurun (docs/IMZA_VE_ADMOB.md).');
  console.log('reklam: TEST modu'); process.exit(0);
}
if (process.argv.includes('--check')) { console.log('reklam: gercek kimlikler tanimli'); process.exit(0); }
// Manifest yer tutucusu (build.gradle ADMOB_APP_ID okur): sonraki CI adimlarina aktar
if (env.GITHUB_ENV) fs.appendFileSync(env.GITHUB_ENV, 'ADMOB_APP_ID=' + appId + '\n');
let s = fs.readFileSync(file, 'utf8');
s = s.replace(/testMode:\s*true/, 'testMode: false');
Object.keys(ids).forEach(k => { s = s.replace(new RegExp(k + ":\\s*'[^']*'"), k + ": '" + ids[k] + "'"); });
fs.writeFileSync(file, s);
console.log('reklam: gercek kimlikler yazildi (testMode=false)');
