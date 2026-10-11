/* Hidden North — booking rules & pricing.
   Shared by the browser (tour / checkout pages) and the payment API
   (api/create-payment.js), so the amount charged is always computed
   from data/tours.json on the server — never trusted from the client. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HNPricing = factory();
})(this, function () {
  'use strict';

  var LEAD_DAYS = 3;   // earliest bookable date = today + LEAD_DAYS

  function addDays(iso, n) {
    var p = iso.split('-');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2] + n));
    return d.toISOString().slice(0, 10);
  }
  function isISODate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function int(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : Math.max(0, n); }

  function capacity(tour) {
    var c = tour.capacity || {};
    return { min: c.min || 1, max: c.max || 20 };
  }

  // Bookable date range: { min: 'YYYY-MM-DD', max: 'YYYY-MM-DD' | '' }
  function bounds(tour, todayISO) {
    var min = addDays(todayISO, LEAD_DAYS);
    var s = tour.season || {};
    if (isISODate(s.from) && s.from > min) min = s.from;
    return { min: min, max: isISODate(s.to) ? s.to : '' };
  }

  // Accepts { adults, children } or the older { pax } shape.
  function party(tour, b) {
    b = b || {};
    var adults = (b.adults != null) ? int(b.adults) : int(b.pax);
    var children = tour.child ? int(b.children) : 0;
    return { adults: adults, children: children, pax: adults + children };
  }

  function quote(tour, b) {
    var p = party(tour, b);
    var lines = [{ key: 'adult', qty: p.adults, unit: tour.price, amount: tour.price * p.adults }];
    if (tour.child) lines.push({ key: 'child', qty: p.children, unit: tour.child.price, amount: tour.child.price * p.children });
    var total = lines.reduce(function (s, l) { return s + l.amount; }, 0);
    return { adults: p.adults, children: p.children, pax: p.pax, lines: lines, total: total };
  }

  // Returns a list of problems: 'date' | 'pax'. Empty list = bookable.
  function validate(tour, b, todayISO) {
    var errs = [];
    var bd = bounds(tour, todayISO);
    var date = b && b.date;
    if (!isISODate(date) || date < bd.min || (bd.max && date > bd.max)) errs.push('date');
    var p = party(tour, b), cap = capacity(tour);
    if (p.adults < 1 || p.pax < cap.min || p.pax > cap.max) errs.push('pax');
    return errs;
  }

  return { LEAD_DAYS: LEAD_DAYS, addDays: addDays, capacity: capacity, bounds: bounds, party: party, quote: quote, validate: validate };
});
