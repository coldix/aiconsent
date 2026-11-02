// detector.test.js | v1.0.0 | 02/11/2026 10:40 AEDT (Melbourne)
// Run with: npm test  (node --test, no extra dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assess, findingLine, STAMPS, REFUSAL, BAND_NAMES } from '../public/detector-core.js';

const AI_TEXT = `Certainly! In today's fast-paced world, it's important to note that we must delve into the rich tapestry of ideas — a testament to seamless, robust and scalable thinking. 🙏✨
## Key points
- Leverage synergy
- Unlock potential
- Elevate outcomes`;
const HUMAN_TEXT = `ok so the bloody bus was late again lol and i waited at the stop near the servo from 7:42 till like 8:15 and teh driver just shrugged, i dunno why i even bother anymore honestly`;

test('same input gives the same output', () => {
  assert.deepEqual(assess(AI_TEXT), assess(AI_TEXT));
  assert.deepEqual(assess(HUMAN_TEXT), assess(HUMAN_TEXT));
  // whitespace differences normalise to the same finding
  assert.deepEqual(assess(HUMAN_TEXT), assess('  ' + HUMAN_TEXT.replace(/ /g, '  ') + '\n\n\n'));
});

test('output always carries one of the four stamp lines, picked per text', () => {
  assert.deepEqual(STAMPS, ['Certified by the Registry', 'Who wrote it? Does it matter?', 'Officially Undecidable', 'Humans borrow too']);
  for (const t of [AI_TEXT, HUMAN_TEXT, '', 'too short', 'x'.repeat(20000)]) {
    const r = assess(t);
    assert.ok(STAMPS.includes(r.stamp));
    assert.equal(assess(t).stamp, r.stamp);
  }
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(assess(`Sample text number ${i} for the Registry, written with care and some delve.`).stamp);
  assert.equal(seen.size, STAMPS.length);
});

test('empty or very short input gets the refusal', () => {
  for (const t of ['', '   ', 'hello', 'one two three four']) {
    const r = assess(t);
    assert.equal(r.refused, true);
    assert.equal(r.message, REFUSAL);
    assert.equal(findingLine(r), REFUSAL);
  }
});

test('percentage stays in the 0.0 to 100.0 range, to one decimal place', () => {
  const samples = [AI_TEXT, HUMAN_TEXT, AI_TEXT.repeat(30), HUMAN_TEXT.repeat(30), 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod'];
  for (let i = 0; i < 200; i++) samples.push(`Sample number ${i} with a few ordinary words in it, written on a quiet afternoon.`);
  for (const t of samples) {
    const r = assess(t);
    assert.equal(r.refused, false);
    assert.ok(r.pct >= 0 && r.pct <= 100, `out of range: ${r.pct}`);
    assert.match(r.pctText, /^\d{1,3}\.\d%$/);
    assert.ok(BAND_NAMES.includes(r.band));
    assert.ok(r.edits.length >= 1 && r.edits.length <= 3);
  }
});

test('"delve" and 🙏 show up in the human contribution line when present', () => {
  const r = assess('We should delve into this topic carefully, because it matters to all of us here 🙏');
  const line = findingLine(r);
  assert.match(line, /delve/);
  assert.match(line, /🙏/);
});

test('machine-heavy text scores higher than human-heavy text', () => {
  assert.ok(assess(AI_TEXT).pct > assess(HUMAN_TEXT).pct);
});

test('no em dashes in our own copy', () => {
  const r = assess(AI_TEXT);
  const own = [r.band, r.officer, r.verdict, ...r.items.flat(), ...r.edits].join(' ');
  assert.ok(!own.includes('—'));
});
