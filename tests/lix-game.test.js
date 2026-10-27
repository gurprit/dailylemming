import test from 'node:test';
import assert from 'node:assert/strict';
import { LixGameModel, EXIT_ANIMATION_TICKS } from '../src/lix/game.js';

const tile = (w, h, color = [20, 160, 80, 255]) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < data.length; p += 4) data.set(color, p);
  return { canvas: null, data: { width: w, height: h, data } };
};
const item = (image, kind, x, y) => ({ image, kind, x, y, flags: '' });
function sample(gap = false) {
  const tiles = [
    item('hatch.H', 'hatch', 8, 160),
    item('goal.G', 'goal', 118, 192),
    item('ground', 'terrain', 0, 224)
  ];
  if (gap) {
    tiles[2] = item('left', 'terrain', 0, 224);
    tiles.push(item('right', 'terrain', 82, 224));
  }
  const images = new Map([
    ['hatch.H.png', tile(16, 20)],
    ['goal.G.png', tile(32, 32)],
    ['ground.png', tile(256, 32)],
    ['left.png', tile(48, 32)],
    ['right.png', tile(174, 32)]
  ]);
  return {
    level: { numeric: { SIZE_X: 256, SIZE_Y: 288, INITIAL: 1, REQUIRED: 1, SPAWN_INTERVAL: 1 },
      skills: { BUILDER: 5 }, tiles, groups: {} },
    images
  };
}
test('game starts paused and spawns on the first simulation tick after Start', () => {
  const { level, images } = sample();
  const game = new LixGameModel(level, images);
  game.tick();
  assert.equal(game.spawned, 0);
  assert.equal(game.ticks, 0);
  game.togglePause();
  game.tick();
  assert.equal(game.spawned, 1);
  assert.equal(game.units.length, 1);
});
test('actual per-pixel ground supports character saving at the true goal', () => {
  const { level, images } = sample();
  const game = new LixGameModel(level, images);
  game.togglePause();
  for (let i = 0; i < 500 && !game.done; i++) game.tick();
  assert.equal(game.won, true);
  assert.equal(game.saved, 1);
  assert.equal(game.lost, 0);
});
test('builder creates collision terrain and is limited by skill inventory', () => {
  const { level, images } = sample(true);
  const game = new LixGameModel(level, images);
  game.togglePause();
  for (let i = 0; i < 12; i++) game.tick();
  const u = game.units[0];
  const x = u.x, y = u.y;
  assert.equal(game.assignBuilder(0), true);
  assert.equal(game.remaining.builder, 4);
  for (let i = 0; i < 16; i++) game.tick();
  assert.equal(u.state, 'builder');
  assert.ok(u.x > x && u.y < y);
  assert.ok(game.terrain.solid(Math.round(x + 3), Math.round(y + 2)));
  assert.equal(game.assignBuilder(0), true, 'builder chaining can queue another assignment');
  assert.equal(game.units[0].queuedBuilders, 1);
  game.reset();
  assert.equal(game.remaining.builder, 5);
  assert.equal(game.spawned, 0);
});
test('falling creatures can be lost; failed run cannot increment daily results', () => {
  const { level, images } = sample();
  level.tiles = level.tiles.filter(t => t.kind !== 'terrain');
  const game = new LixGameModel(level, images);
  game.togglePause();
  for (let i = 0; i < 350 && !game.done; i++) game.tick();
  assert.equal(game.lost, 1);
  assert.equal(game.won, false);
});

// Regression: a gadget's .image is a drawable canvas, not its source path.
test('hazard checks use source filename instead of calling string methods on canvas', () => {
  const { level, images } = sample();
  level.tiles.push(item('water.W', 'hazard', 40, 185));
  const water = tile(32, 24);
  water.canvas = { width: 32, height: 24 }; // Canvas-like drawable, not a string
  images.set('water.W.png', water);
  const model = new LixGameModel(level, images);

  assert.equal(typeof model.hazards[0].image, 'object');
  assert.equal(model.hazards[0].sourceImage, 'water.W');
  assert.equal(model.inHazard({ x: 50, y: 206 }), true);
  assert.equal(model.inHazard({ x: 20, y: 206 }), false);
});

