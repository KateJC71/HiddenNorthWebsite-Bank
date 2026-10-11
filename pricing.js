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

  function weekday(iso) { var p = iso.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }

  // How departures are scheduled (all optional on the tour):
  //   dates:    ['YYYY-MM-DD', …]  only these days (weekdays ignored)
  //   weekdays: [0–6, …]           repeat weekly (0 = Sunday); absent = every day
  //   closed:   ['YYYY-MM-DD', …]  no departure on these days
  // season / LEAD_DAYS still bound every mode.
  function schedule(tour) {
    if (Array.isArray(tour.dates) && tour.dates.length) return 'dates';
    if (Array.isArray(tour.weekdays) && tour.weekdays.length) return 'weekly';
    return 'daily';
  }
  function isDeparture(tour, date, todayISO) {
    if (!isISODate(date)) return false;
    var bd = bounds(tour, todayISO);
    if (date < bd.min || (bd.max && date > bd.max)) return false;
    if (Array.isArray(tour.closed) && tour.closed.indexOf(date) >= 0) return false;
    var mode = schedule(tour);
    if (mode === 'dates') return tour.dates.indexOf(date) >= 0;
    if (mode === 'weekly') return tour.weekdays.indexOf(weekday(date)) >= 0;
    return true;
  }
  // Upcoming bookable dates for weekly / fixed-date tours (daily tours use a free date picker).
  function departures(tour, todayISO, limit) {
    limit = limit || 60;
    var out = [], bd = bounds(tour, todayISO);
    if (schedule(tour) === 'dates') {
      tour.dates.slice().sort().forEach(function (d) { if (out.length < limit && isDeparture(tour, d, todayISO)) out.push(d); });
      return out;
    }
    var end = bd.max || addDays(bd.min, 365);
    for (var d = bd.min; d <= end && out.length < limit; d = addDays(d, 1)) if (isDeparture(tour, d, todayISO)) out.push(d);
    return out;
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
    if (!isDeparture(tour, b && b.date, todayISO)) errs.push('date');
    var p = party(tour, b), cap = capacity(tour);
    if (p.adults < 1 || p.pax < cap.min || p.pax > cap.max) errs.push('pax');
    return errs;
  }

  return {
    LEAD_DAYS: LEAD_DAYS, addDays: addDays, weekday: weekday, capacity: capacity, bounds: bounds,
    schedule: schedule, isDeparture: isDeparture, departures: departures,
    party: party, quote: quote, validate: validate
  };
});
