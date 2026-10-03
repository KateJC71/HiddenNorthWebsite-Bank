/* Hidden North — booking confirmation (reads session, demo) */
(function () {
  'use strict';
  var LOCALE = { ja: 'ja-JP', zh: 'zh-TW', en: 'en-US' };
  function fmtDate(iso) {
    try { return new Date(iso + 'T00:00:00').toLocaleDateString(LOCALE[HN.getLang()] || 'ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return iso; }
  }

  function render(conf, tour) {
    var root = document.getElementById('confirm-root');
    if (!conf) {
      root.innerHTML = '<div class="panel-success"><p class="section-lead">' + HN.esc(HN.t('checkout.empty')) +
        '</p><p style="margin-top:20px"><a class="btn btn--primary" href="tours.html">' + HN.esc(HN.t('cta.viewTours')) + '</a></p></div>';
      return;
    }
    function row(k, v) { return '<div class="srow"><span>' + HN.esc(k) + '</span><span>' + HN.esc(v) + '</span></div>'; }
    var title = tour ? HN.pick(tour.title) : conf.id;
    root.innerHTML =
      '<div class="panel-success" style="padding-bottom:36px">' +
        '<div class="mark"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5 11-11"/></svg></div>' +
        '<h2 class="serif" data-i18n="confirm.title">' + HN.esc(HN.t('confirm.title')) + '</h2>' +
        '<p data-i18n="confirm.body">' + HN.esc(HN.t('confirm.body')) + '</p>' +
      '</div>' +
      '<div class="summary-box" style="max-width:520px;margin:0 auto">' +
        '<div class="summary-box__body">' +
          '<div class="srow"><span>' + HN.esc(HN.t('confirm.ref')) + '</span><span style="font-family:var(--fraunces);letter-spacing:.06em">' + HN.esc(conf.ref) + '</span></div>' +
          row(HN.t('confirm.tour'), title) +
          row(HN.t('confirm.date'), fmtDate(conf.date)) +
          row(HN.t('confirm.participants'), conf.pax + ' ' + HN.t('common.people')) +
          '<div class="srow total"><span>' + HN.esc(HN.t('confirm.total')) + '</span><span class="v">' + HN.yen(conf.total) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<p class="t-center" style="margin-top:36px"><a class="btn btn--outline" href="index.html" data-i18n="confirm.home">' + HN.esc(HN.t('confirm.home')) + '</a></p>' +
      '<p class="notice notice--inline t-center" style="margin-top:22px" data-i18n="notice.demo">' + HN.esc(HN.t('notice.demo')) + '</p>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var conf;
    try { conf = JSON.parse(sessionStorage.getItem('hn-confirm') || 'null'); } catch (e) { conf = null; }
    Promise.all([HN.ready, conf ? HN.loadTours() : Promise.resolve(null)]).then(function (res) {
      var data = res[1];
      var tour = (conf && data) ? (data.tours || []).filter(function (t) { return t.id === conf.id; })[0] : null;
      render(conf, tour);
      HN.onLang(function () { render(conf, tour); });
    });
  });
})();