test('Lix sprite sheet dimensions do not push hatch spawn into the middle of map', () => {
  const { level, images } = sample();
  const hatch = images.get('hatch.H.png');
  hatch.canvas = { width: 500, height: 144 }; // multi-frame texture atlas
  hatch.frames = [hatch.canvas];
  const model = new LixGameModel(level, images);
  model.togglePause();
  model.tick();
  const unit = model.units[0];
  assert.equal(unit.x, 8 + 8); // per-frame width, not 500px atlas width
  assert.equal(unit.state, 'spawning');
  for (let i = 0; i < 50 && unit.state === 'spawning'; i++) {
    const startX = unit.x;
    model.tick();
    assert.equal(unit.x, startX, 'hatch exit movement must be vertical until landing');
  }
  assert.equal(unit.state, 'walking');
  assert.equal(model.saved, 0);
  assert.equal(model.lost, 0);
});

test('builders cannot create mid-air platforms or consume skill while falling', () => {
  const { level, images } = sample(false);
  level.tiles = level.tiles.filter(t => t.kind !== 'terrain');
  const model = new LixGameModel(level, images);
  model.togglePause();
  for (let n = 0; n < 3; n++) model.tick();
  assert.equal(model.units[0].state, 'spawning');
  assert.equal(model.assignBuilder(0), false);
  assert.equal(model.remaining.builder, 5);
});
test('walking off a gap enters a vertical fall instead of hovering over water', () => {
  const { level, images } = sample(true);
  const model = new LixGameModel(level, images);
  model.togglePause();
  let falling = false, x = null, oldY = null;
  for (let i = 0; i < 180 && !model.done; i++) {
    model.tick();
    const u = model.units[0];
    if (u?.state === 'falling') {
      if (!falling) { falling = true; x = u.x; oldY = u.y; }
      else {
        assert.equal(u.x, x, 'a standard Lix fall has no horizontal motion');
        assert.ok(u.y > oldY, 'the foot must descend every fall update');
        break;
      }
    }
  }
  assert.equal(falling, true);
});
test('a builder places no more than 12 short steps and rises 2px per brick', () => {
  const { level, images } = sample();
  const model = new LixGameModel(level, images);
  model.togglePause();
  for (let i = 0; i < 12; i++) model.tick();
  const u = model.units[0];
  assert.equal(model.assignBuilder(0), true);
  const startY = u.y;
  for (let i = 0; i < 200; i++) model.tick();
  const bricks = model.events.filter(e => e.type === 'brick');
  assert.equal(bricks.length, 12);
  assert.equal(bricks.at(-1).y, Math.round(startY - 24));
  assert.equal(model.assigned, 1);
});

test('frame stepping progresses one fixed Lix physics update while remaining paused', () => {
  const { level, images } = sample();
  const model = new LixGameModel(level, images);
  assert.equal(model.paused, true);
  assert.equal(model.stepOnce(), true);
  assert.equal(model.ticks, 1);
  assert.equal(model.spawned, 1);
  assert.equal(model.started, true);
  assert.equal(model.paused, true);
  assert.equal(model.stepOnce(), true);
  assert.equal(model.ticks, 2);
  model.togglePause();
  assert.equal(model.stepOnce(), false, 'frame stepping disabled during live play');
});
test('grounded walker can queue a builder assignment while paused', () => {
  const { level, images } = sample();
  const model = new LixGameModel(level, images);
  model.togglePause();
  for (let i = 0; i < 15; i++) model.tick();
  model.togglePause();
  assert.equal(model.paused, true);
  assert.equal(model.units[0].state, 'walking');
  assert.equal(model.assignBuilder(0), true);
  assert.equal(model.paused, true);
  assert.equal(model.remaining.builder, 4);
});

test('queued builder assignments extend beyond the normal twelve bricks', () => {
  const { level, images } = sample();
  level.tiles = level.tiles.map(tile =>
    tile.kind === 'goal' ? { ...tile, x: 222 } : tile);
  const model = new LixGameModel(level, images);
  model.togglePause();
  for (let i = 0; i < 15; i++) model.tick();
  assert.equal(model.assignBuilder(0), true);
  assert.equal(model.assignBuilder(0), true);
  assert.equal(model.remaining.builder, 3);
  assert.equal(model.units[0].queuedBuilders, 1);
  for (let i = 0; i < 460 && !model.done; i++) model.tick();
  assert.equal(model.events.filter(e => e.type === 'builder-continued').length, 1);
  assert.equal(model.events.filter(e => e.type === 'brick').length, 24);
  assert.equal(model.units[0].queuedBuilders, 0);
  assert.equal(model.assigned, 2);
});

