import test from 'node:test';
import assert from 'node:assert/strict';
import { PixelTerrain } from '../src/lix/terrain.js';
import { projectBuilder } from '../src/lix/preview.js';

test('builder planner projects twelve 2px rising bricks into empty space', () => {
  const terrain = new PixelTerrain(200, 200);
  const preview = projectBuilder(terrain, {x:30,y:100,vx:1,state:'walking'});
  assert.equal(preview.bricks.length, 12);
  assert.equal(preview.bricks[0].y, 102);
  assert.equal(preview.bricks[11].y, 80);
  assert.equal(preview.blocked, null);
});
test('planner warns about an overhead obstacle and shows material', () => {
  const terrain = new PixelTerrain(200, 200);
  terrain.paintRect(54, 74, 10, 2);
  const prev = projectBuilder(terrain, {x:30,y:100,vx:1,state:'walking'});
  assert.ok(prev.blocked);
  assert.equal(prev.blocked.steel, false);
  assert.ok(prev.bricks.length < 12);
  const index = terrain.index(prev.blocked.x, prev.blocked.y);
  terrain.steel[index] = 1;
  assert.equal(projectBuilder(terrain, {x:30,y:100,vx:1,state:'walking'}).blocked.steel, true);
});
test('preview does not offer a staircase to an airborne creature', () => {
  assert.equal(projectBuilder(new PixelTerrain(80,80), {x:10,y:10,vx:1,state:'falling'}),null);
});
