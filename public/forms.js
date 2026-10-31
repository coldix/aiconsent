// Forms: Turnstile when configured, JSON submit, friendly result. Everything lands as pending.
(function () {
  var forms = document.querySelectorAll('form[data-api]');
  if (!forms.length) return;
  fetch('/api/config').then(function (r) { return r.json(); }).then(function (cfg) {
    if (!cfg.turnstileSiteKey) return;
    forms.forEach(function (f) { var d = f.querySelector('.ts'); if (d) { d.className = 'cf-turnstile'; d.dataset.sitekey = cfg.turnstileSiteKey; } });
    var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'; s.async = true; document.head.appendChild(s);
  }).catch(function () {});
  forms.forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var out = f.querySelector('.form-result'), btn = f.querySelector('button[type=submit]');
      var data = {}; new FormData(f).forEach(function (v, k) { data[k] = v; });
      btn.disabled = true; out.textContent = 'Filing...';
      fetch(f.dataset.api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.ok) { out.textContent = f.dataset.ok || 'Received.'; f.reset(); }
          else out.textContent = d.error || 'Something went wrong.';
          if (window.turnstile) try { window.turnstile.reset(); } catch (x) {}
        })
        .catch(function () { out.textContent = 'The registry could not be reached. Please try again.'; })
        .finally(function () { btn.disabled = false; });
    });
  });
})();
