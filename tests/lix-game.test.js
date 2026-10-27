import test from 'node:test';
import assert from 'node:assert/strict';
import { LixGameModel } from '../src/lix/game.js';

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
  assert.equal(game.assignBuilder(0), false);
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
