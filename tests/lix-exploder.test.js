import test from 'node:test';
import assert from 'node:assert/strict';
import { LixGameModel, EXPLODER_FUSE_TICKS, EXPLODER_RADIUS } from '../src/lix/game.js';
import { PixelTerrain } from '../src/lix/terrain.js';
import { selectableUnit } from '../src/lix/targeting.js';
import { DirtParticles } from '../src/lix/particles.js';

const tile = (w,h) => {
  const data=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<data.length;i+=4)data.set([160,116,77,255],i);
  return { canvas:null,data:{width:w,height:h,data} };
};
function fixture(){
  const images=new Map([
    ['hatch.H.png',tile(16,20)],['goal.G.png',tile(32,32)],['ground.png',tile(256,64)]
  ]);
  const level={numeric:{SIZE_X:256,SIZE_Y:288,INITIAL:2,REQUIRED:1,SPAWN_INTERVAL:300},
    skills:{EXPLODER:2,BUILDER:1},groups:{},tiles:[
      {image:'hatch.H',kind:'hatch',x:8,y:160,flags:''},
      {image:'goal.G',kind:'goal',x:212,y:192,flags:''},
      {image:'ground',kind:'terrain',x:0,y:224,flags:''}
    ]};
  const m=new LixGameModel(level,images);
  m.togglePause();
  for(let n=0;n<13;n++)m.tick();
  return m;
}
test('walking Exploder runs a 5-second timer before pixel explosion',()=>{
  const m=fixture(),u=m.units[0],x=u.x;
  assert.equal(m.assignSkill('exploder',0),true);
  assert.equal(u.fuseTicks,EXPLODER_FUSE_TICKS);
  assert.equal(m.assignSkill('exploder',0),false,'cannot stack fuses');
  assert.equal(m.remaining.exploder,1);
  for(let i=0;i<EXPLODER_FUSE_TICKS-1;i++)m.tick();
  assert.equal(u.state,'walking');
  assert.ok(u.x>x,'does not freeze the moving Lix');
  assert.equal(u.fuseTicks,1);
  const px=m.terrain.pixels.slice();
  m.tick();
  assert.equal(u.state,'lost');
  assert.equal(m.lost,1);
  assert.ok(m.events.some(e=>e.type==='exploded'));
  assert.notDeepEqual(m.terrain.pixels,px,'the blast carves terrain');
});
test('circular explosive blast never removes steel',()=>{
  const t=new PixelTerrain(90,90);
  t.paintRect(5,5,80,80,[150,110,50,255]);
  const protectedPixel=t.index(40,40);
  t.steel[protectedPixel]=1;
  const deleted=t.digCircle(40,40,EXPLODER_RADIUS);
  assert.ok(deleted>300);
  assert.ok(t.solid(40,40),'steel survives');
  assert.ok(!t.solid(41,40),'surrounding soil gone');
  assert.ok(t.solid(70,40),'outside radius survives');
});
test('armed targets stay selectable while moving and explosion effects expire',()=>{
  const m=fixture(),u=m.units[0];
  assert.equal(selectableUnit(u,'exploder',m.remaining),true);
  assert.equal(m.assignSkill('exploder',0),true);
  assert.equal(selectableUnit(u,'exploder',m.remaining),false);
  const fx=new DirtParticles(()=>.5);
  fx.burst('exploded',u.x,u.y);
  assert.equal(fx.items.length,52);
  for(let i=0;i<25;i++)fx.update(.05);
  assert.equal(fx.items.length,0);
});