test('undo restores bridge pixels, spent builder, position and elapsed time', () => {
  const { level, images } = sample(true);
  const game = new LixGameModel(level, images);
  game.togglePause();
  for (let i = 0; i < 12; i++) game.tick();
  const x = game.units[0].x, y = game.units[0].y, tick = game.ticks;
  const original = game.terrain.pixels.slice();
  assert.equal(game.assignBuilder(0), true);
  for (let i = 0; i < 40; i++) game.tick();
  assert.equal(game.undoAvailable, true);
  assert.equal(game.undoBuilder(), true);
  assert.equal(game.ticks, tick);
  assert.equal(game.units[0].x, x);
  assert.equal(game.units[0].y, y);
  assert.equal(game.units[0].state, 'walking');
  assert.equal(game.remaining.builder, 5);
  assert.equal(game.assigned, 0);
  assert.equal(game.paused, true);
  assert.deepEqual(game.terrain.pixels, original);
  assert.equal(game.undoBuilder(), false);
});
test('undo queued builder restores queue without cancelling active build', () => {
  const { level, images } = sample();
  const game = new LixGameModel(level, images);
  game.togglePause();
  for (let i = 0; i < 12; i++) game.tick();
  assert.equal(game.assignBuilder(0), true);
  for (let i = 0; i < 25; i++) game.tick();
  const before = game.units[0].buildSteps;
  assert.equal(game.assignBuilder(0), true);
  assert.equal(game.units[0].queuedBuilders, 1);
  assert.equal(game.undoBuilder(), true);
  assert.equal(game.units[0].state, 'builder');
  assert.equal(game.units[0].buildSteps, before);
  assert.equal(game.units[0].queuedBuilders, 0);
  assert.equal(game.remaining.builder, 4);
  assert.equal(game.history.length, 1);
});

test('exit shows original escape state before rescue count and victory appear', () => {
  const {level, images} = sample();
  const m = new LixGameModel(level, images);
  m.togglePause();
  for (let n=0;n<350 && !m.units.some(u=>u.state==='exiting');n++) m.tick();
  assert.equal(m.units[0].state, 'exiting');
  assert.equal(m.saved,0);
  assert.equal(m.done,false);
  assert.ok(m.events.some(e=>e.type==='exit-started'));
  for(let n=0;n<EXIT_ANIMATION_TICKS-1;n++) m.tick();
  assert.equal(m.saved,0,'do not interrupt escape animation with win modal');
  m.tick();
  assert.equal(m.saved,1);
  assert.equal(m.done,true);
  assert.equal(m.won,true);
  assert.ok(m.events.some(e=>e.type==='saved'));
});
test('basher removes an actual horizontal path through ordinary pixels', () => {
  const {level, images} = sample();
  level.skills.BASHER = 2;
  level.tiles.push(item('wall','terrain',43,185));
  images.set('wall.png',tile(22,39));
  const m = new LixGameModel(level, images);
  m.togglePause();
  for(let n=0;n<13;n++)m.tick();
  const u=m.units[0];
  assert.equal(u.state,'walking');
  assert.equal(m.terrain.solid(44,212),true);
  assert.equal(m.assignSkill('basher',0),true);
  assert.equal(m.remaining.basher,1);
  for(let n=0;n<9;n++)m.tick();
  assert.equal(m.terrain.solid(44,212),false);
  assert.ok(m.events.some(e=>e.type==='bashed'));
});
test('digger removes vertical earth but leaves steel intact', () => {
  const {level,images}=sample();
  level.skills.DIGGER=2;
  const m=new LixGameModel(level,images);
  m.togglePause();
  for(let n=0;n<13;n++)m.tick();
  const u=m.units[0]; const x=Math.round(u.x);
  assert.equal(m.terrain.solid(x,224),true);
  assert.equal(m.assignSkill('digger',0),true);
  m.tick();
  assert.equal(m.terrain.solid(x,224),false);
  assert.equal(m.remaining.digger,1);
  assert.ok(m.events.some(e=>e.type==='dug'));
  const steelIndex=m.terrain.index(x,230);
  m.terrain.steel[steelIndex]=1;
  for(let n=0;n<25&&!m.done;n++)m.tick();
  assert.equal(m.terrain.steel[steelIndex],1);
  assert.equal(m.terrain.solid(x,230),true);
});
test('blocker stays in position and reverses a nearby walker', () => {
  const {level,images}=sample();
  level.skills.BLOCKER=1;
  const m=new LixGameModel(level,images);
  m.togglePause();
  for(let n=0;n<13;n++)m.tick();
  const blocker=m.units[0];
  const x=blocker.x;
  assert.equal(m.assignSkill('blocker',0),true);
  m.units.push({ ...blocker, x:blocker.x-10, vx:1, state:'walking',
    grounded:true });
  m.tick();
  assert.equal(blocker.state,'blocker');
  assert.equal(blocker.x,x);
  assert.equal(m.units[1].vx,-1);
  assert.ok(m.events.some(e=>e.type==='blocked'));
});
test('undo restores the last non-builder skill and original collision pixels', () => {
  const {level,images}=sample();
  level.skills.DIGGER=1;
  const m=new LixGameModel(level,images);
  m.togglePause();
  for(let n=0;n<13;n++)m.tick();
  const original=m.terrain.pixels.slice();
  assert.equal(m.assignSkill('digger',0),true);
  for(let n=0;n<5;n++)m.tick();
  assert.equal(m.undoBuilder(),true);
  assert.equal(m.remaining.digger,1);
  assert.equal(m.assigned,0);
  assert.equal(m.paused,true);
  assert.deepEqual(m.terrain.pixels,original);
});

