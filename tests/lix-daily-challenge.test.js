import test from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_POOL, DAILY_STORAGE_KEY, dailyChallenge, readDaily,
  saveDaily, dailyStreak, dailyResultText } from '../src/lix/daily-challenge.js';
import { LEVEL_OPTIONS } from '../src/lix/level-options.js';
const storage = () => {
  const data = new Map();
  return { getItem:k => data.get(k) ?? null, setItem:(k,v)=>data.set(k,v) };
};
test('UTC challenge is deterministic, verified and uses every slot once per rotation',()=>{
  assert.equal(dailyChallenge('2026-10-26').levelId, 'little-bridge');
  assert.equal(dailyChallenge('2026-10-27').levelId, 'tunnel-time');
  const ids=Array.from({length:DAILY_POOL.length},(_,d)=>
    dailyChallenge(new Date(Date.UTC(2026,9,26+d)).toISOString().slice(0,10)).levelId);
  assert.deepEqual(ids, [...DAILY_POOL]);
  assert.ok(ids.every(id => LEVEL_OPTIONS[id].verified));
  assert.ok(ids.every(id => LEVEL_OPTIONS[id].category!=='official-tutorial'));
  assert.equal(dailyChallenge('2026-11-02').levelId, 'little-bridge');
});
test('daily records preserve original attempt and keep best by rescued then skills then seconds',()=>{
  const store=storage(),day='2026-10-27',id=dailyChallenge(day).levelId;
  saveDaily(day,id,{won:false,saved:0,total:1,used:3,seconds:6},store);
  saveDaily(day,id,{won:true,saved:1,total:1,used:2,seconds:30},store);
  saveDaily(day,id,{won:true,saved:1,total:1,used:1,seconds:60},store);
  saveDaily(day,id,{won:true,saved:1,total:1,used:1,seconds:45},store);
  const rec=readDaily(store)[day];
  assert.equal(rec.first.saved,0);
  assert.equal(rec.first.won,false);
  assert.equal(rec.best.used,1);
  assert.equal(rec.best.seconds,45);
  assert.equal(rec.won,true);
  assert.equal(rec.attempts,4);
  assert.ok(store.getItem(DAILY_STORAGE_KEY));
  assert.match(dailyResultText(day,rec),/Daily Lemming #2/);
});
test('wrong level cannot pollute daily results; normal practice is separate',()=>{
  const store=storage();
  assert.throws(()=>saveDaily('2026-10-27','lix-bashers',{won:true,saved:5,total:5},store),/wrong daily/);
  assert.deepEqual(readDaily(store),{});
});
test('streak counts consecutive UTC victories without requiring todays result',()=>{
  const store=storage();
  for(const day of ['2026-10-26','2026-10-27']){
    saveDaily(day,dailyChallenge(day).levelId,{won:true,saved:1,total:1,used:1,seconds:15},store);
  }
  assert.equal(dailyStreak('2026-10-27',store),2);
  assert.equal(dailyStreak('2026-10-28',store),2);
  assert.equal(dailyStreak('2026-10-29',store),0);
});
test('storage problems do not crash or fake progress',()=>{
  const bad={getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}};
  assert.deepEqual(readDaily(bad),{});
  assert.equal(saveDaily('2026-10-27','tunnel-time',{won:true,saved:1,total:1},bad).won,true);
  assert.equal(dailyStreak('2026-10-27',bad),0);
});
