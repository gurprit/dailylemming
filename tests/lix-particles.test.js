import test from 'node:test';
import assert from 'node:assert/strict';
import { DirtParticles } from '../src/lix/particles.js';

test('soil chips burst only when digging or mining, with bounded memory', () => {
  const p = new DirtParticles(() => .5);
  p.burst('drowned', 10, 20);
  assert.equal(p.items.length, 0);
  p.burst('dug', 12, 22);
  assert.equal(p.items.length, 8);
  p.burst('mined', 15, 20, 1);
  assert.equal(p.items.length, 18);
  for(let i=0;i<25;i++)p.burst('mined',15,20,1);
  assert.equal(p.items.length, 160);
  assert.ok(p.items.every(x=>x.size>=2&&x.size<=3));
  p.clear(); assert.equal(p.items.length,0);
});
test('Digger bursts fly upward, Miner bursts backward and fade without physics effects', () => {
  const p = new DirtParticles(() => .75);
  p.burst('dug', 10, 30, 1);
  const chip = p.items[0], y = chip.y;
  assert.ok(chip.vy < 0);
  p.update(.04);
  assert.ok(chip.y < y);
  p.clear();
  p.burst('mined', 10, 30, 1);
  assert.ok(p.items[0].vx < 0);
  for (let n=0;n<20;n++)p.update(.05);
  assert.equal(p.items.length,0);
});
test('draw emits squares but does not alter canvas state', () => {
  const actions=[], ctx={save(){actions.push('save');},restore(){actions.push('restore');},fillRect(...r){actions.push(r)}};
  const p = new DirtParticles(()=>.4);
  p.burst('dug',20,25);
  p.draw(ctx);
  assert.equal(actions[0],'save');
  assert.equal(actions.at(-1),'restore');
  assert.equal(actions.filter(Array.isArray).length,8);
});

test('Basher throws a short backward debris burst', () => {
  const p = new DirtParticles(() => .5);
  p.burst('bashed', 50, 90, 1);
  assert.equal(p.items.length, 8);
  assert.ok(p.items.every(chip => chip.vx < 0 && chip.vy < 0));
  p.update(.05);
  assert.ok(p.items.some(chip => chip.y < 90));
});
