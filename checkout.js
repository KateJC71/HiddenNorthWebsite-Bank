/* Hidden North — checkout flow with a swappable payment adapter.
   Provider is chosen in payment-config.js:
   - 'demo'   simulates a successful charge (no real money)
   - 'square' tokenizes the card with the Square Web Payments SDK and
              sends it to /api/create-payment, which recomputes the price
              from data/tours.json and charges it with Square. */
(function () {
  'use strict';

  var P = window.HNPricing;
  var CFG = window.HN_PAYMENT || { provider: 'demo' };
  var booking = null, tour = null, q = null, step = 1;
  var LOCALE = { ja: 'ja-JP', zh: 'zh-TW', en: 'en-US' };

  function todayISO() { var d = new Date(), p = function (n) { return ('0' + n).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); }
  function fmtDate(iso) {
    try { return new Date(iso + 'T00:00:00').toLocaleDateString(LOCALE[HN.getLang()] || 'ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return iso; }
  }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function arr(x) { return Array.isArray(x) ? x : []; }

  function lineLabel(l) {
    if (l.key === 'child') return HN.pick(tour.child.label) || HN.t('detail.children');
    return tour.child ? HN.t('detail.adults') : HN.t('checkout.subtotal');
  }
  function partyText() {
    return q.pax + ' ' + HN.t('common.people') +
      (tour.child ? '（' + HN.t('detail.adults') + ' ' + q.adults + ' / ' + lineLabel({ key: 'child' }) + ' ' + q.children + '）' : '');
  }
  function linesHTML() {
    return q.lines.filter(function (l) { return l.qty > 0; }).map(function (l) {
      return '<div class="srow"><span>' + HN.esc(lineLabel(l)) + '</span><span>' + HN.yen(l.unit) + ' × ' + l.qty + '</span></div>';
    }).join('');
  }

  function renderSummary() {
    var el = document.getElementById('summary');
    el.innerHTML =
      '<div class="summary-box__media"><img src="' + HN.esc(tour.image) + '" alt=""></div>' +
      '<div class="summary-box__body">' +
        '<div class="tcard__area" style="margin:0 0 4px">' + HN.esc(HN.pick(tour.area)) + '</div>' +
        '<h3 class="serif">' + HN.esc(HN.pick(tour.title)) + '</h3>' +
        '<div class="srow"><span>' + HN.esc(HN.t('checkout.date')) + '</span><span>' + HN.esc(fmtDate(booking.date)) + '</span></div>' +
        '<div class="srow"><span>' + HN.esc(HN.t('checkout.participants')) + '</span><span>' + q.pax + ' ' + HN.esc(HN.t('common.people')) + '</span></div>' +
        linesHTML() +
        '<div class="srow total"><span>' + HN.esc(HN.t('checkout.total')) + '</span><span class="v">' + HN.yen(q.total) + '</span></div>' +
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
          row(HN.t('checkout.participants'), partyText()) +
          (tour.meeting ? row(HN.t('detail.meeting'), HN.pick(tour.meeting)) : '') +
          linesHTML() +
          '<div class="srow total"><span>' + HN.esc(HN.t('checkout.total')) + '</span><span class="v">' + HN.yen(q.total) + '</span></div>' +
        '</div>' +
      '</div>' +
      (arr(tour.notes).length ? '<ul class="hl-list" style="margin-top:22px">' +
        arr(tour.notes).map(function (n) { return '<li>' + HN.esc(HN.pick(n)) + '</li>'; }).join('') + '</ul>' : '');
    var amt = document.getElementById('pay-amt'); if (amt) amt.textContent = HN.yen(q.total);
  }

  // Tour-specific required checkboxes (e.g. "all guests are 20+").
  function renderConfirms() {
    var box = document.getElementById('c-confirms');
    var checked = {};
    box.querySelectorAll('input').forEach(function (i) { checked[i.id] = i.checked; });
    box.innerHTML = arr(tour.confirmations).map(function (c, i) {
      var id = 'c-conf-' + i;
      return '<label class="check-row"><input type="checkbox" id="' + id + '"' + (checked[id] ? ' checked' : '') + '><span>' + HN.esc(HN.pick(c)) + '</span></label>' +
        '<p class="err-msg" data-err-for="' + id + '"></p>';
    }).join('');
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
    if (n === 3 && Payment.prepare) Payment.prepare();
  }

  function showErr(id, key) {
    var input = document.getElementById(id);
    var p = document.querySelector('[data-err-for="' + id + '"]');
    if (input) input.classList.toggle('is-error', !!key);
    if (p) p.textContent = key ? HN.t(key) : '';
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  // Everything the server needs to price and record the order.
  function buildOrder() {
    return {
      ref: HN.ref(), tourId: tour.id, date: booking.date, adults: q.adults, children: q.children,
      total: q.total, lang: HN.getLang(), confirmed: true,
      customer: {
        name: val('c-name'), email: val('c-email'), phone: val('c-phone'),
        country: val('c-country'), hotel: val('c-hotel'), note: val('c-note')
      }
    };
  }

  // ---------- payment adapters ----------
  // Every adapter: charge(order) → Promise<{ id, receiptUrl? }>, rejecting with { code }.
  // code: 'invalid' (fix the form) | 'declined' | 'booking' | 'server'
  var DemoPaymentAdapter = {
    charge: function (order) {
      var card = { name: val('p-name'), number: val('p-num'), exp: val('p-exp'), cvc: val('p-cvc') };
      ['p-name', 'p-num', 'p-exp', 'p-cvc'].forEach(function (id) { showErr(id, null); });
      var ok = true;
      var em = /^(\d{2})\s*\/\s*(\d{2})$/.exec(card.exp);
      if (!card.name) { showErr('p-name', 'form.errRequired'); ok = false; }
      if (card.number.replace(/\s/g, '').length < 12) { showErr('p-num', 'form.errRequired'); ok = false; }
      if (!em || +em[1] < 1 || +em[1] > 12) { showErr('p-exp', 'form.errRequired'); ok = false; }
      if (card.cvc.length < 3) { showErr('p-cvc', 'form.errRequired'); ok = false; }
      if (!ok) return Promise.reject({ code: 'invalid' });
      return new Promise(function (resolve, reject) {
        // A card number ending 0002 is a documented "declined" test number.
        setTimeout(function () {
          if (card.number.replace(/\s/g, '').slice(-4) === '0002') { reject({ code: 'declined' }); return; }
          resolve({ id: 'demo_' + Date.now() });
        }, 1100);
      });
    }
  };

  var SquarePaymentAdapter = {
    card: null, loading: null,
    sdkUrl: function () {
      return CFG.environment === 'production' ? 'https://web.squarecdn.com/v1/square.js' : 'https://sandbox.web.squarecdn.com/v1/square.js';
    },
    prepare: function () {
      var self = this;
      if (self.loading) return self.loading;
      self.loading = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = self.sdkUrl(); s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      }).then(function () {
        var payments = window.Square.payments(CFG.squareApplicationId, CFG.squareLocationId);
        return payments.card();
      }).then(function (card) {
        self.card = card;
        return card.attach('#card-container');
      }).catch(function (e) {
        self.loading = null;
        document.getElementById('pay-err').textContent = HN.t('checkout.errServer');
        throw e;
      });
      return self.loading;
    },
    charge: function (order) {
      var self = this;
      return self.prepare().then(function () {
        // Passing verification details lets Square run 3-D Secure (SCA) when the issuer requires it.
        return self.card.tokenize({
          amount: String(order.total), currencyCode: 'JPY', intent: 'CHARGE',
          customerInitiated: true, sellerKeyedIn: false,
          billingContact: { givenName: order.customer.name, email: order.customer.email, phone: order.customer.phone || undefined }
        });
      }).then(function (r) {
        if (!r || r.status !== 'OK') throw { code: 'invalid' };
        return fetch('/api/create-payment', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId: r.token, idempotencyKey: order.ref + '-' + Date.now(), order: order })
        });
      }).then(function (resp) {
        return resp.json().catch(function () { return {}; }).then(function (j) {
          if (!resp.ok) throw { code: j.error || 'server' };
          return { id: j.paymentId, receiptUrl: j.receiptUrl, total: j.total };
        });
      }, function (e) { throw (e && e.code) ? e : { code: 'server' }; });
    }
  };

  var useSquare = CFG.provider === 'square' && CFG.squareApplicationId && CFG.squareLocationId;
  var Payment = useSquare ? SquarePaymentAdapter : DemoPaymentAdapter;

  function doPay() {
    var btn = document.getElementById('pay-btn');
    var label = btn.querySelector('[data-i18n]');
    var payErr = document.getElementById('pay-err');
    if (payErr) payErr.textContent = '';
    showErr('p-num', null);
    var order = buildOrder();

    btn.disabled = true; btn.setAttribute('aria-busy', 'true');
    label.textContent = HN.t('checkout.processing');
    document.getElementById('pay-amt').textContent = '';

    Payment.charge(order).then(function (res) {
      var conf = {
        ref: order.ref, id: tour.id, date: order.date, adults: order.adults, children: order.children,
        pax: order.adults + order.children, total: res.total || order.total,
        name: order.customer.name, email: order.customer.email, phone: order.customer.phone,
        country: order.customer.country, hotel: order.customer.hotel, note: order.customer.note,
        paymentId: res.id, receiptUrl: res.receiptUrl || '', live: !!useSquare
      };
      try { sessionStorage.setItem('hn-confirm', JSON.stringify(conf)); } catch (e) {}
      try { sessionStorage.removeItem('hn-booking'); } catch (e) {}   // prevent re-pay on Back
      location.href = 'confirmation.html';
    }).catch(function (e) {
      btn.disabled = false; btn.removeAttribute('aria-busy');
      label.textContent = HN.t('checkout.pay'); document.getElementById('pay-amt').textContent = HN.yen(q.total);
      var code = (e && e.code) || 'server';
      if (code === 'invalid' && !useSquare) return;   // field errors already shown
      var key = code === 'booking' ? 'checkout.errBooking' : (code === 'declined' || code === 'invalid') ? 'checkout.errPayment' : 'checkout.errServer';
      if (useSquare) payErr.textContent = HN.t(key); else showErr('p-num', key);
    });
  }

  // ---------- input niceties (demo card fields) ----------
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

  function showEmpty(key) {
    var box = document.getElementById('co-empty');
    if (key) { box.querySelector('[data-i18n]').setAttribute('data-i18n', key); HN.applyI18n(box); }
    box.hidden = false;
  }

  function init() {
    booking = HN.getBooking();
    if (!booking || !booking.id) { showEmpty(); return; }
    HN.loadTours().then(function (data) {
      tour = (data.tours || []).filter(function (t) { return t.id === booking.id && t.status !== 'draft'; })[0] || null;
      if (!tour) { showEmpty(); return; }
      // stale or tampered booking state → send back to the tour page
      if (P.validate(tour, booking, todayISO()).length) { showEmpty('checkout.errBooking'); return; }
      q = P.quote(tour, booking);

      if (useSquare) {
        document.getElementById('square-fields').hidden = false;
        document.getElementById('demo-fields').hidden = true;
        document.getElementById('demo-notice').hidden = true;
      }
      document.getElementById('hotel-field').hidden = !tour.hotelPickup;
      document.getElementById('co-main').hidden = false;
      renderSummary(); renderReview(); renderConfirms();
      HN.onLang(function () {
        renderSummary(); renderReview(); renderConfirms();
        var btn = document.getElementById('pay-btn');
        if (btn && btn.getAttribute('aria-busy') === 'true') { var l = btn.querySelector('[data-i18n]'); if (l) l.textContent = HN.t('checkout.processing'); }
      });
      window.addEventListener('pageshow', function () {
        var btn = document.getElementById('pay-btn');
        if (!btn) return;
        btn.disabled = false; btn.removeAttribute('aria-busy');
        var l = btn.querySelector('[data-i18n]'); if (l) l.textContent = HN.t('checkout.pay');
        var amt = document.getElementById('pay-amt'); if (amt) amt.textContent = HN.yen(q.total);
      });

      document.getElementById('to-2').addEventListener('click', function () { goStep(2); });
      document.getElementById('back-1').addEventListener('click', function () { goStep(1); });
      document.getElementById('back-2').addEventListener('click', function () { goStep(2); });

      document.getElementById('cust-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var checks = ['c-agree'].concat(arr(tour.confirmations).map(function (c, i) { return 'c-conf-' + i; }));
        ['c-name', 'c-email'].concat(checks).forEach(function (id) { showErr(id, null); });
        var ok = true;
        var nm = val('c-name'), em = val('c-email');
        if (!nm) { showErr('c-name', 'form.errRequired'); ok = false; }
        if (!em) { showErr('c-email', 'form.errRequired'); ok = false; }
        else if (!validEmail(em)) { showErr('c-email', 'form.errEmail'); ok = false; }
        checks.forEach(function (id) { if (!document.getElementById(id).checked) { showErr(id, 'form.errRequired'); ok = false; } });
        if (!ok) { var f = document.querySelector('#cust-form .is-error'); if (f) f.focus(); return; }
        goStep(3);
      });

      fmtCard();
      document.getElementById('pay-form').addEventListener('submit', function (e) { e.preventDefault(); doPay(); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () { HN.ready.then(init); });
})();
