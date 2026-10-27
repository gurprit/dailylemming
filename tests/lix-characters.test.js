import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_ACTIVITIES, frameIsPresent, activityForUnit,
  frameColumnForUnit, drawCharacterSprite, drawActivitySprite } from '../src/lix/characters.js';

test('Lix activity rows follow the original Ac enum, not arbitrary sprite indices', () => {
  const get = name => CHARACTER_ACTIVITIES.find(x => x.key === name);
  assert.equal(get('walker').row, 9);
  assert.equal(get('builder').row, 17);
  assert.equal(get('blocker').row, 16);
  assert.equal(get('digger').row, 23);
  assert.equal(get('basher').row, 21);
  assert.equal(get('exiter').row, 8);
});
test('Lix atlas excludes frames explicitly marked with the grid colour', () => {
  const width = 13, height = 5;
  const data = new Uint8ClampedArray(width * height * 4);
  for(let i = 0; i < data.length; i += 4) data.set([255, 0, 255, 255], i);
  // Valid frame has a non-magenta first pixel at (1,1), second is absent.
  const a = (1 * width + 1) * 4;
  data.set([120, 80, 30, 255], a);
  const src = { width, height, data };
  const layout = { width: 5, height: 3, columns: 2, rows: 1, grid: true };
  assert.equal(frameIsPresent(src,layout,0,0),true);
  assert.equal(frameIsPresent(src,layout,1,0),false);
});
test('physics state selects only implemented animations and builder timing cycles', () => {
  assert.equal(activityForUnit({state:'spawning'}),'faller');
  assert.equal(activityForUnit({state:'falling'}),'faller');
  assert.equal(activityForUnit({state:'walking'}),'walker');
  assert.equal(activityForUnit({state:'builder'}),'builder');
  assert.equal(activityForUnit({state:'blocker'}),null);
  assert.equal(frameColumnForUnit({state:'walking'},0,[1,3,5]),1);
  assert.equal(frameColumnForUnit({state:'walking'},2,[1,3,5]),5);
  assert.equal(frameColumnForUnit({state:'builder',buildTicks:1},0,[0,1,2,3]),2);
});
test('character renderer uses native bottom-of-frame foot anchor and mirror', () => {
  const calls = [];
  const context = { save(){},restore(){},
    translate(...args){calls.push(['translate',...args]);},
    scale(...args){calls.push(['scale',...args]);},
    drawImage(...args){calls.push(['image',...args]);}
  };
  const atlas={ canvas:{},layout:{width:34,height:34},
    rows:new Map([['walker',{row:9,indices:[0,1]}]]) };
  assert.equal(drawCharacterSprite(context,atlas,{state:'walking',x:52,y:100,vx:-1},0),true);
  assert.deepEqual(calls.find(x=>x[0]==='scale'),['scale',-1,1]);
  const image = calls.find(x=>x[0]==='image');
  assert.equal(image[2],1);
  assert.equal(image[3],1+9*35);
  assert.deepEqual(image.slice(-4),[-16,-26,34,34]);
  assert.equal(drawActivitySprite(context,atlas,'blocker',0),false);
});
