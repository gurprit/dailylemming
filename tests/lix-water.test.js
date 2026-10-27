import test from 'node:test';
import assert from 'node:assert/strict';
import { drawWaterBackdrop, drawWaterline } from '../src/lix/water.js';

test('repeat an animated water frame behind full-width ground, clipped to level bottom', () => {
  const calls = [];
  const ctx = { save() { calls.push(['save']); }, restore() { calls.push(['restore']); },
    beginPath() {}, rect(...p) { calls.push(['rect',...p]); },
    clip() {}, drawImage(_sprite,x,y) { calls.push(['draw',x,y]); } };
  const one = {width:32,height:32};
  const two = {width:32,height:32};
  const water = {kind:'hazard',sourceImage:'matt/water.W',x:192,y:256,
    imageData:{width:32,height:32},frames:[one,two]};
  assert.equal(drawWaterBackdrop(ctx,[water],5,512,288),true);
  assert.deepEqual(calls.find(c => c[0]==='rect'),['rect',0,256,512,32]);
  const frames = calls.filter(c => c[0]==='draw');
  assert.equal(frames.length,16);
  assert.deepEqual(frames[0],['draw',0,256]);
  assert.deepEqual(frames.at(-1),['draw',480,256]);
  assert.equal(drawWaterBackdrop(ctx,[],0,512,288),false);
});

test('waterline extends across every pixel column at the bottom of Little Bridge', () => {
  const calls = [];
  const ctx = {save(){},restore(){},beginPath(){},clip(){},
    rect(...xs) {calls.push(['clip',...xs]);},
    drawImage(_img, sx,sy,sw,sh,dx,dy,dw,dh) {
      calls.push(['draw',dx,dy,dw,dh]);
    }};
  const water = {kind:'hazard',sourceImage:'matt/water.W',
    imageData:{width:32,height:32},frames:[{width:32,height:32}]};
  assert.equal(drawWaterline(ctx,[water],0,512,288,14),true);
  assert.deepEqual(calls[0],['clip',0,274,512,14]);
  const draws = calls.filter(x=>x[0]==='draw');
  assert.equal(draws.length,16);
  assert.deepEqual(draws.at(0),['draw',0,274,32,14]);
  assert.deepEqual(draws.at(-1),['draw',480,274,32,14]);
});
