/* Hidden North — checkout flow with a swappable payment adapter.
   DEMO adapter simulates a successful charge (no real money).
   To go live: implement SquarePaymentAdapter (see bottom) and a
   server endpoint that creates the payment with Square's API. */
(function () {
  'use strict';

  var booking = null, tour = null, step = 1;
  var LOCALE = { ja: 'ja-JP', zh: 'zh-TW', en: 'en-US' };

  function total() { return tour.price * booking.pax; }
  function fmtDate(iso) {
    try { return new Date(iso + 'T00:00:00').toLocaleDateString(LOCALE[HN.getLang()] || 'ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return iso; }
  }

  function renderSummary() {
    var el = document.getElementById('summary');
    el.innerHTML =
      '<div class="summary-box__media"><img src="' + HN.esc(tour.image) + '" alt=""></div>' +
      '<div class="summary-box__body">' +
        '<div class="tcard__area" style="margin:0 0 4px">' + HN.esc(HN.pick(tour.area)) + '</div>' +
        '<h3 class="serif">' + HN.esc(HN.pick(tour.title)) + '</h3>' +
        '<div class="srow"><span>' + HN.esc(HN.t('checkout.date')) + '</span><span>' + HN.esc(fmtDate(booking.date)) + '</span></div>' +
        '<div class="srow"><span>' + HN.esc(HN.t('checkout.participants')) + '</span><span>' + booking.pax + ' ' + HN.esc(HN.t('common.people')) + '</span></div>' +
        '<div class="srow"><span>' + HN.esc(HN.t('checkout.subtotal')) + '</span><span>' + HN.yen(tour.price) + ' × ' + booking.pax + '</span></div>' +
        '<div class="srow total"><span>' + HN.esc(HN.t('checkout.total')) + '</span><span class="v">' + HN.yen(total()) + '</span></div>' +
      '</div>';
  }

  function renderReview() {
    var el = document.getElementById('co-review');
    function row(k, v) { return '<div class="srow"><span>' + HN.esc(k) + '</span><span>' + HN.esc(v) + '</span></div>'; }
    el.innerHTML =
      '<div class="summary-box" style="border-radius:3px">' +
        '<div class="summary-box__body">' +
          '<div class="tcard__area" style="margin:0 0 4px">' + HN.esc(HN.pick(tour.area)) + '</div>' +
          '<h3 class="serif" style="font-size:19px">' + HN.esc(HN.pick(tour.title)) + '</h3>' +
          row(HN.t('common.duration'), HN.pick(tour.duration)) +
          row(HN.t('checkout.date'), fmtDate(booking.date)) +
          row(HN.t('checkout.participants'), booking.pax + ' ' + HN.t('common.people')) +
          '<div class="srow total"><span>' + HN.esc(HN.t('checkout.total')) + '</span><span class="v">' + HN.yen(total()) + '</span></div>' +
        '</div>' +
      '</div>';
    var amt = document.getElementById('pay-amt'); if (amt) amt.textContent = HN.yen(total());
  }

  function goStep(n) {
    step = n;
    document.querySelectorAll('[data-step]').forEach(function (s) {
      s.hidden = (Number(s.getAttribute('data-step')) !== n);
    });
    document.querySelectorAll('.co-steps .s').forEach(function (s) {
      var i = Number(s.getAttribute('data-si'));
      s.classList.toggle('is-active', i === n);
      s.classList.toggle('is-done', i < n);
    });
    var top = document.querySelector('.co-steps');
    if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function showErr(id, key) {
    var input = document.getElementById(id);
    var p = document.querySelector('[data-err-for="' + id + '"]');
    if (input) input.classList.toggle('is-error', !!key);
    if (p) p.textContent = key ? HN.t(key) : '';
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  // ---------- payment adapters ----------
  var DemoPaymentAdapter = {
    // Validates the demo card fields superficially and simulates a charge.
    charge: function (amountJPY, card) {
      return new Promise(function (resolve, reject) {
        var num = (card.number || '').replace(/\s/g, '');
        if (!card.name || num.length < 12 || !/^\d{2}\s*\/\s*\d{2}$/.test(card.exp || '') || (card.cvc || '').length < 3) {
          reject({ code: 'invalid' }); return;
        }
        setTimeout(function () { resolve({ ok: true, id: 'demo_' + Date.now() }); }, 1100);
      });
    }
  };
  var Payment = DemoPaymentAdapter; // swap for SquarePaymentAdapter when live

  function doPay() {
    var card = {
      name: document.getElementById('p-name').value.trim(),
      number: document.getElementById('p-num').value.trim(),
      exp: document.getElementById('p-exp').value.trim(),
      cvc: document.getElementById('p-cvc').value.trim()
    };
    ['p-name', 'p-num', 'p-exp', 'p-cvc'].forEach(function (id) { showErr(id, null); });
    var ok = true;
    if (!card.name) { showErr('p-name', 'form.errRequired'); ok = false; }
    if (card.number.replace(/\s/g, '').length < 12) { showErr('p-num', 'form.errRequired'); ok = false; }
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(card.exp)) { showErr('p-exp', 'form.errRequired'); ok = false; }
    if (card.cvc.length < 3) { showErr('p-cvc', 'form.errRequired'); ok = false; }
    if (!ok) return;

    var btn = document.getElementById('pay-btn');
    btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    var label = btn.querySelector('[data-i18n]'); var prev = label.textContent;
    label.textContent = HN.t('checkout.processing');
    document.getElementById('pay-amt').textContent = '';

    Payment.charge(total(), card).then(function (res) {
      var conf = {
        ref: HN.ref(), id: tour.id, date: booking.date, pax: booking.pax, total: total(),
        name: document.getElementById('c-name').value.trim(),
        email: document.getElementById('c-email').value.trim(),
        paymentId: res.id
      };
      try { sessionStorage.setItem('hn-confirm', JSON.stringify(conf)); } catch (e) {}
      location.href = 'confirmation.html';
    }).catch(function () {
      btn.disabled = false; btn.removeAttribute('aria-busy');
      label.textContent = prev; document.getElementById('pay-amt').textContent = HN.yen(total());
      showErr('p-num', 'form.errRequired');
    });
  }

  // ---------- input niceties ----------
  function fmtCard() {
    var el = document.getElementById('p-num');
    el.addEventListener('input', function () {
      var v = el.value.replace(/\D/g, '').slice(0, 16);
      el.value = v.replace(/(.{4})/g, '$1 ').trim();
    });
    var exp = document.getElementById('p-exp');
    exp.addEventListener('input', function () {
      var v = exp.value.replace(/\D/g, '').slice(0, 4);
      exp.value = v.length > 2 ? v.slice(0, 2) + ' / ' + v.slice(2) : v;
    });
    var cvc = document.getElementById('p-cvc');
    cvc.addEventListener('input', function () { cvc.value = cvc.value.replace(/\D/g, '').slice(0, 4); });
  }

  function init() {
    booking = HN.getBooking();
    if (!booking || !booking.id) { document.getElementById('co-empty').hidden = false; return; }
    HN.loadTours().then(function (data) {
      tour = (data.tours || []).filter(function (t) { return t.id === booking.id; })[0] || null;
      if (!tour) { document.getElementById('co-empty').hidden = false; return; }
      document.getElementById('co-main').hidden = false;
      renderSummary(); renderReview();
      HN.onLang(function () { renderSummary(); renderReview(); });

      document.getElementById('to-2').addEventListener('click', function () { goStep(2); });
      document.getElementById('back-1').addEventListener('click', function () { goStep(1); });
      document.getElementById('back-2').addEventListener('click', function () { goStep(2); });

      document.getElementById('cust-form').addEventListener('submit', function (e) {
        e.preventDefault();
        ['c-name', 'c-email', 'c-agree'].forEach(function (id) { showErr(id, null); });
        var ok = true;
        var nm = document.getElementById('c-name').value.trim();
        var em = document.getElementById('c-email').value.trim();
        if (!nm) { showErr('c-name', 'form.errRequired'); ok = false; }
        if (!em) { showErr('c-email', 'form.errRequired'); ok = false; }
        else if (!validEmail(em)) { showErr('c-email', 'form.errEmail'); ok = false; }
        if (!document.getElementById('c-agree').checked) { showErr('c-agree', 'form.errRequired'); ok = false; }
        if (!ok) { var f = document.querySelector('#cust-form .is-error'); if (f) f.focus(); return; }
        goStep(3);
      });

      fmtCard();
      document.getElementById('pay-form').addEventListener('submit', function (e) { e.preventDefault(); doPay(); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () { HN.ready.then(init); });

  /* ---------------------------------------------------------------
     GOING LIVE WITH SQUARE (reference)
     1. Load SDK in <head>: <script src="https://web.squarecdn.com/v1/square.js"></script>
     2. var payments = Square.payments(APP_ID, LOCATION_ID);
        var card = await payments.card(); await card.attach('#card-container');
     3. var SquarePaymentAdapter = {
          charge: async function (amountJPY) {
            var r = await card.tokenize();
            if (r.status !== 'OK') throw r;
            // send r.token + amount to YOUR server, which calls Square Payments API
            var resp = await fetch('/api/create-payment', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sourceId: r.token, amount: amountJPY, currency: 'JPY' })
            });
            if (!resp.ok) throw new Error('payment failed');
            return resp.json();
          }
        };
        Then set:  Payment = SquarePaymentAdapter;  and replace the demo
        card fields with <div id="card-container"></div>.
     --------------------------------------------------------------- */
})();
