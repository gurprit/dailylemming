import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_ACTIVITIES, frameIsPresent, activityForUnit,
  frameColumnForUnit, frameColumnForActivity, drawCharacterSprite, drawActivitySprite } from '../src/lix/characters.js';

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
  assert.equal(activityForUnit({state:'blocker'}),'blocker');
  assert.equal(activityForUnit({state:'basher'}),'basher');
  assert.equal(activityForUnit({state:'digger'}),'digger');
  assert.equal(activityForUnit({state:'exiting'}),'exiter');
  assert.equal(activityForUnit({state:'unsupported'}),null);
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

test('the original exiter frames advance during escape instead of using global walk phase', () => {
  const indices = Array.from({length:11}, (_,i)=>i);
  const first = frameColumnForUnit({state:'exiting',exitTicks:0},100,indices);
  const middle = frameColumnForUnit({state:'exiting',exitTicks:9},100,indices);
  const final = frameColumnForUnit({state:'exiting',exitTicks:17},100,indices);
  assert.equal(first,0);
  assert.ok(middle > first && final > middle);
  assert.equal(frameColumnForUnit({state:'exiting',exitTicks:0},200,indices),0);
});

test('native Blocker animation skips empty/tail frames and loops 4..19', () => {
  // Original row 16 also contains frame 20 (empty) and later release
  // frames. The standing animation must never advance into that tail.
  const indices = Array.from({ length: 26 }, (_, n) => n);
  assert.equal(frameColumnForActivity('blocker', 0, indices), 0);
  assert.equal(frameColumnForActivity('blocker', 19, indices), 19);
  assert.equal(frameColumnForActivity('blocker', 20, indices), 4);
  assert.equal(frameColumnForActivity('blocker', 35, indices), 19);
  assert.equal(frameColumnForActivity('blocker', 36, indices), 4);
  for (let t = 0; t < 150; t++) {
    const column = frameColumnForActivity('blocker', t, indices);
    assert.ok(column >= 0 && column <= 19,
      'Blocker should not flash empty or release frames at tick ' + t);
    assert.equal(frameColumnForUnit({ state: 'blocker', actionTicks: t }, t + 50, indices), column);
  }
});
test('Blocker preview and gameplay choose same phase, reset per new assignment', () => {
  const selected = Array.from({ length: 26 }, (_, i) => i);
  assert.equal(frameColumnForUnit({state:'blocker', actionTicks:0}, 900, selected), 0);
  assert.equal(frameColumnForUnit({state:'blocker', actionTicks:21}, 900, selected), 5);
  const images = [], ctx = { save(){}, restore(){}, translate(){},
    scale(){}, drawImage(...args){images.push(args);} };
  const atlas = { canvas:{}, layout:{width:34,height:34},
    rows:new Map([['blocker',{row:16,indices:selected}]]) };
  assert.equal(drawActivitySprite(ctx, atlas, 'blocker', 20), true);
  assert.equal(images[0][1], 1 + 4 * 35, 'gallery should not preview empty frame 20');
});
