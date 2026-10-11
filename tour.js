/* Hidden North — tour detail page */
(function () {
  'use strict';
  var P = window.HNPricing;
  var tour = null, state = { date: '', adults: 0, children: 0, img: '' };

  function todayISO() {
    var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function fmtShort(iso) { var p = iso.split('-'); return p[0] + '/' + (+p[1]) + '/' + (+p[2]); }
  function stepper(key, label, unit) {
    var k = HN.esc(key);
    return '<div class="pax-row"><div class="pax-row__label">' + HN.esc(label) +
        (unit != null ? '<small>' + HN.yen(unit) + ' ' + HN.esc(HN.t('common.perPerson')) + '</small>' : '') + '</div>' +
      '<div class="pax-stepper">' +
        '<button type="button" data-step-key="' + k + '" data-step-dir="-1" aria-label="' + HN.esc(label + ' − ' + HN.t('aria.paxMinus')) + '">−</button>' +
        '<span id="pax-' + k + '" aria-live="polite">' + state[key] + '</span>' +
        '<button type="button" data-step-key="' + k + '" data-step-dir="1" aria-label="' + HN.esc(label + ' + ' + HN.t('aria.paxPlus')) + '">+</button>' +
      '</div></div>';
  }
  function li(items, cls) {
    return items.map(function (it) { return '<li>' + HN.esc(HN.pick(it)) + '</li>'; }).join('');
  }
  function metaItem(k, v) {
    return '<div class="detail-meta__item"><div class="k">' + HN.esc(k) + '</div><div class="v">' + HN.esc(v) + '</div></div>';
  }

  function render() {
    var root = document.getElementById('tour-root');
    if (!tour) { root.innerHTML = '<p class="section-lead">' + HN.esc(HN.t('detail.notFound')) + '</p>'; return; }
    if (!state.adults) state.adults = P.capacity(tour).min;
    var bd = P.bounds(tour, todayISO());
    if (!state.img) state.img = tour.image;

    var arr = function (x) { return Array.isArray(x) ? x : []; };
    var gallery = arr(tour.gallery).length ? arr(tour.gallery) : [tour.image];
    var thumbLabel = HN.esc(HN.t('aria.thumb'));
    var thumbs = gallery.map(function (g) {
      return '<button type="button" aria-label="' + thumbLabel + '" data-src="' + HN.esc(g) + '"' +
        (g === state.img ? ' aria-current="true"' : '') + '><img src="' + HN.esc(g) + '" alt="" loading="lazy"></button>';
    }).join('');

    var hl = arr(tour.highlights).length
      ? '<section class="detail-section"><h2 class="serif">' + HN.esc(HN.t('detail.highlights')) + '</h2><ul class="hl-list">' + li(arr(tour.highlights)) + '</ul></section>' : '';
    var itin = arr(tour.itinerary).length ? '<section class="detail-section"><h2 class="serif">' + HN.esc(HN.t('detail.itinerary')) + '</h2><ol class="timeline">' +
      arr(tour.itinerary).map(function (s) {
        return '<li><div class="t-time">' + HN.esc(s.time) + '</div><div><p class="t-title serif">' + HN.esc(HN.pick(s.title)) + '</p><p class="t-desc">' + HN.esc(HN.pick(s.desc)) + '</p></div></li>';
      }).join('') + '</ol></section>' : '';
    var inex = (arr(tour.included).length || arr(tour.excluded).length) ? '<section class="detail-section"><div class="inex">' +
      (arr(tour.included).length ? '<div><h3>' + HN.esc(HN.t('detail.included')) + '</h3><ul class="yes">' + li(arr(tour.included)) + '</ul></div>' : '') +
      (arr(tour.excluded).length ? '<div><h3>' + HN.esc(HN.t('detail.excluded')) + '</h3><ul class="no">' + li(arr(tour.excluded)) + '</ul></div>' : '') +
      '</div></section>' : '';
    var notes = (tour.meeting || arr(tour.notes).length) ? '<section class="detail-section"><h2 class="serif">' + HN.esc(HN.t('detail.notes')) + '</h2>' +
      (tour.meeting ? '<div class="meet-box"><div class="k">' + HN.esc(HN.t('detail.meeting')) + '</div><p>' + HN.esc(HN.pick(tour.meeting)) + '</p></div>' : '') +
      (arr(tour.notes).length ? '<ul class="hl-list">' + li(arr(tour.notes)) + '</ul>' : '') +
      '</section>' : '';

    var total = P.quote(tour, state).total;
    var cap = P.capacity(tour).min + '–' + P.capacity(tour).max + ' ' + HN.t('common.people');
    var season = (tour.season && tour.season.from && tour.season.to) ? fmtShort(tour.season.from) + ' – ' + fmtShort(tour.season.to) : '';
    var steppers = tour.child
      ? stepper('adults', HN.t('detail.adults'), tour.price) + stepper('children', HN.pick(tour.child.label) || HN.t('detail.children'), tour.child.price)
      : stepper('adults', HN.t('detail.participants'), null);

    var html =
      '<div class="detail-top">' +
        '<div class="detail-gallery">' +
          '<div class="detail-gallery__main"><img id="g-main" src="' + HN.esc(state.img) + '" alt="' + HN.esc(HN.pick(tour.title)) + '" width="1600" height="1000"></div>' +
          (gallery.length > 1 ? '<div class="detail-gallery__thumbs">' + thumbs + '</div>' : '') +
        '</div>' +
        '<div class="detail-intro">' +
          '<div class="eyebrow">' + HN.esc(HN.pick(tour.area)) + '</div>' +
          '<h1 class="serif" style="margin:14px 0 0;font-weight:600;font-size:clamp(26px,3.4vw,40px);letter-spacing:.06em;line-height:1.4">' + HN.esc(HN.pick(tour.title)) + '</h1>' +
          '<p class="section-lead">' + HN.esc(HN.pick(tour.summary)) + '</p>' +
          '<div class="detail-meta">' +
            metaItem(HN.t('common.duration'), HN.pick(tour.duration)) +
            metaItem(HN.t('common.area'), HN.pick(tour.area)) +
            metaItem(HN.t('common.capacity'), cap) +
            (season ? metaItem(HN.t('detail.season'), season) : '') +
            metaItem(HN.t('common.languages'), '中文 · 日本語 · English') +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="detail-body">' +
        '<div>' + hl + itin + inex + notes + '</div>' +
        '<aside>' +
          '<div class="book-box" id="book-box">' +
            '<div class="book-box__price">' + HN.yen(tour.price) + ' <small>' + HN.esc(HN.t('common.perPerson')) + '</small></div>' +
            '<div class="field" style="margin-top:20px"><label for="bk-date">' + HN.esc(HN.t('detail.selectDate')) + '</label>' +
              '<input type="date" id="bk-date" class="input" min="' + bd.min + '"' + (bd.max ? ' max="' + bd.max + '"' : '') + ' value="' + HN.esc(state.date) + '">' +
              '<p class="admin-note" style="margin-top:6px">' + HN.esc(HN.t('detail.leadNote')) + '</p></div>' +
            '<div class="field"><label>' + HN.esc(HN.t('detail.participants')) + '</label>' + steppers + '</div>' +
            '<div class="book-box__total"><span class="k">' + HN.esc(HN.t('detail.total')) + '</span><span class="v" id="bk-total">' + HN.yen(total) + '</span></div>' +
            '<button type="button" class="btn btn--primary btn--block" id="bk-go">' + HN.esc(HN.t('detail.bookNow')) + '</button>' +
            '<p class="err-msg" id="bk-err"></p>' +
            '<p class="admin-note" style="margin-top:6px">' + HN.esc(HN.t('notice.registration')) + '</p>' +
          '</div>' +
        '</aside>' +
      '</div>';
    root.innerHTML = html;

    // mobile sticky booking bar
    var existing = document.getElementById('tour-cta-bar'); if (existing) existing.remove();
    var bar = document.createElement('div');
    bar.className = 'tour-cta-bar'; bar.id = 'tour-cta-bar';
    bar.innerHTML = '<span class="p">' + HN.yen(tour.price) + ' <small>' + HN.esc(HN.t('common.perPerson')) + '</small></span>' +
      '<button type="button" class="btn btn--primary" id="cta-bar-btn">' + HN.esc(HN.t('nav.book')) + '</button>';
    document.body.appendChild(bar);
    document.body.classList.add('has-cta-bar');

    document.title = HN.pick(tour.title) + '｜Hidden North';
    wire();
  }

  function wire() {
    var dateEl = document.getElementById('bk-date');
    var totalEl = document.getElementById('bk-total');
    var err = document.getElementById('bk-err');
    var cap = P.capacity(tour);
    function updateTotal() { totalEl.textContent = HN.yen(P.quote(tour, state).total); }
    if (dateEl) dateEl.addEventListener('change', function () { state.date = this.value; err.textContent = ''; dateEl.classList.remove('is-error'); });
    document.querySelectorAll('[data-step-key]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-step-key'), dir = Number(btn.getAttribute('data-step-dir'));
        var pax = state.adults + state.children;
        if (dir > 0 && pax >= cap.max) return;
        if (dir < 0 && (pax <= cap.min || state[key] <= (key === 'adults' ? 1 : 0))) return;
        state[key] += dir;
        document.getElementById('pax-' + key).textContent = state[key];
        err.textContent = '';
        updateTotal();
      });
    });
    document.querySelectorAll('.detail-gallery__thumbs button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.img = this.getAttribute('data-src');
        document.getElementById('g-main').src = state.img;
        document.querySelectorAll('.detail-gallery__thumbs button').forEach(function (x) { x.removeAttribute('aria-current'); });
        this.setAttribute('aria-current', 'true');
      });
    });
    function proceed() {
      var errs = P.validate(tour, state, todayISO());
      if (errs.indexOf('date') >= 0) {
        err.textContent = HN.t(state.date ? 'detail.errDate' : 'form.errRequired');
        if (dateEl) { dateEl.classList.add('is-error'); dateEl.focus(); }
        return;
      }
      if (errs.length) { err.textContent = HN.t('detail.errPax'); return; }
      HN.saveBooking({ id: tour.id, date: state.date, adults: state.adults, children: state.children });
      location.href = 'checkout.html';
    }
    var go = document.getElementById('bk-go');
    if (go) go.addEventListener('click', proceed);
    var barBtn = document.getElementById('cta-bar-btn');
    if (barBtn) barBtn.addEventListener('click', function () {
      var box = document.getElementById('book-box');
      if (box) box.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      if (dateEl) setTimeout(function () { dateEl.focus(); }, 300);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var id = HN.qp('id');
    Promise.all([HN.ready, HN.loadTours()]).then(function (res) {
      var data = res[1];
      tour = (data.tours || []).filter(function (t) { return t.id === id && t.status !== 'draft'; })[0] || null;
      render();
      HN.onLang(render);
    });
  });
})();
