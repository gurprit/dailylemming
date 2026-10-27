import test from 'node:test';
import assert from 'node:assert/strict';
import { keyBlackBackground } from '../src/lix/key-black.js';

test('black around a sprite is transparent, black eyes inside colour remain', () => {
  // Two frames, each 5 x 5, with the original 1-pixel magenta grid.
  const width = 13, height = 7;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([255,0,255,255], i);
  for (let col = 0; col < 2; col++) {
    const left = 1 + col * 6;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
      const i = ((y + 1) * width + left + x) * 4;
      data.set([0,0,0,255], i);
    }
    for (let y = 1; y < 4; y++) for (let x = 1; x < 4; x++) {
      const i = ((y + 1) * width + left + x) * 4;
      data.set([255,180,90,255], i);
    }
    const eye = ((2 + 1) * width + left + 2) * 4;
    data.set([0,0,0,255], eye);
  }
  const removed = keyBlackBackground({width,height,data},
    {grid:true,width:5,height:5,columns:2,rows:1});
  assert.equal(removed,32);
  assert.equal(data[((1)*width+1)*4+3],0,'exterior black masked');
  assert.equal(data[((3)*width+3)*4+3],255,'isolated black eye preserved');
  assert.equal(data[3],255,'outer magenta grid untouched');
});
