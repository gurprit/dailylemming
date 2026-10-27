import test from 'node:test';
import assert from 'node:assert/strict';
import { detectLixFrames, cutLixFrame } from '../src/lix/frames.js';

function spriteSheet() {
  // Two 3x2 frames, framed by 1px magenta grid like Lix's Cutbit tiles.
  const width = 9, height = 4;
  const d = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < d.length; i += 4) d.set([255, 0, 255, 255], i);
  for (let y = 1; y <= 2; y++) for (let x = 1; x <= 3; x++)
    d.set([10, 200, 10, 255], (y * width + x) * 4);
  for (let y = 1; y <= 2; y++) for (let x = 5; x <= 7; x++)
    d.set([200, 80, 10, 255], (y * width + x) * 4);
  return { width, height, data: d };
}
test('Cutbit frame-grid detection distinguishes animation sheet from one image', () => {
  const source = spriteSheet();
  assert.deepEqual(detectLixFrames(source), {
    width: 3, height: 2, columns: 2, rows: 1, grid: true
  });
  const a = cutLixFrame(source, detectLixFrames(source), 0);
  const b = cutLixFrame(source, detectLixFrames(source), 1);
  assert.equal(a.width, 3);
  assert.equal(a.height, 2);
  assert.deepEqual([...a.data.slice(0, 4)], [10, 200, 10, 255]);
  assert.deepEqual([...b.data.slice(0, 4)], [200, 80, 10, 255]);
  assert.throws(() => cutLixFrame(source, detectLixFrames(source), 2), /Invalid spritesheet/);
});
test('ordinary level terrain remains a single uncropped image', () => {
  const source = { width: 4, height: 3,
    data: new Uint8ClampedArray(4 * 3 * 4).fill(140) };
  assert.deepEqual(detectLixFrames(source), {
    width: 4, height: 3, columns: 1, rows: 1, grid: false
  });
  const cropped = cutLixFrame(source, detectLixFrames(source));
  assert.equal(cropped.width, 4);
  assert.equal(cropped.height, 3);
});
test('crop converts magenta key pixels to transparent', () => {
  const source = { width: 2, height: 1,
    data: new Uint8ClampedArray([255,0,255,255, 30,40,50,255]) };
  const frame = cutLixFrame(source, detectLixFrames(source));
  assert.equal(frame.data[3], 0);
  assert.equal(frame.data[7], 255);
});
