/* =========================================================
   Hidden North — shared site script (v2)
   Trilingual i18n (ja default / zh-Hant / en), injected header
   & footer, mobile menu, reveal, and helpers (window.HN).
   ========================================================= */
(function () {
  'use strict';

  var STORE = 'hn-lang';
  var VALID = { ja: 1, zh: 1, en: 1 };
  var root = document.documentElement;
  var dict = {};
  var langCbs = [];
  var toursCache = null;

  function curLang() {
    var l = root.getAttribute('data-lang');
    return VALID[l] ? l : 'ja';
  }
  function htmlLangAttr(l) { return l === 'zh' ? 'zh-Hant' : (l === 'en' ? 'en' : 'ja'); }

  function t(key) {
    var d = dict[curLang()] || {};
    return (key in d) ? d[key] : key;
  }
  function pick(obj) {
    if (obj == null) return '';
    if (typeof obj === 'string') return obj;
    var l = curLang();
    return obj[l] || obj.ja || obj.en || obj.zh || '';
  }

  function applyI18n(scope) {
    scope = scope || document;
    var d = dict[curLang()] || {};
    scope.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n'); if (k in d) el.textContent = d[k];
    });
    scope.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-html'); if (k in d) el.innerHTML = d[k];
    });
    scope.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-ph'); if (k in d) el.setAttribute('placeholder', d[k]);
    });
    scope.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var k = el.getAttribute('data-i18n-aria'); if (k in d) el.setAttribute('aria-label', d[k]);
    });
  }

  function setLang(l) {
    if (!VALID[l]) l = 'ja';
    root.setAttribute('data-lang', l);
    root.setAttribute('lang', htmlLangAttr(l));
    try { localStorage.setItem(STORE, l); } catch (e) {}
    document.querySelectorAll('[data-lang-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang-set') === l ? 'true' : 'false');
    });
    applyI18n(document);
    langCbs.forEach(function (cb) { try { cb(l); } catch (e) {} });
    document.dispatchEvent(new CustomEvent('hn:lang', { detail: { lang: l } }));
  }

  function loadI18n() {
    return fetch('data/i18n.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (j) { dict = j || {}; })
      .catch(function () {});
  }
  function loadTours() {
    if (toursCache) return Promise.resolve(toursCache);
    return fetch('data/tours.json', { cache: 'no-cache' })
      .then(function (r) { return r.json(); })
      .then(function (j) { toursCache = j; return j; });
  }

  function yen(n) { try { return '¥' + Number(n).toLocaleString('ja-JP'); } catch (e) { return '¥' + n; } }
  function qp(name) { return new URLSearchParams(location.search).get(name); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function saveBooking(b) { try { sessionStorage.setItem('hn-booking', JSON.stringify(b)); } catch (e) {} }
  function getBooking() { try { return JSON.parse(sessionStorage.getItem('hn-booking') || 'null'); } catch (e) { return null; } }
  function ref() {
    var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
    return 'HN' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  // ---- chrome (header + footer) templates ----
  var LS =
    '<div class="langswitch" role="group" aria-label="Language" data-i18n-aria="aria.lang">' +
      '<button type="button" data-lang-set="ja">日本語</button>' +
      '<button type="button" data-lang-set="zh">繁中</button>' +
      '<button type="button" data-lang-set="en">EN</button>' +
    '</div>';

  function headerHTML(active, over) {
    function lnk(href, nav, key, def) {
      return '<a href="' + href + '" data-nav="' + nav + '"' + (nav === active ? ' aria-current="page"' : '') +
             ' data-i18n="' + key + '">' + def + '</a>';
    }
    return (
      '<header class="site-header' + (over ? ' site-header--over' : '') + '">' +
        '<a href="index.html" class="brand" aria-label="Hidden North">' +
          '<img class="logo-dark" src="assets/symbol-kon.svg" alt="" width="30" height="30">' +
          '<img class="logo-light" src="assets/symbol-white.svg" alt="" width="30" height="30">' +
          '<span class="brand__word"><span class="brand__latin">HIDDEN NORTH</span><span class="brand__cjk">北隱</span></span>' +
        '</a>' +
        '<nav class="site-nav" aria-label="Primary">' +
          '<div class="site-nav__links">' +
            lnk('tours.html', 'tours', 'nav.tours', 'ツアー') +
            lnk('custom.html', 'custom', 'nav.custom', 'オーダーメイド') +
            lnk('about.html', 'about', 'nav.about', '会社情報') +
            lnk('about.html#contact', 'contact', 'nav.contact', 'お問い合わせ') +
          '</div>' +
          LS +
          '<a href="tours.html" class="btn btn--outline btn-book" data-i18n="nav.book">空き状況・ご予約</a>' +
          '<button class="menu-toggle" aria-label="Menu" data-i18n-aria="aria.menu" aria-expanded="false" aria-controls="menu-panel">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>' +
          '</button>' +
        '</nav>' +
      '</header>' +
      '<div class="menu-backdrop" aria-hidden="true"></div>' +
      '<aside class="menu-panel" id="menu-panel" aria-label="Menu">' +
        '<button class="menu-panel__close" aria-label="Close" data-i18n-aria="aria.close"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '<a class="m-link" href="index.html" data-i18n="nav.home">ホーム</a>' +
        '<a class="m-link" href="tours.html" data-i18n="nav.tours">ツアー</a>' +
        '<a class="m-link" href="custom.html" data-i18n="nav.custom">オーダーメイド</a>' +
        '<a class="m-link" href="about.html" data-i18n="nav.about">会社情報</a>' +
        '<a class="m-link" href="about.html#contact" data-i18n="nav.contact">お問い合わせ</a>' +
        LS +
      '</aside>'
    );
  }

  function footerHTML() {
    return (
      '<footer class="footer2">' +
        '<div class="footer2__inner">' +
          '<div>' +
            '<div class="footer__brand" style="display:flex;align-items:center;gap:12px">' +
              '<img src="assets/symbol-white.svg" alt="" width="34" height="34">' +
              '<span class="footer__word" style="display:flex;align-items:baseline;gap:10px">' +
                '<span class="brand__latin">HIDDEN NORTH</span><span class="brand__cjk">北隱</span></span>' +
            '</div>' +
            '<p class="f-tag" data-i18n="footer.tagline">北方，留給懂的人。</p>' +
            '<p class="f-addr">Hidden North株式会社<br>北海道旭川市二条通三丁目２６０－２<br>Email：<a href="mailto:info@hidden-north.jp">info@hidden-north.jp</a></p>' +
          '</div>' +
          '<div>' +
            '<h4 data-i18n="footer.nav">サイトマップ</h4>' +
            '<nav class="f-links">' +
              '<a href="index.html" data-i18n="nav.home">ホーム</a>' +
              '<a href="tours.html" data-i18n="nav.tours">ツアー</a>' +
              '<a href="custom.html" data-i18n="nav.custom">オーダーメイド</a>' +
              '<a href="about.html" data-i18n="nav.about">会社情報</a>' +
              '<a href="about.html#contact" data-i18n="nav.contact">お問い合わせ</a>' +
            '</nav>' +
          '</div>' +
          '<div>' +
            '<h4>LANGUAGE</h4>' + LS +
            '<p class="f-addr" style="margin-top:20px" data-i18n="footer.registration">第2種旅行業 登録手続き中</p>' +
          '</div>' +
        '</div>' +
        '<div class="footer2__base">' +
          '<span data-i18n="footer.rights">© 2026 Hidden North Inc. All rights reserved.</span>' +
          '<span>Asahikawa · Hokkaido, Japan</span>' +
        '</div>' +
      '</footer>'
    );
  }

  function renderChrome() {
    var body = document.body;
    var active = body.getAttribute('data-page') || '';
    var over = body.getAttribute('data-hero-over') === 'true';
    var h = document.getElementById('site-header');
    var f = document.getElementById('site-footer');
    if (h) h.innerHTML = headerHTML(active, over);
    if (f) f.innerHTML = footerHTML();
  }

  function initHeader() {
    var header = document.querySelector('.site-header');
    if (header && header.classList.contains('site-header--over')) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    var toggle = document.querySelector('.menu-toggle');
    var panel = document.querySelector('.menu-panel');
    var backdrop = document.querySelector('.menu-backdrop');
    // closed by default: keep the off-screen panel out of the tab order
    if (panel) { panel.setAttribute('aria-hidden', 'true'); try { panel.inert = true; } catch (e) {} }
    function close() {
      if (panel && !panel.classList.contains('is-open')) return;
      if (panel) { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); try { panel.inert = true; } catch (e) {} }
      if (backdrop) backdrop.classList.remove('is-open');
      if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
      document.body.style.overflow = '';
    }
    function open() {
      if (panel) { panel.classList.add('is-open'); panel.removeAttribute('aria-hidden'); try { panel.inert = false; } catch (e) {} }
      if (backdrop) backdrop.classList.add('is-open');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      var cl = panel && panel.querySelector('.menu-panel__close'); if (cl) cl.focus();
    }
    if (toggle) toggle.addEventListener('click', function () {
      (panel && panel.classList.contains('is-open')) ? close() : open();
    });
    if (backdrop) backdrop.addEventListener('click', close);
    var cl = document.querySelector('.menu-panel__close');
    if (cl) cl.addEventListener('click', close);
    if (panel) panel.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  function initReveal() {
    document.documentElement.classList.add('js');
    var els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
    // safety: ensure everything is visible even if the observer never fires
    setTimeout(function () { els.forEach(function (el) { el.classList.add('is-in'); }); }, 1400);
  }

  function initLangButtons() {
    document.querySelectorAll('[data-lang-set]').forEach(function (b) {
      if (b.__hn) return; b.__hn = 1;
      b.addEventListener('click', function () { setLang(this.getAttribute('data-lang-set')); });
    });
  }

  var ready = loadI18n();
  window.HN = {
    ready: ready, t: t, pick: pick, applyI18n: applyI18n,
    getLang: curLang, setLang: setLang, onLang: function (cb) { langCbs.push(cb); },
    loadTours: loadTours, yen: yen, qp: qp, esc: esc,
    saveBooking: saveBooking, getBooking: getBooking, ref: ref,
    refreshChrome: function () { renderChrome(); afterChrome(); }
  };

  function afterChrome() {
    var stored; try { stored = localStorage.getItem(STORE); } catch (e) {}
    var initial = VALID[stored] ? stored : (root.getAttribute('data-lang') || 'ja');
    root.setAttribute('data-lang', initial);
    root.setAttribute('lang', htmlLangAttr(initial));
    document.querySelectorAll('[data-lang-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lang-set') === initial ? 'true' : 'false');
    });
    initLangButtons();
    initHeader();
  }

  function boot() {
    renderChrome();
    afterChrome();
    initReveal();
    ready.then(function () { applyI18n(document); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
