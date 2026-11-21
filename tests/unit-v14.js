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
const wf = fs.readFileSync(R('.github', 'workflows', 'seal-signing-key.yml'), 'utf8'), an = fs.readFileSync(R('.github', 'workflows', 'android.yml'), 'utf8');
assert(/openssl enc -aes-256-cbc -pbkdf2 -iter 600000/.test(wf) && /\[skip ci\]/.test(wf) && /\$\{#PP\} -lt 24/.test(wf) && !/echo "\$PASS"|cat "\$RUNNER_TEMP\/bundle/.test(wf)); ok('Mühürleme iş akışı: AES-256, ≥24 karakter parola, düz metin yazmaz, [skip ci]');
assert(/KS_PP: \$\{\{ secrets\.KEYSTORE_PASSPHRASE \}\}/.test(an) && /config\/signing\.enc/.test(an) && an.indexOf('if [ -n "$KS_B64"') < an.indexOf('elif [ -f config/signing.enc')) ; ok('Android derlemesi mühürlü anahtarı okur (öncelik: secret > mühürlü > önbellek)');
// mühür yuvarlama: gerçek openssl ile şifrele/çöz ve android.yml ayrıştırma satırlarını dene
const os = require('os'), cp = require('child_process'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-')), b64 = Buffer.from('FAKEKEYSTOREBYTES==').toString('base64');
fs.writeFileSync(path.join(tmp, 'b.txt'), 'ALIAS=castlesiege\nPASSWORD=abc123\nKEYSTORE_B64=' + b64 + '\n');
const E = { PATH: process.env.PATH, PP: 'x'.repeat(30) };
cp.execSync('openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass env:PP -in b.txt -out s.enc', { cwd: tmp, env: E });
const dec = cp.execSync('openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass env:PP -in s.enc', { cwd: tmp, env: E, encoding: 'utf8' });
const k = (n) => dec.split('\n').filter(l => l.startsWith(n + '=')).map(l => l.slice(n.length + 1))[0];
assert(k('ALIAS') === 'castlesiege' && k('PASSWORD') === 'abc123' && Buffer.from(k('KEYSTORE_B64'), 'base64').toString() === 'FAKEKEYSTOREBYTES==');
assert.throws(() => cp.execSync('openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass pass:yanlis -in s.enc', { cwd: tmp, stdio: 'pipe' })); ok('Mühür şifrele/çöz turu doğru; yanlış parola çözemez');
fs.rmSync(tmp, { recursive: true, force: true });
console.log(n + ' test geçti');
