import test from 'node:test';
import assert from 'node:assert/strict';
import { isVisiblePixel, transformPoint, PixelTerrain, expandTiles, composeLixLevel } from '../src/lix/terrain.js';

test('magenta keyed pixels are transparent, alpha sprite pixels remain solid', () => {
  assert.equal(isVisiblePixel(255, 0, 255, 255), false);
  assert.equal(isVisiblePixel(200, 80, 240, 255), true);
  assert.equal(isVisiblePixel(21, 22, 32, 0), false);
});
test('Lix flip is applied before tile rotation', () => {
  const p = transformPoint(0, 0, 3, 2, 'fr');
  assert.deepEqual(p, { x: 0, y: 0, width: 2, height: 3 });
  const q = transformPoint(0, 0, 3, 2, 'rr');
  assert.deepEqual(q, { x: 2, y: 1, width: 3, height: 2 });
});
test('alpha pixels compose in order, dark removes and steel resists digging', () => {
  const t = new PixelTerrain(8, 8);
  const green = { width: 2, height: 2, data: new Uint8ClampedArray([
    0, 200, 0, 255, 255, 0, 255, 255,
    0, 200, 0, 255, 0, 200, 0, 255
  ]) };
  t.stamp({ image: 'green', x: 2, y: 2, flags: '' }, green);
  assert.equal(t.solid(2, 2), true);
  assert.equal(t.solid(3, 2), false);
  t.stamp({ image: 'green', x: 2, y: 2, flags: 'd' }, green);
  assert.equal(t.solid(2, 2), false);
  t.stamp({ image: 'green', x: 2, y: 2, flags: '' }, green, { steel: true });
  t.digRect(2, 2, 2, 2);
  assert.equal(t.solid(2, 2), true);
  t.paintRect(6, 6, 3, 3);
  assert.equal(t.solid(7, 7), true);
});
test('nested groups flatten to positioned world tiles', () => {
  const tiles = [{ image: 'Group-A', kind: 'group', x: 40, y: 50, flags: '' }];
  const groups = { A: [{ image: 'tile', kind: 'terrain', x: 2, y: 3, flags: '' }] };
  assert.deepEqual(expandTiles(tiles, groups), [{ image: 'tile', kind: 'terrain', x: 42, y: 53, flags: '' }]);
  assert.throws(() => expandTiles(tiles, { A: tiles }), /Recursive/);
});
test('terrain compositing excludes decorative goals from collision', () => {
  const level = { numeric: { SIZE_X: 8, SIZE_Y: 8 },
    tiles: [
      { image: 'tile', kind: 'terrain', x: 1, y: 1, flags: '' },
      { image: 'hatch', kind: 'hatch', x: 1, y: 1, flags: '' }
    ], groups: {} };
  const data = { width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 255]) };
  const images = new Map([['tile.png', { data }], ['hatch.png', { data, canvas: null }]]);
  const composed = composeLixLevel(level, images);
  assert.equal(composed.terrain.solid(1, 1), true);
  assert.equal(composed.gadgets.length, 1);
});
