import test from 'node:test';
import assert from 'node:assert/strict';
import { selectableUnit, unitAtPoint, drawUnitTarget } from '../src/lix/targeting.js';
const standing = { x:100, y:220, grounded:true, state:'walking' };
test('cursor reticle appears only for Lix eligible for selected skill', () => {
  const stock = {builder:1,miner:1};
  assert.equal(selectableUnit(standing, 'builder', stock), true);
  assert.equal(selectableUnit({...standing, state:'exiting'}, 'builder',stock), false);
  assert.equal(selectableUnit({...standing, grounded:false},'miner',stock),false);
  assert.equal(selectableUnit({...standing, state:'builder'},'builder',stock),true);
  assert.equal(selectableUnit({...standing, state:'builder'},'miner',stock),false);
  assert.equal(selectableUnit(standing,'blocker',stock),false);
});
test('pointer picks closest selectable Lix with the same threshold as touch', () => {
  const units=[{...standing, x:95}, {...standing,x:120}, {...standing,x:130,state:'lost'}];
  assert.equal(unitAtPoint(units,116,210,'builder',{builder:1},25),1);
  assert.equal(unitAtPoint(units,130,210,'builder',{builder:1},25),1);
  assert.equal(unitAtPoint(units,200,210,'builder',{builder:1},25),-1);
});
test('bracket outline draws four L-shaped corners around the Lix', () => {
  const moves=[], ctx={save(){},restore(){},beginPath(){},stroke(){},
    moveTo(...p){moves.push(['m',...p]);},lineTo(...p){moves.push(['l',...p]);}};
  drawUnitTarget(ctx,standing);
  assert.equal(moves.filter(p=>p[0]==='m').length,4);
  assert.equal(moves.filter(p=>p[0]==='l').length,8);
});
