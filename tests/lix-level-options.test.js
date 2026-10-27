import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_OPTIONS, resolveLevelId } from '../src/lix/level-options.js';
test('only the demonstrated practice puzzles are verified and tutorial remains default', () => {
  assert.equal(resolveLevelId(''), 'little-bridge');
  assert.equal(resolveLevelId('nonexistent'),'little-bridge');
  assert.equal(resolveLevelId('pitfall'),'pitfall');
  assert.equal(resolveLevelId('double-trouble'),'double-trouble');
  assert.equal(resolveLevelId('tunnel-time'),'tunnel-time');
  assert.equal(resolveLevelId('dig-for-freedom'),'dig-for-freedom');
  assert.equal(resolveLevelId('secret-passage'),'secret-passage');
  assert.equal(resolveLevelId('turnaround'),'turnaround');
  assert.equal(resolveLevelId('bridge-brigade'),'bridge-brigade');
  assert.equal(resolveLevelId('building-block-maze'),'building-block-maze');
  assert.deepEqual(Object.entries(LEVEL_OPTIONS).filter(([,x])=>x.verified).map(([id])=>id),['little-bridge','double-trouble','tunnel-time','dig-for-freedom','secret-passage','turnaround','bridge-brigade']);
});
test('community levels retain authorship, warnings and original source links', () => {
  for (const [id, info] of Object.entries(LEVEL_OPTIONS)) {
    assert.ok(info.credit && info.source.startsWith('https://github.com/'));
    if (!info.verified) {
      assert.equal(info.verified, false);
      assert.match(info.hint, /not|unverified|experimental/i);
    }
  }
});
