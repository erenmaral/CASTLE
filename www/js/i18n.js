// Sefer Vakti - cok dilli destek. Kaynak metinler Turkcedir; Z.t('Turkce metin') secili dile cevirir.
// Dil paketleri www/js/lang/<kod>.js dosyalarinda Z.PACK.<kod> = { 'Turkce metin': 'Ceviri', ... } biciminde.
// Dil degisince sayfa yenilenir (metinler yuklenirken secili dile gore olusturulur).
(function (Z) {
  'use strict';
  var KEY = 'sefervakti.lang';
  Z.LANGS = [
    { id: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { id: 'en', name: 'English', flag: '🇬🇧' },
    { id: 'es', name: 'Español', flag: '🇪🇸' },
    { id: 'pt', name: 'Português (Brasil)', flag: '🇧🇷' },
    { id: 'ru', name: 'Русский', flag: '🇷🇺' },
    { id: 'zh', name: '简体中文', flag: '🇨🇳' }
  ];
  Z.PACK = Z.PACK || {};
  Z.i18nMissing = {};
  function known(id) { return Z.LANGS.some(function (l) { return l.id === id; }) || id === 'xx'; }
  function detect() {
    if (typeof document === 'undefined') return 'tr'; // Node testleri: Turkce
    var list = (typeof navigator !== 'undefined' && (navigator.languages || [navigator.language])) || [];
    for (var i = 0; i < list.length; i++) {
      var p = String(list[i] || '').toLowerCase().slice(0, 2);
      if (known(p) && p !== 'xx') return p;
    }
    return list.length ? 'en' : 'tr'; // tarayici bilgisi yoksa (Node testleri) Turkce
  }
  var lang = 'tr';
  try {
    var saved = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    lang = saved && known(saved) ? saved : detect();
    if (!saved && typeof localStorage !== 'undefined') localStorage.setItem(KEY, lang);
  } catch (e) { lang = 'tr'; }
  Z.lang = lang;
  // secili dil paketini ayrisma sirasinda eszamanli yukle
  if (lang !== 'tr' && lang !== 'xx' && typeof document !== 'undefined' && document.readyState === 'loading') {
    document.write('<script src="js/lang/' + lang + '.js"><\/script>');
  }
  Z.t = function (s, vars) {
    var out = s;
    if (Z.lang === 'xx') out = '⟦' + s.trim() + '⟧';
    else if (Z.lang !== 'tr') {
      var pack = Z.PACK[Z.lang], m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), tr = pack && pack[m[2]];
      if (tr !== undefined && tr !== '') out = m[1] + tr + m[3]; else if (m[2]) Z.i18nMissing[m[2]] = 1;
    }
    if (vars) out = out.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] !== undefined ? vars[k] : '{' + k + '}'; });
    return out;
  };
  Z.setLang = function (id) {
    if (!known(id)) return false;
    try { localStorage.setItem(KEY, id); } catch (e) { /* engelli */ }
    if (typeof location !== 'undefined') location.reload(); else Z.lang = id;
    return true;
  };
  Z.langInfo = function () { return Z.LANGS.filter(function (l) { return l.id === Z.lang; })[0] || Z.LANGS[0]; };
  // Statik HTML: data-i18n ozniteligi olan ogelerin metnini cevirir
  Z.i18nDom = function () {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = Z.lang === 'xx' ? 'en' : Z.lang;
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      var src = el.getAttribute('data-i18n-src') || el.textContent; el.setAttribute('data-i18n-src', src); el.textContent = Z.t(src);
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-title]'), function (el) { el.setAttribute('aria-label', Z.t(el.getAttribute('data-i18n-title'))); });
  };
})(globalThis.Z = globalThis.Z || {});
