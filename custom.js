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
      // DEMO: no backend. In production, POST the form to an email/API endpoint here.
      setTimeout(function () {
        form.hidden = true;
        var s = document.getElementById('custom-success');
        s.hidden = false;
        HN.applyI18n(s);
        s.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 650);
    });
  });
})();
