import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_OPTIONS, FEATURED_LIX_LEVELS, resolveLevelId } from '../src/lix/level-options.js';
import { readFileSync } from 'node:fs';
import { parseLix } from '../src/lix/parse.js';
import { PLAYABLE_SKILLS } from '../src/lix/game.js';
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

test('featured collection has exactly ten real native levels, all required skills implemented', () => {
  assert.equal(FEATURED_LIX_LEVELS.length,10);
  assert.equal(new Set(FEATURED_LIX_LEVELS).size,10);
  for (const id of FEATURED_LIX_LEVELS) {
    const info=LEVEL_OPTIONS[id];
    assert.equal(info?.category,'official-tutorial');
    assert.equal(info.verified,false,'import smoke tests do not prove full solvability');
    const source=readFileSync(new URL('../content/lix/tutorial/'+info.tutorialFile+'.txt',
      import.meta.url),'utf8');
    const level=parseLix(source);
    assert.equal(level.title,info.name);
    for(const [skill,count] of Object.entries(level.skills)) {
      if(count===0)continue;
      if(skill==='EXPLODER2')continue;
      assert.ok(PLAYABLE_SKILLS.includes(skill.toLowerCase()),id+' missing skill '+skill);
    }
  }
});
test('homepage selector lists exactly ten original Lix levels, keeping daily separate',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const ids=[...html.matchAll(/<option value="(lix-[^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,[...FEATURED_LIX_LEVELS]);
  assert.match(html,/<option value="__daily__">/);
  assert.doesNotMatch(html,/<option value="(little-bridge|secret-passage|pitfall)"/);
});
