// Google Play gorselleri (ozet betik): node store/make-graphics.js [yerel,...]
//   1) store/make-feature.js  -> images/featureGraphic.jpg (1024x500)
//   2) store/make-screens.js  -> images/phoneScreenshots/*.jpg (6 x 1080x1920) + images/icon.png
// Ikisi de canli oyunu (www/index.html) Playwright ile acip cekim yapar; arayuz degisince yeniden calistirin.
// Eski sablon uretici kaldirildi: bu dosya yalnizca yukaridaki iki betigi sirayla calistirir.
const { execFileSync } = require('child_process'), path = require('path');
const args = process.argv.slice(2);
['make-feature.js', 'make-screens.js'].forEach(f => execFileSync(process.execPath, [path.join(__dirname, f)].concat(args), { stdio: 'inherit' }));
