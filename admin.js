/* Hidden North — product back-office.
   Staff fill in a form; "發佈到網站" sends data/tours.json (plus any new
   photos) to /api/admin, which commits them to GitHub so Vercel redeploys.
   If the API isn't configured (or you run the site locally), the page falls
   back to "offline mode": edit, then export tours.json by hand. */
(function () {
  'use strict';

  var S = window.HNSchema;
  var KEY = 'hn-admin-key';
  var DRAFT = 'hn-admin-draft-v2';
  var LANG_NAMES = { zh: '繁中', ja: '日本語', en: 'EN' };

  var online = false;        // true when /api/admin is available
  var adminKey = '';
  var data = { currency: 'JPY', tours: [] };
  var baseSha = '';          // sha of tours.json the edits are based on
  var snapshot = '';         // JSON of last loaded/published data (for "unsaved" detection)
  var pending = {};          // new photo path → dataURL (not yet published)
  var idx = -1;
  var lang = 'zh';

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cur() { return data.tours[idx]; }
  function ml() { return { zh: '', ja: '', en: '' }; }
  function imgSrc(p) { return pending[p] || p; }
  function dirty() { return JSON.stringify(data) !== snapshot; }
  function tourName(t) { return (t.title && (t.title.zh || t.title.ja || t.title.en)) || '（未命名）'; }

  function status(html, kind) {
    var el = $('status');
    el.className = 'adm-status' + (kind ? ' is-' + kind : '');
    el.innerHTML = html || '';
  }

  // ---------- persistence of unpublished edits in this browser ----------
  function saveDraft() {
    var d = { data: data, baseSha: baseSha, snapshot: snapshot, pending: pending };
    try { localStorage.setItem(DRAFT, JSON.stringify(d)); }
    catch (e) {
      try { d.pending = {}; localStorage.setItem(DRAFT, JSON.stringify(d)); } catch (e2) {}
    }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT); } catch (e) {} }
  function touch(listToo) {
    $('btn-publish').disabled = !dirty();
    if (listToo) renderList();
    updateLangBadges();
    saveDraft();
  }

  // ---------- API ----------
  function api(action, body) {
    return fetch('/api/admin?action=' + action, {
      method: body ? 'POST' : 'GET',
      headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j._status = r.status; return j; });
    });
  }

  // ---------- login & load ----------
  function initGate() {
    try { adminKey = sessionStorage.getItem(KEY) || ''; } catch (e) {}
    if (adminKey) tryLogin(true);
    $('gate-form').addEventListener('submit', function (e) {
      e.preventDefault();
      adminKey = $('gate-pass').value;
      tryLogin(false);
    });
  }

  function tryLogin(silent) {
    $('gate-btn').disabled = true; $('gate-err').textContent = '';
    api('load').then(function (j) {
      $('gate-btn').disabled = false;
      if (j._status === 200) {
        try { sessionStorage.setItem(KEY, adminKey); } catch (e) {}
        online = true; openAdmin(j);
      } else if (j._status === 401) {
        try { sessionStorage.removeItem(KEY); } catch (e) {}
        if (!silent) $('gate-err').textContent = '密碼不正確。';
      } else {
        online = false; openAdmin(null);   // API missing / not configured → offline mode
      }
    }).catch(function () { $('gate-btn').disabled = false; online = false; openAdmin(null); });
  }

  function openAdmin(remote) {
    $('gate').hidden = true; $('admin').hidden = false;
    $('mode-badge').textContent = online ? '已連線・可直接發佈' : '離線模式';
    $('btn-export').hidden = online;
    $('btn-publish').hidden = !online;
    if (!online) status('發佈功能尚未設定（需在 Vercel 設定 <code>ADMIN_PASSWORD</code>、<code>GITHUB_TOKEN</code>、<code>GITHUB_REPO</code>）。目前可編輯，完成後按「匯出 tours.json」交給工程人員上傳。', 'warn');

    var draft = null;
    try { draft = JSON.parse(localStorage.getItem(DRAFT) || 'null'); } catch (e) {}
    if (remote) {
      if (draft && draft.data && draft.baseSha === remote.sha && JSON.stringify(draft.data) !== JSON.stringify(remote.data)) {
        restore(draft);
        status('已還原上次尚未發佈的修改。', 'info');
      } else {
        setData(remote.data, remote.sha);
        if (draft && draft.baseSha && draft.baseSha !== remote.sha) status('網站內容已被更新，舊的未發佈草稿已捨棄。', 'warn');
      }
      return;
    }
    if (draft && draft.data) { restore(draft); return; }
    fetch('data/tours.json', { cache: 'no-cache' }).then(function (r) { return r.json(); })
      .then(function (j) { setData(j, ''); })
      .catch(function () { setData({ currency: 'JPY', tours: [] }, ''); });
  }

  function restore(d) {
    data = d.data; baseSha = d.baseSha || ''; snapshot = d.snapshot || ''; pending = d.pending || {};
    idx = data.tours.length ? 0 : -1; renderAll(); touch();
  }
  function setData(d, sha) {
    data = d; baseSha = sha; snapshot = JSON.stringify(d); pending = {};
    idx = data.tours.length ? 0 : -1; clearDraft(); renderAll(); touch();
  }

  // ---------- list ----------
  function renderList() {
    $('tour-list').innerHTML = data.tours.map(function (t, i) {
      return '<button class="row' + (i === idx ? ' is-active' : '') + '" data-i="' + i + '">' +
        '<span>' + esc(tourName(t)) + '</span>' +
        '<span class="badge' + (t.status === 'draft' ? '' : ' is-live') + '">' + (t.status === 'draft' ? '草稿' : '上架中') + '</span></button>';
    }).join('') || '<div style="padding:16px" class="admin-note">尚無商品，按「＋ 新增商品」開始。</div>';
  }

  // ---------- editor ----------
  function mlInput(path, value, opts) {
    opts = opts || {};
    var v = (value && value[lang]) || '';
    var ref = lang !== 'zh' && value && value.zh ? value.zh : (opts.ph || '');
    var attrs = ' data-ml="' + path + '" placeholder="' + esc(ref) + '"' + (opts.id ? ' id="' + opts.id + '"' : '');
    return opts.area
      ? '<textarea class="textarea adm-ta"' + attrs + '>' + esc(v) + '</textarea>'
      : '<input class="input"' + attrs + ' value="' + esc(v) + '">';
  }
  function field(label, inner, hint) {
    return '<div class="field"><label>' + label + '</label>' + inner + (hint ? '<p class="admin-note" style="margin:6px 0 0">' + hint + '</p>' : '') + '</div>';
  }
  function num(path, v, min) {
    return '<input class="input" type="number" inputmode="numeric" min="' + (min == null ? 0 : min) + '" step="1" data-f="' + path + '" data-num="1" value="' + esc(v == null ? '' : v) + '">';
  }
  function toggle(key, on, label) {
    return '<label class="check-row adm-toggle"><input type="checkbox" data-toggle="' + key + '"' + (on ? ' checked' : '') + '><span>' + label + '</span></label>';
  }
  function sec(title, desc, body) {
    return '<section class="adm-sec"><h3>' + title + '</h3>' + (desc ? '<p class="admin-note" style="margin:-6px 0 14px">' + desc + '</p>' : '') + body + '</section>';
  }
  function rowBtns(list, i, n) {
    return '<div class="adm-rowbtns">' +
      '<button type="button" class="icon-btn" data-act="up" data-list="' + list + '" data-i="' + i + '" aria-label="上移"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
      '<button type="button" class="icon-btn" data-act="down" data-list="' + list + '" data-i="' + i + '" aria-label="下移"' + (i === n - 1 ? ' disabled' : '') + '>↓</button>' +
      '<button type="button" class="icon-btn" data-act="remove" data-list="' + list + '" data-i="' + i + '" aria-label="刪除">✕</button></div>';
  }
  function listEditor(list, addLabel, area) {
    var items = cur()[list] || [];
    return '<div class="adm-list">' + items.map(function (it, i) {
      return '<div class="adm-item">' + mlInput(list + '.' + i, it, { area: area }) + rowBtns(list, i, items.length) + '</div>';
    }).join('') + '</div><button type="button" class="adm-add" data-act="add" data-list="' + list + '">＋ ' + addLabel + '</button>';
  }
  function itineraryEditor() {
    var items = cur().itinerary || [];
    return '<div class="adm-list">' + items.map(function (s, i) {
      return '<div class="adm-item adm-itin">' +
        '<input class="input adm-time" data-f="itinerary.' + i + '.time" value="' + esc(s.time) + '" placeholder="09:30 或 10:00–12:00" aria-label="時間">' +
        '<div class="adm-itin__text">' + mlInput('itinerary.' + i + '.title', s.title, { ph: '地點／活動名稱' }) +
          mlInput('itinerary.' + i + '.desc', s.desc, { area: true, ph: '說明（選填）' }) + '</div>' +
        rowBtns('itinerary', i, items.length) + '</div>';
    }).join('') + '</div><button type="button" class="adm-add" data-act="add" data-list="itinerary">＋ 新增一個行程點</button>';
  }
  function photoEditor() {
    var t = cur();
    var all = [t.image].concat(t.gallery || []).filter(function (p, i, a) { return p && a.indexOf(p) === i; });
    return '<div class="img-grid">' + all.map(function (p, i) {
      return '<figure class="img-tile">' +
        '<img src="' + esc(imgSrc(p)) + '" alt="">' +
        (i === 0 ? '<span class="img-tile__main">主圖</span>' : '') +
        '<figcaption>' +
          (i > 0 ? '<button type="button" class="icon-btn" data-act="img-main" data-p="' + esc(p) + '">設為主圖</button>' : '') +
          (i > 0 ? '<button type="button" class="icon-btn" data-act="img-left" data-p="' + esc(p) + '" aria-label="往前">←</button>' : '') +
          '<button type="button" class="icon-btn" data-act="img-remove" data-p="' + esc(p) + '" aria-label="移除">✕</button>' +
        '</figcaption></figure>';
    }).join('') +
      '<label class="img-add"><input type="file" accept="image/jpeg,image/png,image/webp" multiple id="img-input"><span>＋ 上傳照片</span></label>' +
    '</div>';
  }

  function renderEditor() {
    var ed = $('editor');
    var t = cur();
    if (!t) { ed.innerHTML = '<div class="admin-editor"><p class="admin-note">請從左側選擇商品，或按「＋ 新增商品」。</p></div>'; return; }

    ed.innerHTML =
      '<div class="adm-langbar">' +
        '<span class="admin-note" style="margin-right:8px">文字語言：</span>' +
        '<div class="lang-tabs" id="lang-tabs" style="margin:0">' + S.LANGS.map(function (l) {
          return '<button type="button" data-l="' + l + '"' + (l === lang ? ' class="is-active"' : '') + '>' + LANG_NAMES[l] + '<span class="miss" data-miss="' + l + '"></span></button>';
        }).join('') + '</div>' +
        '<span class="admin-note" style="margin-left:auto">切換語言只影響文字欄位；價格、照片等共用。</span>' +
      '</div>' +

      sec('基本資料', '',
        '<div class="field-row">' +
          field('狀態', '<select class="select" data-f="status"><option value="published"' + (t.status !== 'draft' ? ' selected' : '') + '>上架中（顯示在網站）</option><option value="draft"' + (t.status === 'draft' ? ' selected' : '') + '>草稿（不顯示）</option></select>') +
          field('類型', '<select class="select" data-f="type"><option value="1day"' + (t.type !== '2day' ? ' selected' : '') + '>一日遊</option><option value="2day"' + (t.type === '2day' ? ' selected' : '') + '>二日遊</option></select>') +
        '</div>' +
        field('商品名稱 *', mlInput('title', t.title, { id: 'f-title' })) +
        field('一句話介紹', mlInput('summary', t.summary, { area: true }), '顯示在列表卡片與商品頁標題下方。') +
        '<div class="field-row">' + field('區域', mlInput('area', t.area, { ph: '例：旭川・東川' })) + field('所需時間', mlInput('duration', t.duration, { ph: '例：約 6 小時 30 分' })) + '</div>' +
        '<div class="field-row">' +
          field('網址代碼', '<input class="input" data-f="id" value="' + esc(t.id) + '" spellcheck="false">', '小寫英文、數字、連字號。商品頁網址：tour.html?id=' + esc(t.id) + '（上架後請勿再改）') +
          field('列表排序', num('order', t.order, 0), '數字小的排前面。') +
        '</div>') +

      sec('價格與人數', '價格為日圓、每人、含稅。',
        '<div class="field-row">' + field(t.child ? '成人價 *' : '每人價格 *', num('price', t.price)) + '<div></div></div>' +
        toggle('child', !!t.child, '另設兒童價') +
        (t.child ? '<div class="field-row" style="margin-top:12px">' + field('兒童價', num('child.price', t.child.price)) + field('兒童的定義', mlInput('child.label', t.child.label, { ph: '例：兒童（國中以下）' })) + '</div>' : '') +
        '<div class="field-row" style="margin-top:16px">' + field('最少成團人數', num('capacity.min', t.capacity && t.capacity.min, 1)) + field('每團最多人數', num('capacity.max', t.capacity && t.capacity.max, 1)) + '</div>') +

      sec('出團期間', '客人只能選這段期間內的日期；也一律只能預約 3 天後的日期。',
        toggle('season', !!t.season, '限定出團期間（例如只在冬季）') +
        (t.season ? '<div class="field-row" style="margin-top:12px">' + field('開始日', '<input class="input" type="date" data-f="season.from" value="' + esc(t.season.from) + '">') + field('結束日', '<input class="input" type="date" data-f="season.to" value="' + esc(t.season.to) + '">') + '</div>' : '')) +

      sec('集合與接送', '',
        field('集合・解散地點', mlInput('meeting', t.meeting, { area: true, ph: '例：旭川站前（09:30 集合・出發）。於旭川站前解散（約 16:10）。' })) +
        toggle('hotelPickup', !!t.hotelPickup, '提供飯店接送（結帳時請客人填寫住宿飯店）')) +

      sec('照片', '第一張為主圖（列表與商品頁頂部）。建議橫式照片，系統會自動壓縮。', photoEditor()) +
      sec('亮點', '3–4 項，每項一句話。', listEditor('highlights', '新增亮點')) +
      sec('行程內容', '依時間順序填寫，可用 ↑↓ 調整順序。', itineraryEditor()) +
      sec('費用包含', '', listEditor('included', '新增項目')) +
      sec('費用不含', '', listEditor('excluded', '新增項目')) +
      sec('參加須知', '年齡限制、服裝、天候等注意事項。', listEditor('notes', '新增須知', true)) +
      sec('結帳時必須勾選的確認事項', '例如「所有參加者皆已滿 20 歲」。客人沒勾選就不能付款；不需要可留空。', listEditor('confirmations', '新增確認事項')) +

      '<div class="adm-foot">' +
        '<button type="button" class="btn btn--outline adm-btn" data-act="preview">預覽商品頁</button>' +
        '<button type="button" class="btn btn--outline adm-btn" data-act="dup">複製成新商品</button>' +
        '<button type="button" class="btn btn--outline adm-btn adm-danger" data-act="delete">刪除此商品</button>' +
      '</div>';
    updateLangBadges();
  }

  function renderAll() { renderList(); renderEditor(); }

  function updateLangBadges() {
    var t = cur(); if (!t) return;
    var miss = S.missingLangs(t);
    document.querySelectorAll('[data-miss]').forEach(function (el) {
      var n = miss[el.getAttribute('data-miss')] || 0;
      el.textContent = n ? ' ·' + n : '';
      el.title = n ? n + ' 個欄位尚未翻譯' : '';
    });
  }

  // ---------- data helpers ----------
  function resolve(path, create) {
    // 'title' | 'child.label' | 'highlights.2' | 'itinerary.1.title' → [parentObject, key]
    var parts = path.split('.'), o = cur();
    for (var i = 0; i < parts.length - 1; i++) {
      var k = parts[i];
      if (o[k] == null) { if (!create) return null; o[k] = /^\d+$/.test(parts[i + 1]) ? [] : {}; }
      o = o[k];
    }
    return [o, parts[parts.length - 1]];
  }
  function setML(path, v) {
    var r = resolve(path, true); var o = r[0], k = r[1];
    if (!o[k] || typeof o[k] !== 'object') o[k] = ml();
    o[k][lang] = v;
  }
  function setField(path, v) { var r = resolve(path, true); r[0][r[1]] = v; }

  function newTour() {
    var d = new Date(), p = function (n) { return ('0' + n).slice(-2); };
    var maxOrder = data.tours.reduce(function (m, t) { return Math.max(m, t.order || 0); }, 0);
    return {
      id: 'tour-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + Math.random().toString(36).slice(2, 5),
      type: '1day', status: 'draft', order: maxOrder + 1, price: 0, image: '', gallery: [],
      area: ml(), duration: ml(), capacity: { min: 1, max: 8 }, title: ml(), summary: ml(),
      highlights: [], itinerary: [], included: [], excluded: [], notes: [], confirmations: []
    };
  }

  // ---------- photos ----------
  function compress(file) {
    return new Promise(function (resolveP, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolveP(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('無法讀取圖片')); };
      img.src = url;
    });
  }
  function photoList(t) { return [t.image].concat(t.gallery || []).filter(function (p, i, a) { return p && a.indexOf(p) === i; }); }
  function setPhotos(t, list) { t.image = list[0] || ''; t.gallery = list.slice(); }

  function addPhotos(files) {
    var t = cur();
    var slug = (t.id || 'tour').replace(/[^a-z0-9-]/g, '') || 'tour';
    Promise.all(Array.prototype.map.call(files, function (f, n) {
      return compress(f).then(function (dataUrl) {
        var path = 'assets/tours/' + slug + '-' + Date.now().toString(36) + n + '.jpg';
        pending[path] = dataUrl; return path;
      });
    })).then(function (paths) {
      setPhotos(t, photoList(t).concat(paths)); renderEditor(); touch(true);
    }).catch(function (e) { status(esc(e.message), 'error'); });
  }

  // ---------- events ----------
  function initEditorEvents() {
    var ed = $('editor');
    ed.addEventListener('input', function (e) {
      var el = e.target, t = cur(); if (!t) return;
      if (el.hasAttribute('data-ml')) { setML(el.getAttribute('data-ml'), el.value); touch(el.id === 'f-title'); return; }
      if (el.hasAttribute('data-f')) {
        var path = el.getAttribute('data-f');
        var v = el.hasAttribute('data-num') ? (el.value === '' ? null : parseInt(el.value, 10)) : el.value;
        if (path === 'id') v = v.toLowerCase();
        setField(path, v);
        touch(path === 'status' || path === 'id');
      }
    });
    ed.addEventListener('change', function (e) {
      var el = e.target, t = cur(); if (!t) return;
      if (el.id === 'img-input') { if (el.files.length) addPhotos(el.files); return; }
      var k = el.getAttribute('data-toggle'); if (!k) return;
      if (k === 'child') { if (el.checked) t.child = { price: Math.round((t.price || 0) * 0.6), label: { zh: '兒童', ja: '子ども', en: 'Children' } }; else delete t.child; }
      if (k === 'season') {
        if (el.checked) { var y = new Date().getFullYear(); t.season = { from: y + '-12-01', to: (y + 1) + '-03-31' }; } else delete t.season;
      }
      if (k === 'hotelPickup') { if (el.checked) t.hotelPickup = true; else delete t.hotelPickup; }
      renderEditor(); touch();
    });
    ed.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var t = cur(); if (!t) return;
      if (b.hasAttribute('data-l')) { lang = b.getAttribute('data-l'); renderEditor(); return; }
      var act = b.getAttribute('data-act'); if (!act) return;
      var list = b.getAttribute('data-list'), i = Number(b.getAttribute('data-i'));
      var arr = list ? (t[list] = t[list] || []) : null;
      if (act === 'add') arr.push(list === 'itinerary' ? { time: '', title: ml(), desc: ml() } : ml());
      else if (act === 'remove') arr.splice(i, 1);
      else if (act === 'up' && i > 0) arr.splice(i - 1, 0, arr.splice(i, 1)[0]);
      else if (act === 'down' && i < arr.length - 1) arr.splice(i + 1, 0, arr.splice(i, 1)[0]);
      else if (act.indexOf('img-') === 0) {
        var p = b.getAttribute('data-p'), ps = photoList(t), at = ps.indexOf(p);
        if (act === 'img-remove') { ps.splice(at, 1); if (pending[p]) delete pending[p]; }
        if (act === 'img-main') { ps.splice(at, 1); ps.unshift(p); }
        if (act === 'img-left' && at > 0) ps.splice(at - 1, 0, ps.splice(at, 1)[0]);
        setPhotos(t, ps);
      }
      else if (act === 'preview') { preview(t); return; }
      else if (act === 'dup') {
        var copy = JSON.parse(JSON.stringify(t)), base = t.id + '-copy', id = base, n = 2;
        while (data.tours.some(function (x) { return x.id === id; })) id = base + '-' + (n++);
        copy.id = id; copy.status = 'draft'; copy.title.zh = (copy.title.zh || '') + '（複製）';
        data.tours.splice(idx + 1, 0, copy); idx++;
      }
      else if (act === 'delete') {
        if (!confirm('確定刪除「' + tourName(t) + '」？\n（只想暫時下架的話，把狀態改成「草稿」即可。）')) return;
        data.tours.splice(idx, 1); idx = Math.min(idx, data.tours.length - 1);
      }
      renderAll(); touch();
    });
  }

  function preview(t) {
    var copy = JSON.parse(JSON.stringify(t));
    copy.image = imgSrc(copy.image);
    copy.gallery = (copy.gallery || []).map(imgSrc);
    try { localStorage.setItem('hn-admin-preview', JSON.stringify(copy)); }
    catch (e) { status('照片太大，無法預覽新照片；發佈後即可在網站上看到。', 'warn'); copy.image = t.image; copy.gallery = t.gallery; try { localStorage.setItem('hn-admin-preview', JSON.stringify(copy)); } catch (e2) {} }
    window.open('tour.html?id=' + encodeURIComponent(t.id) + '&preview=1', '_blank');
  }

  // ---------- publish ----------
  function publish() {
    var errs = S.validateData(data);
    if (errs.length) {
      status('<strong>還不能發佈，請先修正：</strong><ul>' + errs.slice(0, 12).map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>', 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    var untranslated = data.tours.filter(function (t) {
      return t.status !== 'draft' && Object.keys(S.missingLangs(t)).length;
    }).map(function (t) { return '・' + tourName(t) + '（缺：' + Object.keys(S.missingLangs(t)).map(function (l) { return LANG_NAMES[l]; }).join('、') + '）'; });
    if (untranslated.length && !confirm('以下上架中的商品還有未翻譯的文字，該語言的客人會看到其他語言的內容：\n\n' + untranslated.join('\n') + '\n\n仍要發佈嗎？')) return;

    var used = {};
    data.tours.forEach(function (t) { photoList(t).forEach(function (p) { used[p] = 1; }); });
    var images = Object.keys(pending).filter(function (p) { return used[p]; }).map(function (p) {
      return { path: p, base64: pending[p].split(',')[1] };
    });
    var size = images.reduce(function (s, im) { return s + im.base64.length; }, 0);
    if (size > 4 * 1024 * 1024) { status('這次上傳的照片總量太大，請分幾次發佈（每次少放幾張照片）。', 'error'); return; }

    var btn = $('btn-publish'); btn.disabled = true; btn.textContent = '發佈中…';
    var edited = data.tours[idx];
    api('publish', { data: data, baseSha: baseSha, images: images, message: edited ? tourName(edited) : '' }).then(function (j) {
      btn.textContent = '發佈到網站';
      if (j._status === 200) {
        baseSha = j.sha; snapshot = JSON.stringify(data); pending = {}; clearDraft();
        var link = edited && edited.status !== 'draft' ? '　<a href="tour.html?id=' + encodeURIComponent(edited.id) + '" target="_blank" rel="noopener">查看商品頁 ↗</a>' : '';
        status('<strong>已發佈！</strong>網站約 1 分鐘後更新（若還看到舊內容，請稍候再重新整理）。' + link, 'ok');
        touch();
      } else if (j._status === 409) {
        status('<strong>無法發佈：</strong>有其他人剛更新了網站內容。請先記下你的修改，按「重新載入」取得最新內容後再改一次。', 'error');
        btn.disabled = false;
      } else if (j._status === 401) {
        status('登入已失效，請重新整理頁面再登入。', 'error'); btn.disabled = false;
      } else {
        var d = (j.details || []).map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('');
        status('<strong>發佈失敗。</strong>' + (d ? '<ul>' + d + '</ul>' : '請稍後再試，或聯絡工程人員。') , 'error'); btn.disabled = false;
      }
    }).catch(function () { btn.textContent = '發佈到網站'; btn.disabled = false; status('網路錯誤，請稍後再試。', 'error'); });
  }

  // ---------- toolbar ----------
  function initToolbar() {
    $('tour-list').addEventListener('click', function (e) {
      var b = e.target.closest('.row'); if (!b) return;
      idx = Number(b.getAttribute('data-i')); renderAll();
    });
    $('btn-add').addEventListener('click', function () {
      data.tours.push(newTour()); idx = data.tours.length - 1; renderAll(); touch();
      var f = $('f-title'); if (f) f.focus();
    });
    $('btn-reload').addEventListener('click', function () {
      if (dirty() && !confirm('重新載入會捨棄尚未發佈的修改，確定？')) return;
      clearDraft(); status('');
      if (online) api('load').then(function (j) { if (j._status === 200) setData(j.data, j.sha); });
      else fetch('data/tours.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (j) { setData(j, ''); });
    });
    $('btn-publish').addEventListener('click', publish);
    $('btn-export').addEventListener('click', function () {
      var errs = S.validateData(data);
      if (errs.length && !confirm('資料有以下問題：\n' + errs.slice(0, 8).join('\n') + '\n\n仍要匯出嗎？')) return;
      var blob = new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tours.json';
      document.body.appendChild(a); a.click(); a.remove();
      if (Object.keys(pending).length) status('注意：新上傳的照片在離線模式無法一起匯出，請另外提供照片檔給工程人員。', 'warn');
    });
    window.addEventListener('beforeunload', function (e) { if (dirty()) { e.preventDefault(); e.returnValue = ''; } });
  }

  document.addEventListener('DOMContentLoaded', function () { initGate(); initToolbar(); initEditorEvents(); });
})();