test('miner descends diagonally, erases real soil and remains undoable', () => {
  const {level,images}=sample();
  level.skills.MINER=2;
  const m=new LixGameModel(level,images);
  m.togglePause();
  for(let n=0;n<13;n++) m.tick();
  const u=m.units[0], x=u.x, y=u.y;
  const pixels=m.terrain.pixels.slice();
  assert.equal(m.assignSkill('miner',0),true);
  assert.equal(m.remaining.miner,1);
  for(let n=0;n<10;n++)m.tick();
  assert.ok(u.x>x,'a miner works forward');
  assert.ok(u.y>y,'a miner descends');
  assert.ok(m.events.some(e=>e.type==='mined'));
  assert.equal(m.terrain.solid(Math.round(x)+5,Math.round(y)+2),false);
  assert.equal(m.undoBuilder(),true);
  assert.equal(m.remaining.miner,2);
  assert.equal(m.units[0].state,'walking');
  assert.deepEqual(m.terrain.pixels,pixels);
});
test('miner stops on steel without cutting through indestructible material',()=>{
  const {level,images}=sample();
  level.skills.MINER=1;
  const m=new LixGameModel(level,images);
  m.togglePause();
  for(let n=0;n<13;n++)m.tick();
  const u=m.units[0];
  const px=Math.round(u.x)+4, py=Math.round(u.y)+2;
  const index=m.terrain.index(px,py);
  m.terrain.steel[index]=1;
  assert.equal(m.assignSkill('miner',0),true);
  m.tick();
  assert.equal(u.state,'walking');
  assert.equal(m.terrain.steel[index],1);
  assert.equal(m.terrain.solid(px,py),true);
  assert.ok(m.events.some(e=>e.type==='miner-steel'));
});

test('a stationary blocker is allowed to remain once the rescue quota is achieved', () => {
  const {level, images} = sample();
  level.numeric.INITIAL = 3;
  level.numeric.REQUIRED = 2;
  level.skills.BLOCKER = 1;
  const game = new LixGameModel(level, images);
  game.spawned = 3;
  game.units = [
    {x: 12, y:223, state:'blocker'},
    {x: 125, y:223, state:'saved'},
    {x: 126, y:223, state:'saved'}
  ];
  game.saved = 1;
  assert.equal(game.readyToFinish, false);
  game.saved = 2;
  assert.equal(game.readyToFinish, true);
});

test('blocker frame count starts at assignment and advances while stationary', () => {
  const {level, images} = sample();
  level.skills.BLOCKER = 1;
  const m = new LixGameModel(level, images);
  m.togglePause();
  for (let i = 0; i < 13; i++) m.tick();
  assert.equal(m.assignSkill('blocker', 0), true);
  const u = m.units[0], x = u.x, y = u.y;
  assert.equal(u.actionTicks, 0);
  for (let i = 0; i < 36; i++) m.tick();
  assert.equal(u.actionTicks, 36);
  assert.equal(u.state, 'blocker');
  assert.equal(u.x, x);
  assert.equal(u.y, y);
});

