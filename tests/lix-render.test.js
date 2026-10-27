import test from 'node:test';
import assert from 'node:assert/strict';
import { gadgetDrawable } from '../src/lix/render.js';

test('composited Lix gadget frames are canvases directly, not frame records', () => {
  const canvas1 = { width: 12, height: 18 };
  const canvas2 = { width: 12, height: 18 };
  const gadget = { image: canvas1, frames: [canvas1, canvas2], sourceImage: 'matt/water.W' };
  assert.equal(gadgetDrawable(gadget, 0), canvas1);
  assert.equal(gadgetDrawable(gadget, 5), canvas2);
  assert.equal(gadgetDrawable(gadget, 10), canvas1);
});

test('decoder record and static image are both drawable', () => {
  const canvas = { width: 12, height: 18 };
  assert.equal(gadgetDrawable({ frames: [{ canvas }] }, 0), canvas);
  assert.equal(gadgetDrawable({ image: canvas }, 0), canvas);
  assert.throws(() => gadgetDrawable({ sourceImage: 'missing.W' }), /Missing drawable/);
});
