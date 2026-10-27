import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_OPTIONS, resolveLevelId } from '../src/lix/level-options.js';
test('tutorial is the only puzzle advertised as verified and remains default', () => {
  assert.equal(resolveLevelId(''), 'little-bridge');
  assert.equal(resolveLevelId('nonexistent'),'little-bridge');
  assert.equal(resolveLevelId('pitfall'),'pitfall');
  assert.equal(resolveLevelId('building-block-maze'),'building-block-maze');
  assert.deepEqual(Object.entries(LEVEL_OPTIONS).filter(([,x])=>x.verified).map(([id])=>id),['little-bridge']);
});
test('community levels retain authorship, warnings and original source links', () => {
  for (const [id, info] of Object.entries(LEVEL_OPTIONS)) {
    assert.ok(info.credit && info.source.startsWith('https://github.com/'));
    if (id !== 'little-bridge') {
      assert.equal(info.verified, false);
      assert.match(info.hint, /not|unverified|experimental/i);
    }
  }
});
