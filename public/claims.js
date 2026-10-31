// Claims: list, detail and voting. Works with the registry offline (shows a polite note).
(function () {
  var tpl = document.getElementById('claim-tpl');
  if (!tpl) return;
  function who(p) { return p >= 50 ? 'Machine ' + p + '%' : 'Human ' + (100 - p) + '%'; }
  function render(c, isCounter) {
    var n = tpl.content.cloneNode(true), el = n.querySelector('.claim');
    if (isCounter) el.classList.add('counter');
    if (!c.case_of_week) el.querySelector('.cow').remove();
    var t = el.querySelector('.c-title'); t.textContent = c.title; t.href = '/claims/' + (c.parent_id || c.id) + '/';
    el.querySelector('.c-parties').textContent = (isCounter ? 'Counter-claim by ' : '') + c.complainant + ' v ' + c.respondent;
    el.querySelector('.c-body').textContent = c.body;
    el.querySelector('.c-craft').style.width = c.craft_ai + '%';
    el.querySelector('.c-intent').style.width = c.intent_ai + '%';
    el.querySelector('.c-craft-t').textContent = who(c.craft_ai);
    el.querySelector('.c-intent-t').textContent = who(c.intent_ai);
    el.querySelector('.c-up').textContent = c.upheld || 0;
    el.querySelector('.c-obj').textContent = c.objections || 0;
    var more = el.querySelector('.c-more');
    if (isCounter) more.remove();
    else { more.href = '/claims/' + c.id + '/'; more.textContent = (c.counters ? c.counters + ' counter-claim' + (c.counters > 1 ? 's' : '') : 'No counter-claims yet') + ' · Read the file'; }
    el.querySelectorAll('[data-vote]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        fetch('/api/vote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: c.id, vote: b.dataset.vote }) })
          .then(function (r) { return r.json(); })
          .then(function (d) { if (d.ok) { el.querySelector('.c-up').textContent = d.upheld; el.querySelector('.c-obj').textContent = d.objections; b.classList.add('voted'); } })
          .finally(function () { b.disabled = false; });
      });
    });
    return n;
  }
  function offline(box, msg) { box.innerHTML = ''; var p = document.createElement('p'); p.className = 'notice'; p.textContent = msg || 'The registry is between filing cabinets. Claims will appear here shortly.'; box.appendChild(p); }

  document.querySelectorAll('[data-claims]').forEach(function (box) {
    fetch('/api/claims?limit=' + (box.dataset.limit || 20)).then(function (r) { return r.json().then(function (d) { return [r.ok, d]; }); })
      .then(function (x) {
        if (!x[0]) return offline(box, x[1].error);
        box.innerHTML = '';
        x[1].claims.forEach(function (c) { box.appendChild(render(c)); });
        var s = document.querySelector('[data-stat-claims]'); if (s && x[1].stats) s.textContent = x[1].stats.claims;
        var v = document.querySelector('[data-stat-votes]'); if (v && x[1].stats) v.textContent = x[1].stats.votes;
      }).catch(function () { offline(box); });
  });

  var detail = document.querySelector('[data-claim-detail]');
  if (detail) {
    var id = (location.pathname.match(/\/claims\/(\d+)/) || [])[1] || new URLSearchParams(location.search).get('id');
    if (!id) return offline(detail, 'No claim number given.');
    fetch('/api/claims?id=' + id).then(function (r) { return r.json().then(function (d) { return [r.ok, d]; }); })
      .then(function (x) {
        if (!x[0]) return offline(detail, x[1].error);
        detail.innerHTML = '';
        document.title = x[1].claim.title + ' | AI Consent Registry';
        detail.appendChild(render(x[1].claim));
        var h = document.createElement('h2'); h.textContent = 'Counter-claims'; detail.appendChild(h);
        if (!x[1].counters.length) { var p = document.createElement('p'); p.textContent = 'None yet. Silence is not consent, but it is noted.'; detail.appendChild(p); }
        x[1].counters.forEach(function (c) { detail.appendChild(render(c, true)); });
        var a = document.querySelector('[data-counter-link]'); if (a) { a.href = '/claims/new/?counter=' + id; a.hidden = false; }
      }).catch(function () { offline(detail); });
  }
})();
