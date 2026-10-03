/* Hidden North — tailor-made enquiry form (demo submit) */
(function () {
  'use strict';
  function showErr(input, key) {
    var p = document.querySelector('[data-err-for="' + input.id + '"]');
    input.classList.toggle('is-error', !!key);
    if (p) p.textContent = key ? HN.t(key) : '';
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('custom-form');
    if (!form) return;
    var name = document.getElementById('f-name');
    var email = document.getElementById('f-email');
    [name, email].forEach(function (el) {
      el.addEventListener('input', function () { if (el.classList.contains('is-error')) showErr(el, null); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      if (!name.value.trim()) { showErr(name, 'form.errRequired'); ok = false; }
      if (!email.value.trim()) { showErr(email, 'form.errRequired'); ok = false; }
      else if (!validEmail(email.value.trim())) { showErr(email, 'form.errEmail'); ok = false; }
      if (!ok) { var first = form.querySelector('.is-error'); if (first) first.focus(); return; }

      var btn = document.getElementById('f-submit');
      btn.disabled = true; btn.textContent = HN.t('form.sending');

      // No backend yet: deliver via the visitor's mail client (real, works today).
      // Upgrade path: POST to a Vercel function / Formspree instead.
      var get = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
      var interests = Array.prototype.slice.call(document.querySelectorAll('input[name="interests"]:checked'))
        .map(function (c) { return c.value; }).join(', ');
      var L = ['Name: ' + get('f-name'), 'Email: ' + get('f-email'), 'Language: ' + get('f-lang'),
        'Party: ' + get('f-party'), 'Dates: ' + get('f-dates'), 'Interests: ' + interests,
        'Budget: ' + get('f-budget'), '', get('f-msg')].join('\n');
      var mailto = 'mailto:info@hidden-north.jp?subject=' +
        encodeURIComponent('Tailor-made enquiry — ' + get('f-name')) + '&body=' + encodeURIComponent(L);

      setTimeout(function () {
        try { window.location.href = mailto; } catch (e) {}
        form.hidden = true;
        var s = document.getElementById('custom-success');
        s.hidden = false;
        HN.applyI18n(s);
        s.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      }, 500);
    });
  });
})();
