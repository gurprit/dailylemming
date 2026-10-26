import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { LEVELS } from '../src/levels.js';

test('a new daily rescue starts in planning mode without ticking or recording failure', () => {
  const oldRAF = globalThis.requestAnimationFrame;
  const oldCancel = globalThis.cancelAnimationFrame;
  let failures = 0;
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  try {
    const canvas = {
      getContext: () => ({}),
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    let lastState;
    const game = new Game(canvas, LEVELS[0], {
      update: state => { lastState = state; },
      finish: () => { failures++; }
    });
    game.draw = () => {};
    assert.equal(game.started, false);
    assert.equal(game.paused, true);
    assert.equal(lastState.started, false);
    game.frame(1000);
    game.frame(1100);
    game.frame(1600);
    assert.equal(game.ticks, 0);
    assert.equal(game.spawned, 0);
    assert.equal(failures, 0);

    game.togglePause();
    assert.equal(game.started, true);
    assert.equal(game.paused, false);
    game.frame(1640);
    assert.ok(game.ticks > 0);
    game.togglePause();
    const frozenTicks = game.ticks;
    game.frame(2000);
    assert.equal(game.ticks, frozenTicks);

    game.reset();
    assert.equal(game.started, false);
    assert.equal(game.paused, true);
    assert.equal(game.ticks, 0);
    game.stop();
  } finally {
    globalThis.requestAnimationFrame = oldRAF;
    globalThis.cancelAnimationFrame = oldCancel;
  }
});
