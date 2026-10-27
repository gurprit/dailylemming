import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_OPTIONS, FEATURED_LIX_LEVELS, resolveLevelId } from '../src/lix/level-options.js';
import { readFileSync } from 'node:fs';
import { parseLix } from '../src/lix/parse.js';
import { PLAYABLE_SKILLS } from '../src/lix/game.js';
import { dayNumber } from '../src/daily.js';
import { FEATURED_COMMUNITY_LEVELS, mysteryLevel } from '../src/lix/featured-levels.js';
import { LIX_RANKS, RANKED_POOLS, rankedLevel, isRank } from '../src/lix/ranked-levels.js';
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


test('mystery community levels all offer at least three implemented abilities',()=>{
  assert.ok(FEATURED_COMMUNITY_LEVELS.length>=8);
  assert.equal(new Set(FEATURED_COMMUNITY_LEVELS).size,FEATURED_COMMUNITY_LEVELS.length);
  for(const id of FEATURED_COMMUNITY_LEVELS){
    const info=LEVEL_OPTIONS[id];
    assert.equal(info.category,'community-puzzle');
    assert.equal(info.verified,false,'smoke tests are not winning-route proof');
    const source=readFileSync(new URL('../content/lix/lovely/'+info.communityFile+'.txt',
      import.meta.url),'utf8');
    const level=parseLix(source);
    assert.equal(level.title,info.name);
    const required=Object.entries(level.skills).filter(([skill,n])=>n!==0&&skill!=='EXPLODER2');
    assert.ok(required.length>=3,id+' should offer three or more skills');
    for(const [skill] of required)
      assert.ok(PLAYABLE_SKILLS.includes(skill.toLowerCase()),id+' missing '+skill);
  }
});
test('mystery picks are date-deterministic and nonrepeating within each rotation block',()=>{
  assert.deepEqual(mysteryLevel('2026-10-27'),mysteryLevel('2026-10-27'));
  const today='2026-10-27';
  const size=FEATURED_COMMUNITY_LEVELS.length;
  const offset=dayNumber(today)%size;
  const blockStart=Date.parse(today+'T00:00:00Z')-offset*86400000;
  const ids=Array.from({length:size},(_,i)=>mysteryLevel(
    new Date(blockStart+i*86400000).toISOString().slice(0,10)).levelId);
  assert.deepEqual(new Set(ids),new Set(FEATURED_COMMUNITY_LEVELS));
  const nextBlock=Array.from({length:size},(_,i)=>mysteryLevel(
    new Date(blockStart+(size+i)*86400000).toISOString().slice(0,10)).levelId);
  assert.deepEqual(new Set(nextBlock),new Set(FEATURED_COMMUNITY_LEVELS));
  assert.notDeepEqual(ids,nextBlock,'blocks should shuffle differently');
});
test('October 27 mystery is the compact three-skill Beneath the Lab, not Solar Eclipse',()=>{
  assert.equal(mysteryLevel('2026-10-27').levelId,'lovely-beneaththelab');
  assert.notEqual(mysteryLevel('2026-10-27').levelId,'lovely-solareclipse');
});
test('homepage offers one mystery, a separate verified daily, and only curated community levels',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const ids=[...html.matchAll(/<option value="(lovely-[^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,[...FEATURED_COMMUNITY_LEVELS]);
  assert.match(html,/<option value="__mystery__">/);
  assert.match(html,/<option value="__daily__">/);
  assert.doesNotMatch(html,/<option value="lix-builders">/);
});

test('ranked practice uses the six real Lix categories, ordered from Lovely to Hopeless',()=>{
  assert.deepEqual(LIX_RANKS.map(rank=>rank.name),["Lovely","Quirky","Cunning","Daunting","Vicious","Hopeless"]);
  assert.equal(isRank('cunning'),true);
  assert.equal(isRank('mayhem'),false,'Mayhem is not an official Lix rank');
  assert.equal(rankedLevel('invalid'),null);
  for (const rank of LIX_RANKS) {
    const pool=RANKED_POOLS[rank.id];
    assert.ok(pool.length>=2,'include at least two puzzles for '+rank.name);
    assert.equal(new Set(pool).size,pool.length);
    for(const id of pool){
      const meta=LEVEL_OPTIONS[id];
      assert.ok(meta, 'missing level metadata: '+id);
      assert.equal(meta.verified,false, 'unverified community import must not count toward scored daily');
      if(rank.id==='lovely') assert.equal(meta.category,'community-puzzle');
      else {
        assert.equal(meta.category,'ranked-community');
        assert.equal(meta.rank,rank.id);
        assert.match(meta.source,new RegExp('/lemforum/'+rank.name+'/'));
        const content=readFileSync(new URL('../content/lix/ranked/'+rank.id+'/'+meta.communityFile+'.txt',import.meta.url),'utf8');
        const level=parseLix(content);
        assert.equal(level.title,meta.name,'official title must match '+id);
        const used=Object.entries(level.skills).filter(([name,count])=>count!==0 && name!=='EXPLODER2');
        assert.ok(used.length>=2,'real puzzle must offer more than one tool: '+id);
        for(const [skill] of used)
          assert.ok(PLAYABLE_SKILLS.includes(skill.toLowerCase()),id+' uses unimplemented '+skill);
      }
    }
    const a=rankedLevel(rank.id,'2026-10-27');
    assert.deepEqual(a,rankedLevel(rank.id,'2026-10-27'),'same rank/date is deterministic');
    assert.ok(pool.includes(a.levelId));
    assert.equal(a.challenge,false,'rank practice cannot affect daily streak');
  }
});
test('rank selector is accessible and links to each official category without replacing the scored daily',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  for(const rank of LIX_RANKS)
    assert.match(html,new RegExp('href="./index.html\\?difficulty='+rank.id+'" data-rank="'+rank.id+'"'));
  assert.match(html,/href=".\/index.html\?mode=daily" data-mode="daily"/);
  assert.match(html,/aria-label="Select game mode and practice difficulty"/);
  assert.match(html,/rank-links a\[aria-current="page"\]/);
});