test('two original Lix hatches alternate entrants deterministically', () => {
  const {level,images}=sample();
  level.numeric.INITIAL=4;
  level.numeric.REQUIRED=1;
  level.numeric.SPAWN_INTERVAL=1;
  const extra={...item('hatch.H','hatch',160,160),flags:'r'};
  level.tiles.push(extra);
  const model=new LixGameModel(level,images);
  model.togglePause();
  for(let i=0;i<15&&model.spawned<4;i++)model.tick();
  assert.equal(model.spawned,4);
  const starts=model.events.filter(x=>x.type==='spawn').map(x=>x.x);
  assert.equal(starts.length,4);
  assert.equal(starts[0],starts[2]);
  assert.equal(starts[1],starts[3]);
  assert.notEqual(starts[0],starts[1]);
  model.reset();
  model.togglePause();
  for(let i=0;i<15&&model.spawned<2;i++)model.tick();
  assert.deepEqual(model.events.filter(x=>x.type==='spawn').map(x=>x.x),starts.slice(0,2));
});

test('native Lix unlimited Walker and Jumper inventories never decrement', () => {
  const {level,images}=sample();
  level.skills={WALKER:-1,JUMPER:-1};
  const m=new LixGameModel(level,images);
  m.togglePause();
  for(let i=0;i<13;i++)m.tick();
  assert.equal(m.remaining.walker,-1);
  assert.equal(m.remaining.jumper,-1);
  const u=m.units[0],heading=u.vx;
  assert.equal(m.assignSkill('walker',0),true);
  assert.equal(u.vx,-heading);
  assert.equal(m.remaining.walker,-1);
  assert.equal(m.assignSkill('jumper',0),true);
  assert.equal(u.state,'jumping');
  for(let i=0;i<20&&!m.done;i++)m.tick();
  assert.equal(m.remaining.jumper,-1);
  m.reset();
  assert.equal(m.remaining.jumper,-1);
});
test('native Lix platformer paints flat terrain and advances horizontally', () => {
  const {level,images}=sample();
  level.skills={PLATFORMER:2};
  const m=new LixGameModel(level,images);
  m.togglePause();
  for(let i=0;i<13;i++)m.tick();
  const u=m.units[0],firstY=u.y,firstX=u.x;
  assert.equal(m.assignSkill('platformer',0),true);
  for(let i=0;i<9;i++)m.tick();
  assert.ok(u.x>firstX);
  assert.equal(u.y,firstY);
  assert.ok(m.events.some(e=>e.type==='platform'));
  assert.equal(m.remaining.platformer,1);
});
test('runner, climber and floater are permanent traits with finite inventory and long fall safety', () => {
  const {level,images}=sample();
  level.skills={RUNNER:1,CLIMBER:1,FLOATER:1};
  const m=new LixGameModel(level,images);
  m.togglePause();
  for(let i=0;i<13;i++)m.tick();
  const u=m.units[0];
  for(const skill of ['runner','climber','floater']){
    assert.equal(m.assignSkill(skill,0),true,skill);
    assert.equal(u[skill],true);
    assert.equal(m.remaining[skill],0);
  }
  const x=u.x;m.tick();assert.ok(u.x-x>=4);
  u.state='falling';u.fall=140;u.vy=8;u.y=205;
  m.tick();
  assert.equal(u.state,'walking');
  assert.equal(m.lost,0);
  m.reset();
  assert.equal(m.remaining.runner,1);
});
test('Climber scales a wall rather than turning around',()=>{
  const {level,images}=sample();
  level.skills={CLIMBER:1};
  level.tiles.push(item('wall','terrain',43,160));
  images.set('wall.png',tile(25,64));
  const m=new LixGameModel(level,images);
  m.togglePause();
  for(let i=0;i<13;i++)m.tick();
  const u=m.units[0];
  assert.equal(m.assignSkill('climber',0),true);
  for(let i=0;i<90&&!m.done;i++)m.tick();
  assert.ok(m.events.some(e=>e.type==='climbing'));
  assert.ok(m.events.some(e=>e.type==='climbed'));
});
