/* Hidden North — tour admin (back-office).
   Loads data/tours.json, edits in-browser, exports an updated file.
   NOTE: the passcode is a light client-side gate, not real security.
   Change PASS below; for true protection, put this page behind
   Vercel password protection or an auth proxy. */
(function () {
  'use strict';
  var PASS = 'hidden-north';
  var DRAFT = 'hn-admin-draft';
  var data = { currency: 'JPY', tours: [] };
  var idx = -1;
  var editLang = 'zh';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function saveDraft() { try { localStorage.setItem(DRAFT, JSON.stringify(data)); } catch (e) {} }

  // ---------- gate ----------
  function initGate() {
    var unlocked = false;
    try { unlocked = sessionStorage.getItem('hn-admin-ok') === '1'; } catch (e) {}
    if (unlocked) return openAdmin();
    $('gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if ($('gate-pass').value === PASS) {
        try { sessionStorage.setItem('hn-admin-ok', '1'); } catch (e) {}
        openAdmin();
      } else { $('gate-err').textContent = '密碼不正確。'; }
    });
  }
  function openAdmin() { $('gate').hidden = true; $('gate').style.display = 'none'; $('admin').hidden = false; load(); }

  // ---------- load ----------
  function load(force) {
    var draft = null;
    if (!force) { try { draft = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) {} }
    if (draft && draft.tours) { data = draft; afterLoad(); return; }
    fetch('data/tours.json', { cache: 'no-cache' }).then(function (r) { return r.json(); })
      .then(function (j) { data = j; afterLoad(); })
      .catch(function () { data = { currency: 'JPY', tours: [] }; afterLoad(); });
  }
  function afterLoad() { idx = data.tours.length ? 0 : -1; renderList(); renderEditor(); }

  // ---------- list ----------
  function renderList() {
    $('count-badge').textContent = data.tours.length + ' 筆';
    $('tour-list').innerHTML = data.tours.map(function (t, i) {
      var title = (t.title && (t.title.zh || t.title.ja || t.title.en)) || t.id || '(未命名)';
      return '<button class="row' + (i === idx ? ' is-active' : '') + '" data-i="' + i + '">' +
        '<span>' + esc(title) + '</span>' +
        '<span class="badge">' + esc(t.type || '') + (t.status === 'draft' ? ' · 草稿' : '') + '</span></button>';
    }).join('') || '<div style="padding:16px" class="admin-note">尚無行程</div>';
    $('tour-list').querySelectorAll('.row').forEach(function (b) {
      b.addEventListener('click', function () { idx = Number(b.getAttribute('data-i')); renderList(); renderEditor(); });
    });
  }

  // ---------- editor ----------
  function langField(label, obj, path) {
    var v = (obj && obj[editLang]) || '';
    return '<div class="field"><label>' + esc(label) + '（' + editLang + '）</label>' +
      '<input class="input" data-ml="' + path + '" value="' + esc(v) + '"></div>';
  }
  function num(label, path, val) {
    return '<div class="field"><label>' + esc(label) + '</label><input class="input" type="number" data-field="' + path + '" value="' + esc(val == null ? '' : val) + '"></div>';
  }
  function text(label, path, val) {
    return '<div class="field"><label>' + esc(label) + '</label><input class="input" data-field="' + path + '" value="' + esc(val == null ? '' : val) + '"></div>';
  }

  function renderEditor() {
    var ed = $('editor');
    if (idx < 0 || !data.tours[idx]) { ed.innerHTML = '<p class="admin-note">請從左側選擇行程，或新增一筆。</p>'; return; }
    var t = data.tours[idx];
    var adv = { gallery: t.gallery || [], highlights: t.highlights || [], itinerary: t.itinerary || [], included: t.included || [], excluded: t.excluded || [] };
    ed.innerHTML =
      '<div class="lang-tabs" id="lang-tabs">' +
        ['zh', 'ja', 'en'].map(function (l) { return '<button data-l="' + l + '"' + (l === editLang ? ' class="is-active"' : '') + '>' + (l === 'zh' ? '繁中' : l === 'ja' ? '日本語' : 'EN') + '</button>'; }).join('') +
      '</div>' +
      langField('標題 Title', t.title, 'title') +
      langField('簡介 Summary', t.summary, 'summary') +
      '<div class="field-row">' + langField('區域 Area', t.area, 'area') + langField('時長 Duration', t.duration, 'duration') + '</div>' +
      '<div class="field-row">' +
        '<div class="field"><label>類型 Type</label><select class="select" data-field="type">' +
          '<option value="1day"' + (t.type === '1day' ? ' selected' : '') + '>一日遊 1day</option>' +
          '<option value="2day"' + (t.type === '2day' ? ' selected' : '') + '>二日遊 2day</option></select></div>' +
        '<div class="field"><label>狀態 Status</label><select class="select" data-field="status">' +
          '<option value="published"' + (t.status !== 'draft' ? ' selected' : '') + '>published 上架</option>' +
          '<option value="draft"' + (t.status === 'draft' ? ' selected' : '') + '>draft 草稿</option></select></div>' +
      '</div>' +
      '<div class="field-row">' + num('價格 Price (JPY)', 'price', t.price) + num('排序 Order', 'order', t.order) + '</div>' +
      '<div class="field-row">' + num('最少人數 Min', 'capacity.min', t.capacity && t.capacity.min) + num('最多人數 Max', 'capacity.max', t.capacity && t.capacity.max) + '</div>' +
      text('主圖 Image path', 'image', t.image) +
      '<div class="field"><label>進階（相簿、亮點、行程、費用含/不含）— JSON</label>' +
        '<textarea class="textarea" id="adv-json" style="min-height:220px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px">' + esc(JSON.stringify(adv, null, 2)) + '</textarea>' +
        '<p class="err-msg" id="adv-err"></p></div>' +
      '<div style="display:flex;justify-content:space-between;gap:12px;margin-top:20px">' +
        '<button class="btn btn--outline" id="btn-dup" style="min-height:44px">複製此筆</button>' +
        '<button class="btn btn--outline" id="btn-del" style="min-height:44px;border-color:rgba(165,48,58,.4);color:var(--rowan-day)">刪除此筆</button>' +
      '</div>';

    // lang tabs
    ed.querySelectorAll('#lang-tabs button').forEach(function (b) {
      b.addEventListener('click', function () { editLang = b.getAttribute('data-l'); renderEditor(); });
    });
    // simple fields
    ed.querySelectorAll('[data-field]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var path = inp.getAttribute('data-field');
        var val = inp.type === 'number' ? (inp.value === '' ? '' : Number(inp.value)) : inp.value;
        setPath(t, path, val);
        if (path === 'type' || path === 'status') renderList();
        saveDraft();
      });
    });
    // multilingual fields
    ed.querySelectorAll('[data-ml]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var key = inp.getAttribute('data-ml');
        if (!t[key] || typeof t[key] !== 'object') t[key] = {};
        t[key][editLang] = inp.value;
        if (key === 'title') renderList();
        saveDraft();
      });
    });
    // advanced JSON
    var advEl = $('adv-json');
    advEl.addEventListener('input', function () {
      try {
        var o = JSON.parse(advEl.value);
        ['gallery', 'highlights', 'itinerary', 'included', 'excluded'].forEach(function (k) { t[k] = o[k] || []; });
        $('adv-err').textContent = ''; advEl.classList.remove('is-error'); saveDraft();
      } catch (e) { $('adv-err').textContent = 'JSON 格式有誤：' + e.message; advEl.classList.add('is-error'); }
    });
    $('btn-del').addEventListener('click', function () {
      if (!confirm('確定刪除此筆行程？')) return;
      data.tours.splice(idx, 1); idx = Math.min(idx, data.tours.length - 1); renderList(); renderEditor(); saveDraft();
    });
    $('btn-dup').addEventListener('click', function () {
      var copy = JSON.parse(JSON.stringify(t)); copy.id = (t.id || 'tour') + '-copy'; copy.status = 'draft';
      data.tours.splice(idx + 1, 0, copy); idx = idx + 1; renderList(); renderEditor(); saveDraft();
    });
  }

  function setPath(obj, path, val) {
    var parts = path.split('.');
    while (parts.length > 1) { var p = parts.shift(); if (!obj[p] || typeof obj[p] !== 'object') obj[p] = {}; obj = obj[p]; }
    obj[parts[0]] = val;
  }

  // ---------- toolbar ----------
  function initToolbar() {
    $('btn-add').addEventListener('click', function () {
      var maxOrder = data.tours.reduce(function (m, t) { return Math.max(m, t.order || 0); }, 0);
      data.tours.push({
        id: 'tour-' + Date.now(), type: '1day', status: 'draft', order: maxOrder + 1, price: 10000,
        image: 'assets/tours/t1.jpg', gallery: [], area: { ja: '', zh: '', en: '' }, duration: { ja: '', zh: '', en: '' },
        capacity: { min: 1, max: 6 }, title: { ja: '', zh: '', en: '' }, summary: { ja: '', zh: '', en: '' },
        highlights: [], itinerary: [], included: [], excluded: []
      });
      idx = data.tours.length - 1; renderList(); renderEditor(); saveDraft();
    });
    $('btn-reload').addEventListener('click', function () {
      if (!confirm('重新載入會捨棄尚未匯出的修改，確定？')) return;
      try { localStorage.removeItem(DRAFT); } catch (e) {}
      load(true);
    });
    $('btn-export').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tours.json';
      document.body.appendChild(a); a.click(); a.remove();
    });
    $('btn-copy').addEventListener('click', function () {
      var txt = JSON.stringify(data, null, 2);
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
        .then(function () { $('btn-copy').textContent = '已複製 ✓'; setTimeout(function () { $('btn-copy').textContent = '複製 JSON'; }, 1500); })
        .catch(function () { window.prompt('複製以下 JSON：', txt); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () { initGate(); initToolbar(); });
})();
