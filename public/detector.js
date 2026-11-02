// detector.js | v1.0.0 | 02/11/2026 11:15 AEDT (Melbourne) | The Human Theft Detector, page script
// Renders the certificate, builds the share image with <canvas> (all local), and optionally asks for a quip.
// The pasted text is never stored: no localStorage, no URL parameters, no analytics containing it.
import { assess } from './detector-core.js';

const form = document.getElementById('det-form');
const ta = document.getElementById('det-text');
const out = document.getElementById('det-result');
const quipBox = document.getElementById('det-quip');
const privacy = document.getElementById('det-privacy');
const SITE = 'https://aiconsent.au/detector/';
let current = null; // { r, date, remark, text }

const ga = (name, params) => { try { if (typeof window.gtag === 'function') window.gtag('event', name, params || {}); } catch (e) {} };
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const today = () => new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());

quipBox.addEventListener('change', () => {
  privacy.textContent = quipBox.checked
    ? 'Your text is checked in memory on our server for the remark, and never stored. The Finding itself is worked out in your browser.'
    : 'Your text never leaves your browser.';
});

function renderRefusal(r) {
  out.innerHTML = '';
  const c = el('div', 'det-cert det-refused');
  c.append(el('p', 'det-kicker', 'Assessment declined'), el('p', 'det-band', r.message));
  const s = el('p', 'det-stampline'); s.append(el('span', 'stamp det-bigstamp', r.stamp)); c.append(s);
  out.append(c);
}

function renderCert(r, date) {
  out.innerHTML = '';
  const c = el('article', 'det-cert');
  c.setAttribute('aria-label', 'Certificate of Assessment');

  const head = el('header', 'det-head');
  const seal = el('img'); seal.src = '/img/seal.webp'; seal.alt = ''; seal.width = 72; seal.height = 72;
  const ht = el('div');
  ht.append(el('p', 'det-kicker', 'AI Consent Registry'), el('h2', 'det-title', 'Certificate of Assessment'));
  head.append(seal, ht);
  c.append(head);

  const meta = el('dl', 'det-meta');
  [['Reference', r.ref], ['Date', date], ['Assessing Officer', r.officer]].forEach(([k, v]) => {
    meta.append(el('dt', null, k), el('dd', k === 'Reference' ? 'det-mono' : null, v));
  });
  c.append(meta);

  const finding = el('div', 'det-finding');
  finding.append(el('p', 'det-kicker', 'Finding'), el('p', 'det-pct', r.pctText + ' machine'), el('p', 'det-band', r.band));
  c.append(finding);

  c.append(el('h3', null, 'Human contribution'));
  const ul = el('ul', 'det-edits'); r.edits.forEach((e) => ul.append(el('li', null, e))); c.append(ul);

  const tbl = el('table', 'det-items');
  const cap = el('caption', 'small', 'Evidence considered (none of it is evidence)'); tbl.append(cap);
  const tb = el('tbody');
  r.items.forEach(([k, v]) => { const tr = el('tr'); tr.append(el('th', null, k), el('td', null, v)); tb.append(tr); });
  tbl.append(tb); c.append(tbl);

  const rem = el('p', 'det-remark');
  rem.append(el('b', null, "Officer's remarks: "), el('span', 'det-remark-text', current.remark));
  c.append(rem);

  const officer = el('div', 'det-officer');
  const bot = el('img'); bot.src = '/img/robot.webp'; bot.alt = 'The Assessing Officer, an android'; bot.width = 64; bot.height = 64;
  officer.append(bot, el('p', 'small', 'Signed, with some difficulty, by the Assessing Officer.'));
  c.append(officer);

  const s = el('p', 'det-stampline'); s.append(el('span', 'stamp det-bigstamp', r.stamp)); c.append(s);
  out.append(c);

  // Actions
  const act = el('div', 'det-actions');
  const ex = el('label', 'det-check');
  const exBox = el('input'); exBox.type = 'checkbox'; exBox.id = 'det-excerpt';
  ex.append(exBox, el('span', null, ' Include an excerpt on the image (first 60 characters)'));
  const dl = el('button', 'btn', 'Download certificate'); dl.type = 'button';
  dl.addEventListener('click', () => download(exBox.checked));
  act.append(ex, dl);
  if (canShareFiles()) {
    const sh = el('button', 'btn alt', 'Share certificate'); sh.type = 'button';
    sh.addEventListener('click', () => share(exBox.checked));
    act.append(sh);
  }
  const again = el('button', 'btn alt', 'Assess something else'); again.type = 'button';
  again.addEventListener('click', () => { out.innerHTML = ''; ta.focus(); });
  act.append(again);
  out.append(act);
}

function setRemark(text) {
  current.remark = text;
  const t = out.querySelector('.det-remark-text');
  if (t) t.textContent = text;
}

async function askQuip(r, text, token) {
  setRemark('The Assessing Officer is considering the matter…');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3500);
  try {
    const res = await fetch('/api/detector/quip', {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctrl.signal,
      body: JSON.stringify({ text: text.slice(0, 10000), band: r.band, score: r.pct }),
    });
    const d = await res.json().catch(() => ({}));
    if (token !== current.token) return;
    setRemark(d && d.quip ? d.quip : r.verdict);
  } catch (e) {
    if (token === current.token) setRemark(r.verdict);
  } finally { clearTimeout(timer); }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = ta.value;
  const r = assess(text);
  if (r.refused) { current = null; renderRefusal(r); return; }
  const token = Math.random();
  current = { r, date: today(), remark: r.verdict, text, token };
  renderCert(r, current.date);
  ga('detector_submit', { band: r.band, length_bucket: r.lengthBucket });
  if (quipBox.checked) askQuip(r, text, token);
  out.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ---------- Share image: 1200x630 PNG drawn locally ----------
