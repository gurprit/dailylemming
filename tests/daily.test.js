import test from 'node:test';
import assert from 'node:assert/strict';
import { utcDay, dayNumber, indexForDay, saveResult, readProgress, streak, shareText } from '../src/daily.js';

function store() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
}
test('UTC puzzle rolls over at UTC midnight', () => {
  assert.equal(utcDay(new Date('2026-10-26T23:59:59Z')), '2026-10-26');
  assert.equal(utcDay(new Date('2026-10-27T00:00:00Z')), '2026-10-27');
  assert.equal(dayNumber('2026-10-27'), 1);
});
test('same day maps to same puzzle for everyone', () => {
  for (let count = 1; count < 50; count++) {
    assert.equal(indexForDay('2026-12-25', count), indexForDay('2026-12-25', count));
    assert.ok(indexForDay('2026-12-25', count) < count);
  }
  assert.throws(() => indexForDay('2026-12-25', 0));
});
test('first attempt stays immutable while best improves', () => {
  const storage = store();
  saveResult('2026-10-26', { saved: 3, total: 8, won: false, seconds: 120, used: 4 }, storage);
  saveResult('2026-10-26', { saved: 8, total: 8, won: true, seconds: 90, used: 2 }, storage);
  const progress = readProgress(storage)['2026-10-26'];
  assert.equal(progress.first.saved, 3);
  assert.equal(progress.best.saved, 8);
  assert.equal(progress.won, true);
});
test('streak may include yesterday but not skip a missing day', () => {
  const progress = { '2026-10-23': { won: true }, '2026-10-24': { won: true } };
  assert.equal(streak(progress, '2026-10-25'), 2);
  assert.equal(streak(progress, '2026-10-26'), 0);
});
test('sharing produces spoiler-free text', () => {
  const result = { saved: 6, total: 8, used: 2, seconds: 63 };
  const text = shareText('2026-10-26', result, 0);
  assert.match(text, /Daily Lemming #1/);
  assert.doesNotMatch(text, /bridge-at-dusk/);
});
