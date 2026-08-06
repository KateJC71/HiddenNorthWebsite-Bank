// Hidden North — language toggle
// Single state: lang = 'ja' | 'zh'. Default 'ja' (bank reviewers read Japanese).
// Persisted in localStorage; keeps <html lang> and data-lang in sync.
(function () {
  'use strict';

  var STORAGE_KEY = 'hn-lang';
  var VALID = { ja: true, zh: true };
  var root = document.documentElement;
  var buttons = document.querySelectorAll('[data-lang-set]');

  function apply(lang) {
    if (!VALID[lang]) lang = 'ja';
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang === 'zh' ? 'zh-Hant' : 'ja');
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      b.setAttribute('aria-pressed', b.getAttribute('data-lang-set') === lang ? 'true' : 'false');
    }
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  // Initial language: stored preference, else default 'ja'.
  var stored;
  try { stored = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  apply(VALID[stored] ? stored : 'ja');

  for (var i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function () {
      apply(this.getAttribute('data-lang-set'));
    });
  }
})();
