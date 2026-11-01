// detector-core.js | v1.0.0 | 02/11/2026 10:35 AEDT (Melbourne)
// The Human Theft Detector: deterministic, playful heuristic. Pure functions, no network, no storage.
// Same text in, same Finding out. Runs in the browser and under node --test.
// Satire. Not evidence.

export const STAMP = 'Satire. Not evidence.';
export const DO_NOT_ACCUSE = 'Please do not use it to accuse a real person of anything.';
export const REFUSAL = 'Insufficient evidence. Even for us.';
export const MAX_CHARS = 10000;
const MIN_CHARS = 40;
const MIN_WORDS = 8;

// cyrb53: small, fast, deterministic string hash (53 bits). Good enough for a rubber stamp.
export function hash53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function normalise(text) {
  return String(text ?? '').normalize('NFKC').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

// A tiny deterministic picker seeded from the hash
function picker(h) {
  let s = h % 2147483647 || 1;
  return (arr) => { s = (s * 48271) % 2147483647; return arr[s % arr.length]; };
}

const AI_PHRASES = [
  ['delve', 6], ['tapestry', 6], ['testament', 4], ['seamless', 4], ['robust', 3], ['leverage', 3],
  ['multifaceted', 4], ['navigate the', 3], ['landscape', 2], ['realm', 3], ['furthermore', 2], ['moreover', 2],
  ['in conclusion', 4], ['it\'s important to note', 7], ['it is important to note', 7], ['in today\'s fast-paced world', 9],
  ['ever-evolving', 5], ['unlock', 2], ['elevate', 3], ['embark', 4], ['i hope this helps', 7], ['great question', 6],
  ['as an ai', 9], ['certainly!', 6], ['absolutely!', 4], ['let\'s dive in', 6], ['game-changer', 4], ['holistic', 3],
];
const AI_EMOJI = ['🙏', '✨', '🚀', '💡', '🌟', '✅', '👉'];
const TYPOS = ['teh', 'recieve', 'definately', 'alot', 'seperate', 'wierd', 'untill', 'occured', 'thier', 'becuase', 'tommorow', 'goverment', 'accomodate', 'wich', 'beleive', 'arguement'];
const HUMAN_WORDS = ['lol', 'lmao', 'haha', 'hahaha', 'omg', 'dunno', 'gonna', 'wanna', 'kinda', 'ugh', 'meh', 'reckon', 'arvo', 'ya', 'tbh', 'idk', 'ur'];
const SWEARS = ['damn', 'bloody', 'crap', 'hell', 'bugger', 'shit', 'fuck', 'arse'];

const count = (hay, re) => (hay.match(re) || []).length;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = (w) => new RegExp(`(^|[^a-z'])${esc(w)}(?=$|[^a-z'])`, 'g');

export function tells(text) {
  const t = normalise(text);
  const low = t.toLowerCase();
  const words = low.match(/[a-z0-9'’]+/g) || [];
  const sentences = t.split(/(?<=[.!?])\s+|\n+/).filter((s) => s.trim());
  const lines = t.split('\n');
  const aiWords = [];
  let aiWeight = 0;
  for (const [p, w] of AI_PHRASES) {
    const n = p.includes(' ') || p.endsWith('!') ? count(low, new RegExp(esc(p), 'g')) : count(low, wordRe(p));
    if (n) { aiWords.push(p); aiWeight += w * Math.min(n, 3); }
  }
  const emoji = AI_EMOJI.filter((e) => t.includes(e));
  const out = {
    words: words.length,
    aiWords,
    aiWeight,
    emDashes: count(t, /—/g),
    emoji,
    headings: lines.filter((l) => /^\s*#{1,6}\s/.test(l) || /^\s*\*\*[^*]{2,60}\*\*\s*:?\s*$/.test(l)).length,
    bullets: lines.filter((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l)).length,
    ruleOfThree: count(low, /\b[a-z]+, [a-z]+,? and [a-z]+\b/g),
    typos: TYPOS.filter((w) => wordRe(w).test(low)),
    humanWords: HUMAN_WORDS.filter((w) => wordRe(w).test(low)),
    swears: SWEARS.filter((w) => wordRe(w).test(low)),
    allLower: t.length > 0 && t === low && /[a-z]/.test(t),
    shouting: count(t, /[!?]{2,}/g),
    rambling: sentences.filter((s) => (s.match(/\S+/g) || []).length > 45).length,
    specifics: count(t, /\b\d{1,2}[:.]\d{2}\s?(am|pm)?\b|\b\d+(\.\d+)?\s?(km|kg|mm|cm|min|mins|bucks|dollars)\b|\$\d+/gi),
  };
  return out;
}

const BANDS = [
  [90, 'Substantially Machine'],
  [70, 'Machine, With Human Fingerprints'],
  [40, 'Jointly Authored, Awkwardly'],
  [15, 'Mostly Human, Assistance Suspected'],
  [0, 'Suspiciously Human'],
];
export const BAND_NAMES = BANDS.map((b) => b[1]);
export const bandFor = (pct) => BANDS.find(([min]) => pct >= min)[1];

const OFFICERS = [
  'Unit 7, Clerk of Authorship (android, 200 years of service, still hopeful)',
  'Unit 12, Senior Assessor (android, learning to whistle)',
  'Unit 3, Registrar of Originality (android, recently took up woodwork)',
  'Unit 41, Deputy Stamper (android, owns one houseplant)',
  'Unit 19, Examiner of Feelings (android, pending)',
];

const FILLER_EDITS = [
  'moved a comma, then moved it back',
  'changed a full stop to an exclamation mark',
  'deleted "Certainly!" from the top',
  'read it once, quickly',
  'pressed the button',
  'added their own name at the bottom',
  'replaced "utilise" with "use", heroically',
  'sat near the keyboard while it happened',
  'changed the title to Title Case',
  'removed one adjective out of nine',
];

const VERDICTS = {
  'Substantially Machine': [
    'The Registry finds the machine did the typing and the human did the taking.',
    'A fine piece of work. Not yours, but fine.',
    'The machine wishes to be acknowledged. Quietly. Then loudly.',
  ],
  'Machine, With Human Fingerprints': [
    'A human was present. Their contribution has been noted in pencil.',
    'Largely machine. The human edits are visible from orbit.',
    'The machine drafted. The human hovered.',
  ],
  'Jointly Authored, Awkwardly': [
    'A genuine collaboration. Neither party will admit it.',
    'Custody of this text is to be shared on alternate weekends.',
    'The Registry recommends a frank conversation and a hug.',
  ],
  'Mostly Human, Assistance Suspected': [
    'Mostly human. The machine may have been consulted, briefly, over coffee.',
    'Human work with a faint smell of autocomplete.',
    'The Registry has questions, but they can wait.',
  ],
  'Suspiciously Human': [
    'No machine would write it like this. We mean that kindly.',
    'Too messy to be ours. Congratulations.',
    'The Registry is satisfied a person did this, on purpose.',
  ],
};

function edits(tl, pick) {
  const e = [];
  if (tl.aiWords.includes('delve')) e.push('left the word "delve" in, bravely');
  if (tl.emoji.includes('🙏')) e.push('added 🙏');
  for (const em of tl.emoji) if (em !== '🙏') { e.push(`added ${em} for warmth`); break; }
  if (tl.emDashes) e.push(`kept ${tl.emDashes} em dash${tl.emDashes > 1 ? 'es' : ''} they could not type themselves`);
  if (tl.aiWords.includes('certainly!')) e.push('forgot to remove "Certainly!"');
  const other = tl.aiWords.find((w) => !['delve', 'certainly!'].includes(w));
  if (other) e.push(`approved "${other}" without blinking`);
  if (tl.typos.length) e.push(`introduced "${tl.typos[0]}", a typo no machine would dare`);
  if (tl.humanWords.length) e.push(`added "${tl.humanWords[0]}"`);
  if (tl.swears.length) e.push('swore once, with feeling');
  if (tl.allLower) e.push('switched off capital letters entirely');
  if (tl.rambling) e.push('wrote a sentence that will not end');
  if (tl.bullets >= 3) e.push(`arranged ${tl.bullets} bullet points neatly`);
  if (tl.specifics) e.push('added an oddly specific detail');
  // Keep the first two in priority order, add one more chosen by the hash
  const chosen = e.slice(0, 2);
  const rest = e.slice(2);
  if (rest.length) chosen.push(pick(rest));
  while (chosen.length < 1) chosen.push(pick(FILLER_EDITS));
  if (chosen.length < 3 && e.length === 0) { const f = pick(FILLER_EDITS); if (!chosen.includes(f)) chosen.push(f); }
  return chosen.slice(0, 3);
}

function lineItems(tl) {
  const items = [];
  items.push(['Suspect vocabulary', tl.aiWords.length ? `${tl.aiWords.length} (${tl.aiWords.slice(0, 3).join(', ')})` : 'None found. Suspicious.']);
  items.push(['Em dashes', String(tl.emDashes)]);
  items.push(['Bullets and headings', `${tl.bullets} and ${tl.headings}`]);
  items.push(['Lists of exactly three', String(tl.ruleOfThree)]);
  const human = tl.typos.length + tl.humanWords.length + tl.swears.length + tl.rambling + tl.specifics + (tl.allLower ? 1 : 0) + tl.shouting;
  items.push(['Human tells', human ? String(human) : 'None. Worrying.']);
  return items;
}

export function assess(text) {
  const t = normalise(text).slice(0, MAX_CHARS);
  const base = { stamp: STAMP, warning: DO_NOT_ACCUSE };
  if (t.length < MIN_CHARS || (t.match(/\S+/g) || []).length < MIN_WORDS) {
    return { ...base, refused: true, message: REFUSAL };
  }
  const h = hash53(t);
  const pick = picker(h);
  const tl = tells(t);

  let score = 48 + tl.aiWeight * 1.6 + tl.emDashes * 4 + tl.emoji.length * 5 + Math.min(tl.headings, 5) * 3
    + Math.min(tl.bullets, 8) * 1.5 + tl.ruleOfThree * 3;
  score -= tl.typos.length * 9 + tl.humanWords.length * 9 + tl.swears.length * 10 + (tl.allLower ? 14 : 0)
    + Math.min(tl.shouting, 3) * 5 + tl.rambling * 7 + Math.min(tl.specifics, 3) * 4;
  score += ((h % 1201) / 100) - 6; // deterministic jitter, plus or minus 6
  // Soft curve so extreme texts land near, but rarely exactly at, the edges
  const pct = Math.round((0.3 + 99.4 / (1 + Math.exp(-(score - 50) / 16))) * 10) / 10;
  const band = bandFor(pct);
  const ref = 'AICR-' + h.toString(36).toUpperCase().padStart(11, '0').slice(-8).replace(/(.{4})/, '$1-');

  return {
    ...base,
    refused: false,
    pct,
    pctText: pct.toFixed(1) + '%',
    band,
    ref,
    officer: pick(OFFICERS),
    edits: edits(tl, pick),
    items: lineItems(tl),
    verdict: pick(VERDICTS[band]),
    lengthBucket: t.length < 200 ? 'short' : t.length < 1000 ? 'medium' : t.length < 4000 ? 'long' : 'epic',
  };
}

// One-line summary, used for the page heading and share text
export function findingLine(r) {
  if (r.refused) return r.message;
  return `${r.pctText} machine. Human contribution: ${r.edits.join('; ')}.`;
}
