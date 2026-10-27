import test from 'node:test';
import assert from 'node:assert/strict';
import { LixGameModel } from '../src/lix/game.js';
import { activityForUnit } from '../src/lix/characters.js';

const rect=(w,h)=>({canvas:null,data:{
  width:w,height:h,data:new Uint8ClampedArray(Array.from({length:w*h},()=>[128,110,90,255]).flat())
}});
function scene(skills={BATTER:2,CUBER:2}){
  const level={ numeric:{SIZE_X:256,SIZE_Y:288,INITIAL:2,REQUIRED:1,SPAWN_INTERVAL:1},
    skills,groups:{},tiles:[
      {image:'hatch.H',kind:'hatch',x:8,y:160,flags:''},
      {image:'goal.G',kind:'goal',x:208,y:192,flags:''},
      {image:'ground',kind:'terrain',x:0,y:224,flags:''}
    ]};
  const images=new Map([['hatch.H.png',rect(16,20)],
    ['goal.G.png',rect(32,32)],['ground.png',rect(256,64)]]);
  const m=new LixGameModel(level,images);
  m.togglePause();
  for(let i=0;i<15;i++)m.tick();
  return m;
}
test('Batter animates a swing and launches a nearby Lix',()=>{
  const m=scene(),u=m.units[0],other=m.units[1];
  u.x=80;u.y=223;u.vx=1;u.grounded=true;u.state='walking';
  other.x=92;other.y=223;other.grounded=true;other.state='walking';
  assert.equal(m.assignSkill('batter',0),true);
  assert.equal(activityForUnit(u),'batter');
  assert.equal(m.remaining.batter,1);
  for(let i=0;i<3;i++)m.tick();
  assert.ok(m.events.some(e=>e.type==='battered'));
  assert.equal(other.state,'jumping');
  assert.ok(other.vy<0);
});
test('Cuber deposits steel-safe solid terrain, consumes a Lix and supports Undo',()=>{
  const m=scene(),u=m.units[0];
  u.x=72;u.y=223;u.grounded=true;u.state='walking';
  const x=Math.round(u.x),y=Math.round(u.y)-8;
  const original=m.terrain.pixels.slice();
  assert.equal(m.assignSkill('cuber',0),true);
  assert.equal(activityForUnit(u),'cuber');
  for(let i=0;i<12;i++)m.tick();
  assert.ok(m.events.some(e=>e.type==='cube-layer'));
  assert.equal(m.terrain.solid(x,y),true);
  assert.equal(m.undoBuilder(),true);
  assert.deepEqual(m.terrain.pixels,original);
  assert.equal(m.remaining.cuber,2);
  assert.equal(m.units[0].state,'walking');
});
