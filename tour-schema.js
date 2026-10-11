/* Hidden North — tours.json validation.
   Shared by the admin page (admin.js) and the publish API (api/admin.js),
   so nothing malformed can reach the live site. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HNSchema = factory();
})(this, function () {
  'use strict';

  var LANGS = ['zh', 'ja', 'en'];
  var ID_RE = /^[a-z0-9][a-z0-9-]{1,60}$/;
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var IMG_RE = /^assets\/[a-z0-9_\/-]+\.(jpg|jpeg|png|webp)$/i;
  var UPLOAD_RE = /^assets\/tours\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i;

  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  function hasText(ml) { return isObj(ml) && LANGS.some(function (l) { return typeof ml[l] === 'string' && ml[l].trim(); }); }
  function isImg(p) { return typeof p === 'string' && IMG_RE.test(p) && p.indexOf('..') < 0; }

  // Returns a list of human-readable problems (繁中). Empty list = valid.
  function validateTour(t, label) {
    var e = [];
    var p = label || ('「' + ((t && t.title && (t.title.zh || t.title.ja || t.title.en)) || (t && t.id) || '?') + '」');
    if (!isObj(t)) return [p + '：格式錯誤'];
    if (!ID_RE.test(t.id || '')) e.push(p + '：網址代碼只能用小寫英文、數字、連字號（2–61 字）');
    if (t.type !== '1day' && t.type !== '2day') e.push(p + '：類型必須是一日遊或二日遊');
    if (t.status !== 'published' && t.status !== 'draft') e.push(p + '：狀態必須是上架或草稿');
    if (!hasText(t.title)) e.push(p + '：請填寫商品名稱');
    if (!isInt(t.price) || t.price < 0) e.push(p + '：成人價格必須是 0 以上的整數');
    var c = t.capacity || {};
    if (!isInt(c.min) || !isInt(c.max) || c.min < 1 || c.max < c.min || c.max > 200) e.push(p + '：人數上下限不正確');
    if (t.image ? !isImg(t.image) : t.status === 'published') e.push(p + '：請上傳主圖（上架的商品必須有照片）');
    if (t.gallery != null && (!Array.isArray(t.gallery) || !t.gallery.every(isImg))) e.push(p + '：相簿圖片路徑不正確');
    if (t.child != null && (!isObj(t.child) || !isInt(t.child.price) || t.child.price < 0)) e.push(p + '：兒童價格必須是 0 以上的整數');
    if (t.season != null) {
      var s = t.season;
      if (!isObj(s) || !DATE_RE.test(s.from || '') || !DATE_RE.test(s.to || '') || s.from > s.to) e.push(p + '：出團期間不正確（開始日需早於結束日）');
    }
    ['highlights', 'included', 'excluded', 'notes', 'confirmations'].forEach(function (k) {
      if (t[k] != null && (!Array.isArray(t[k]) || !t[k].every(isObj))) e.push(p + '：' + k + ' 格式錯誤');
    });
    if (t.itinerary != null && (!Array.isArray(t.itinerary) || !t.itinerary.every(function (s) { return isObj(s) && typeof s.time === 'string'; }))) {
      e.push(p + '：行程格式錯誤');
    }
    return e;
  }

  function validateData(d) {
    if (!isObj(d) || !Array.isArray(d.tours)) return ['資料格式錯誤'];
    if (d.tours.length > 300) return ['行程數量過多'];
    var errs = [], seen = {};
    d.tours.forEach(function (t) {
      errs = errs.concat(validateTour(t));
      if (t && t.id) { if (seen[t.id]) errs.push('網址代碼重複：' + t.id); seen[t.id] = 1; }
    });
    return errs;
  }

  // Which languages are missing text in a tour (for gentle warnings, not blocking).
  function missingLangs(t) {
    var miss = {};
    function chk(ml) { if (isObj(ml) && hasText(ml)) LANGS.forEach(function (l) { if (!(ml[l] || '').trim()) miss[l] = (miss[l] || 0) + 1; }); }
    ['title', 'summary', 'area', 'duration', 'meeting'].forEach(function (k) { chk(t[k]); });
    if (t.child) chk(t.child.label);
    ['highlights', 'included', 'excluded', 'notes', 'confirmations'].forEach(function (k) { (t[k] || []).forEach(chk); });
    (t.itinerary || []).forEach(function (s) { chk(s.title); chk(s.desc); });
    return miss;
  }

  return { LANGS: LANGS, ID_RE: ID_RE, IMG_RE: IMG_RE, UPLOAD_RE: UPLOAD_RE, validateTour: validateTour, validateData: validateData, missingLangs: missingLangs };
});
