// Real-assets smoke test. Uses the exact CC0 sprites imported for 6 Gaps.
// No mocking of terrain, hatch frame dimensions, or water masks.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { parseLix, sourceAssets } from '../src/lix/parse.js';
import { detectLixFrames, cutLixFrame } from '../src/lix/frames.js';
import { LixGameModel, PHYSICS_HZ } from '../src/lix/game.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const levelPath = path.join(root, 'content/lix/lovely/6gaps.txt');
const level = parseLix(await readFile(levelPath, 'utf8'));
const assets = new Map();
for (const imagePath of sourceAssets(level)) {
  const fullPath = path.join(root, 'public/lix/images', imagePath);
  const raw = PNG.sync.read(await readFile(fullPath));
  const layout = detectLixFrames(raw);
  const frames = Array.from({ length: layout.columns * layout.rows }, (_, i) => {
    const frame = cutLixFrame(raw, layout, i);
    return { data: frame, canvas: { width: frame.width, height: frame.height } };
  });
  assets.set(imagePath, { ...frames[0], frames, layout });
}

const model = new LixGameModel(level, assets);
if (!model.terrain.solid(50, 245))
  throw new Error('The real sandstone floor is absent from pixel collisions');
if (model.terrain.solid(120, 210))
  throw new Error('Open air is unexpectedly solid');
if (model.hatches[0].imageData.width >= 100)
  throw new Error('Hatch atlas was not correctly split into frames');

model.togglePause();
let firstLanding = null;
let final;
const trail = [];
for (let i = 0; i < 1800 && !model.done; i++) {
  model.tick();
  const u = model.units[0];
  if (!u) continue;
  if (!firstLanding && model.events.some(e => e.type === 'landed')) {
    firstLanding = { x: u.x, y: u.y, tick: model.ticks };
  }
  if (i % PHYSICS_HZ === 0) trail.push({
    second: model.seconds,
    x: Math.round(u.x), y: Math.round(u.y), state: u.state
  });
}
final = model.snapshot();
const report = {
  level: level.title,
  author: level.author,
  sourceAssets: assets.size,
  hatchFrame: {
    width: model.hatches[0].imageData.width,
    height: model.hatches[0].imageData.height
  },
  firstLanding,
  withoutSkills: final,
  events: model.events,
  trail
};
await mkdir(path.join(root, 'generated/lix'), { recursive: true });
await writeFile(path.join(root, 'generated/lix/first-level-simulation.json'),
  JSON.stringify(report, null, 2) + '\n');
console.log('Lix real-level smoke check:', JSON.stringify({
  sourceAssets: report.sourceAssets, hatchFrame: report.hatchFrame,
  firstLanding: report.firstLanding,
  afterNoSkills: final
}));
if (!firstLanding)
  throw new Error('Lemming never landed on the actual imported level terrain');
if (!final.done || final.spawned !== 1)
  throw new Error('Actual Lix level did not complete a no-skill simulation');
if (final.won)
  throw new Error('Level can be completed without assigning any builders');
console.log('PASS: real PNG terrain, hatch frame, foot collision, movement and death');
