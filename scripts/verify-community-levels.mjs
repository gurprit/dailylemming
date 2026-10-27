// Validate actual CC0 community assets as experimental imports, not proofs
// that their complete original skill sets or solutions work in the adapter.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { parseLix, sourceAssets } from '../src/lix/parse.js';
import { detectLixFrames, cutLixFrame } from '../src/lix/frames.js';
import { LixGameModel } from '../src/lix/game.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['pitfall.txt', 'buildingblock.txt'];
for (const file of files) {
  const content = await readFile(path.join(root, 'content/lix/lovely', file), 'utf8');
  const level = parseLix(content);
  const sprites = new Map();
  for (const asset of sourceAssets(level)) {
    const png = PNG.sync.read(await readFile(path.join(root, 'public/lix/images', asset)));
    const layout = detectLixFrames(png);
    const frame = cutLixFrame(png, layout);
    const canvas = { width: frame.width, height: frame.height };
    sprites.set(asset, { data: frame, canvas, frames: [{data:frame,canvas}] });
  }
  const model = new LixGameModel(level, sprites);
  const pixels = model.terrain.pixels;
  const visible = pixels.filter((x,i) => i % 4 === 3 && x >= 96).length;
  if (model.hatches.length !== 1 || !model.goals.length || visible < 200)
    throw new Error(file + ': incomplete map or gadget decoding');
  model.togglePause();
  for (let i = 0; i < 80 && !model.done; i++) model.tick();
  if (!model.spawned || !model.units.length)
    throw new Error(file + ': imported creature did not spawn');
  console.log('Original community level loaded (NOT solution-verified):',
    JSON.stringify({ name: level.title, author: level.author,
      tiles: level.tiles.length, images: sprites.size, opaqueTerrainPixels: visible,
      spawned: model.spawned, activeSkills: Object.keys(level.skills) }));
}
