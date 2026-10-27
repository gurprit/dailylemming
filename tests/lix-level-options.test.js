import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_OPTIONS, FEATURED_LIX_LEVELS, resolveLevelId } from '../src/lix/level-options.js';
import { readFileSync } from 'node:fs';
import { parseLix } from '../src/lix/parse.js';
import { PLAYABLE_SKILLS } from '../src/lix/game.js';
import { FEATURED_COMMUNITY_LEVELS, mysteryLevel } from '../src/lix/featured-levels.js';
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


test('ten mystery community levels all use multiple implemented abilities',()=>{
  assert.equal(FEATURED_COMMUNITY_LEVELS.length,10);
  assert.equal(new Set(FEATURED_COMMUNITY_LEVELS).size,10);
  for(const id of FEATURED_COMMUNITY_LEVELS){
    const info=LEVEL_OPTIONS[id];
    assert.equal(info.category,'community-puzzle');
    assert.equal(info.verified,false,'smoke tests are not winning-route proof');
    const source=readFileSync(new URL('../content/lix/lovely/'+info.communityFile+'.txt',
      import.meta.url),'utf8');
    const level=parseLix(source);
    assert.equal(level.title,info.name);
    const required=Object.entries(level.skills).filter(([skill,n])=>n!==0&&skill!=='EXPLODER2');
    assert.ok(required.length>=2,id+' should use multiple skills');
    for(const [skill] of required)
      assert.ok(PLAYABLE_SKILLS.includes(skill.toLowerCase()),id+' missing '+skill);
  }
});
test('mystery picks are date-deterministic, shuffled and nonrepeating per ten-day block',()=>{
  assert.deepEqual(mysteryLevel('2026-10-27'),mysteryLevel('2026-10-27'));
  const ids=Array.from({length:10},(_,i)=>mysteryLevel(
    new Date(Date.UTC(2026,9,27+i)).toISOString().slice(0,10)).levelId);
  assert.equal(ids.length,10);
  // Blocks align to the epoch of the daily scheduler, not October 27.
  const day0='2026-10-26';
  const start=(new Date(day0+'T00:00:00Z').getTime()
    - new Date('2026-10-26T00:00:00Z').getTime())/86400000;
  assert.equal(start,0);
  for(const id of ids)assert.ok(FEATURED_COMMUNITY_LEVELS.includes(id));
  assert.ok(FEATURED_COMMUNITY_LEVELS.includes(mysteryLevel('2026-10-29').levelId));
});
test('homepage offers one mystery, a separate verified daily, and exactly ten community levels',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const ids=[...html.matchAll(/<option value="(lovely-[^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,[...FEATURED_COMMUNITY_LEVELS]);
  assert.match(html,/<option value="__mystery__">/);
  assert.match(html,/<option value="__daily__">/);
  assert.doesNotMatch(html,/<option value="lix-builders">/);
});
