import test from 'node:test';
import assert from 'node:assert/strict';
import { getPractice, savePractice, practiceLabel } from '../src/lix/practice.js';
function storage() {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value) };
}
test('failed practice never becomes a personal best', () => {
  const store = storage();
  savePractice({ won: false, used: 0, seconds: 3 }, store);
  const rec = getPractice(store);
  assert.equal(rec.attempts, 1);
  assert.equal(rec.wins, 0);
  assert.equal(rec.best, null);
});
test('fewer builders ranks before shorter completion time', () => {
  const store = storage();
  const a = savePractice({ won: true, used: 5, seconds: 35 }, store);
  assert.equal(a.improved, true);
  savePractice({ won: true, used: 5, seconds: 60 }, store);
  const b = savePractice({ won: true, used: 4, seconds: 100 }, store);
  assert.equal(b.improved, true);
  assert.deepEqual(b.best, { used: 4, seconds: 100 });
  assert.match(practiceLabel(b), /Best: 4 builders/);
});
test('invalid localStorage does not crash practice game', () => {
  assert.equal(getPractice({ getItem() { throw Error('blocked'); } }).attempts, 0);
  assert.equal(savePractice({ won: true, used: 1, seconds: 5 }, {
    getItem: () => null, setItem() { throw Error('blocked'); }
  }).wins, 1);
});