const circle = (x, img, cx, cy, r) => { if (!img) return; x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.closePath(); x.clip(); x.drawImage(img, cx - r, cy - r, r * 2, r * 2); x.restore(); };
const loadImg = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/); const lines = []; let line = '';
  for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines;
}

async function drawCertificate(withExcerpt) {
  const { r, date, remark, text } = current;
  const W = 1200, H = 630;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const serif = 'Georgia, "Times New Roman", serif', mono = 'ui-monospace, Menlo, Consolas, monospace', sans = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  const [seal, bot] = await Promise.all([loadImg('/img/seal.webp'), loadImg('/img/robot.webp')]);

  // Paper
  x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#c9a227'; x.lineWidth = 6; x.strokeRect(18, 18, W - 36, H - 96);
  x.strokeStyle = '#0b1b3a'; x.lineWidth = 1.5; x.strokeRect(30, 30, W - 60, H - 120);

  circle(x, seal, 107, 105, 55);
  x.fillStyle = '#0b1b3a'; x.font = `600 22px ${sans}`; x.fillText('AI CONSENT REGISTRY', 182, 84);
  x.font = `bold 46px ${serif}`; x.fillText('Certificate of Assessment', 182, 136);

  x.font = `18px ${mono}`; x.fillStyle = '#5b6476';
  x.fillText(`Ref ${r.ref}   ·   ${date}`, 182, 168);

  x.fillStyle = '#0b1b3a'; x.font = `bold 92px ${serif}`; x.fillText(r.pctText, 56, 290);
  x.font = `30px ${serif}`; x.fillText('machine', 60, 330);
  x.font = `bold 34px ${serif}`; x.fillStyle = '#13295a';
  wrap(x, r.band, 520).slice(0, 2).forEach((l, i) => x.fillText(l, 56, 382 + i * 40));

  // Right column: human contribution
  x.fillStyle = '#0b1b3a'; x.font = `bold 22px ${sans}`; x.fillText('Human contribution', 640, 222);
  x.font = `21px ${sans}`; x.fillStyle = '#1b2233';
  let y = 256;
  for (const e of r.edits) { for (const l of wrap(x, '• ' + e, 500).slice(0, 2)) { x.fillText(l, 640, y); y += 28; } y += 6; }
  x.font = `italic 20px ${serif}`; x.fillStyle = '#5b6476';
  for (const l of wrap(x, remark, 500).slice(0, 3)) { x.fillText(l, 640, y + 8); y += 26; }

  if (withExcerpt && text) {
    const ex = text.replace(/\s+/g, ' ').trim().slice(0, 60);
    x.font = `16px ${mono}`; x.fillStyle = '#5b6476';
    x.fillText(`Excerpt: "${ex}${text.trim().length > 60 ? '…' : ''}"`, 56, 498);
  }
  circle(x, bot, W - 94, H - 150, 46);

  // Stamp across the middle, at an angle, hard to crop away
  x.save(); x.translate(W / 2, H / 2 - 20); x.rotate(-0.16);
  x.globalAlpha = 0.62; x.strokeStyle = '#c0392b'; x.fillStyle = '#c0392b'; x.lineWidth = 8;
  x.font = `900 64px ${sans}`;
  const STAMP = current.r.stamp; const st = STAMP.toUpperCase(); const sw = x.measureText(st).width;
  x.strokeRect(-sw / 2 - 26, -62, sw + 52, 92);
  x.fillText(st, -sw / 2, 4);
  x.restore();

  // Footer strip repeats the stamp
  x.fillStyle = '#0b1b3a'; x.fillRect(0, H - 66, W, 66);
  x.fillStyle = '#c9a227'; x.font = `bold 22px ${sans}`; x.fillText(STAMP.toUpperCase(), 30, H - 26);
  x.fillStyle = '#ffffff'; x.font = `17px ${sans}`;
  const sx = 30 + (() => { x.font = `bold 22px ${sans}`; const w = x.measureText(STAMP.toUpperCase()).width; x.font = `17px ${sans}`; return w; })() + 20;
  x.fillText('aiconsent.au/detector', sx, H - 27);

  return new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
}

const fileName = () => `aiconsent-certificate-${current.r.ref}.png`;

async function download(withExcerpt) {
  if (!current) return;
  const blob = await drawCertificate(withExcerpt);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = el('a'); a.href = url; a.download = fileName(); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  ga('detector_download', {});
}

function canShareFiles() {
  try { return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })); }
  catch (e) { return false; }
}

async function share(withExcerpt) {
  if (!current) return;
  const blob = await drawCertificate(withExcerpt);
  if (!blob) return;
  const file = new File([blob], fileName(), { type: 'image/png' });
  try {
    await navigator.share({ files: [file], title: 'Certificate of Assessment', text: `${current.r.pctText} machine, according to the AI Consent Registry. ${current.r.stamp}. ${SITE}` });
    ga('detector_share', {});
  } catch (e) {
    if (e && e.name === 'AbortError') return; // user cancelled
    download(withExcerpt);
  }
}
