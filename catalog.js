/* Hidden North — catalog rendering (home featured + tours listing) */
(function () {
  'use strict';

  function tagLabel(type) { return HN.t(type === '2day' ? 'common.day2' : 'common.day1'); }

  function cardHTML(tr) {
    var id = HN.esc(tr.id);
    var title = HN.esc(HN.pick(tr.title));
    return (
      '<a class="tcard reveal is-in" href="tour.html?id=' + id + '">' +
        '<div class="tcard__media">' +
          '<img src="' + HN.esc(tr.image) + '" alt="' + title + '" loading="lazy" width="1600" height="1067">' +
          '<span class="tcard__tag">' + HN.esc(tagLabel(tr.type)) + '</span>' +
        '</div>' +
        '<div class="tcard__area">' + HN.esc(HN.pick(tr.area)) + '</div>' +
        '<h3 class="tcard__title">' + title + '</h3>' +
        '<p class="tcard__sum">' + HN.esc(HN.pick(tr.summary)) + '</p>' +
        '<div class="tcard__foot">' +
          '<span class="tcard__price">' + HN.yen(tr.price) + ' <small>' + HN.esc(HN.t('common.perPerson')) + '</small></span>' +
          '<span class="tcard__dur">' + HN.esc(HN.pick(tr.duration)) + '</span>' +
        '</div>' +
      '</a>'
    );
  }

  function published(list) {
    return list.filter(function (t) { return t.status !== 'draft'; })
               .sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
  }

  function initFeatured(container) {
    function render() {
      HN.loadTours().then(function (data) {
        var list = published(data.tours).slice(0, 3);
        container.innerHTML = list.map(cardHTML).join('');
      });
    }
    HN.ready.then(render);
    HN.onLang(render);
  }

  function initListing(container) {
    var filter = 'all';
    function render() {
      HN.loadTours().then(function (data) {
        var list = published(data.tours).filter(function (t) {
          return filter === 'all' ? true : t.type === filter;
        });
        container.innerHTML = list.length ? list.map(cardHTML).join('')
          : '<p class="section-lead" style="grid-column:1/-1">' + HN.esc(HN.t('tours.empty')) + '</p>';
      });
    }
    var filters = document.querySelector('.tour-filters');
    if (filters) {
      filters.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-filter]'); if (!b) return;
        filter = b.getAttribute('data-filter');
        filters.querySelectorAll('button').forEach(function (x) {
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        render();
      });
    }
    HN.ready.then(render);
    HN.onLang(render);
  }

  document.addEventListener('DOMContentLoaded', function () {
    var feat = document.getElementById('featured-tours');
    if (feat) initFeatured(feat);
    var grid = document.getElementById('tour-grid');
    if (grid) initListing(grid);
  });
})();
