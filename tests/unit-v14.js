// v0.13.2: imza anahtari gizliligi + AdMob kimlik kaynagi (scripts/play-config.js --check)
const assert = require('assert'), { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const R = (...p) => path.join(__dirname, '..', ...p);
let n = 0; const ok = m => { n++; console.log('  ✓', m); };
const run = env => spawnSync('node', [R('scripts', 'play-config.js'), '--check'], { env: Object.assign({ PATH: process.env.PATH }, env), encoding: 'utf8' }).stdout;
const REAL = { ADMOB_APP_ID: 'ca-app-pub-1234567890123456~1234567890', ADMOB_REWARDED_ID: 'ca-app-pub-1234567890123456/1111111111', ADMOB_INTERSTITIAL_ID: 'ca-app-pub-1234567890123456/2222222222', ADMOB_BANNER_ID: 'ca-app-pub-1234567890123456/3333333333' };
assert(/TEST modu/.test(run({})), 'kimlik yok: test modu'); ok('Kimlik yoksa reklamlar TEST modunda');
assert(/gercek kimlikler/.test(run(REAL)), 'gecerli kimlikler'); ok('4 geçerli kimlik varsa gerçek mod');
assert(/TEST modu/.test(run(Object.assign({}, REAL, { ADMOB_BANNER_ID: '' }))), 'eksik'); ok('Biri eksikse güvenli tarafta kalır (test modu)');
assert(/TEST modu/.test(run(Object.assign({}, REAL, { ADMOB_BANNER_ID: 'ca-app-pub-3940256099942544/6300978111' }))), 'google test'); ok('Google test kimliği yayın sürümüne yazılmaz');
assert(/TEST modu/.test(run(Object.assign({}, REAL, { ADMOB_APP_ID: 'bozuk' }))), 'bozuk'); ok('Biçimi bozuk kimlik reddedilir');
const cfg = JSON.parse(fs.readFileSync(R('config', 'admob.json'), 'utf8')); assert(['appId', 'rewardedId', 'interstitialId', 'bannerId'].every(k => k in cfg)); ok('config/admob.json anahtarları tam');
const files = require('child_process').execSync('git ls-files', { cwd: R('.'), encoding: 'utf8' }).split('\n');
const bad = files.filter(f => /\.(jks|keystore|p12|pfx|pem|pepk)$/i.test(f) || /(^|\/)(pass|password|key)\.(txt|properties)$/i.test(f) || /^signing\//.test(f)); assert.deepStrictEqual(bad, [], 'depoda gizli dosya: ' + bad); ok('Depoda anahtar/sertifika/şifre dosyası yok');
const gi = fs.readFileSync(R('.gitignore'), 'utf8'); assert(['*.keystore', '*.jks', '*.p12', '*.pem', 'pass.txt'].every(x => gi.split('\n').includes(x))); ok('.gitignore anahtar dosyalarını kapsar');
const wf = fs.readFileSync(R('.github', 'workflows', 'export-signing-key.yml'), 'utf8'); assert(/openssl enc -aes-256-cbc -pbkdf2/.test(wf) && /retention-days: 1/.test(wf) && !/echo "\$\{?\{? ?secrets/.test(wf)); ok('Dışa aktarma iş akışı anahtarı yalnızca şifreli yazar');
console.log(n + ' test geçti');
