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

// The friendly default must have a deterministic real-assets winning route.
// This deliberately tests the exact level PNGs and game physics shipped to players.
const friendly = parseLix(await readFile(path.join(root, 'content/original/little-bridge.txt'), 'utf8'));
const friendlyAssets = sourceAssets(friendly);
for (const asset of friendlyAssets)
  if (!assets.has(asset)) throw new Error('Tutorial asset missing from local vendor pack: ' + asset);
const attempted = [];
let solution = null;
const wins = [];
for (let builderX = 132; builderX <= 184; builderX += 2) {
  const attempt = new LixGameModel(friendly, assets);
  attempt.togglePause();
  let assigned = false;
  for (let t = 0; t < 1500 && !attempt.done; t++) {
    const walker = attempt.units[0];
    if (!assigned && walker?.state === 'walking' && walker.grounded
        && walker.vx > 0 && walker.x >= builderX) {
      assigned = attempt.assignBuilder(0);
    }
    attempt.tick();
  }
  const result = attempt.snapshot();
  attempted.push({ builderX, assigned, result });
  if (result.won) {
    const proof = { builderX, result, finalX: attempt.units[0]?.x,
      events: attempt.events.filter(e => ['assigned', 'brick', 'landed', 'saved'].includes(e.type)) };
    if (!solution) solution = proof;
    wins.push(builderX);
  }
}
await writeFile(path.join(root, 'generated/lix/little-bridge-proof.json'),
  JSON.stringify({ level: friendly.title, solution, winningBuilderX: wins, attempted }, null, 2) + '\n');
console.log('Friendly tutorial real-assets win check: ' + JSON.stringify({
  tested: attempted.length, winningBuilderX: wins, won: !!solution, solution: solution && {
    builderX: solution.builderX, saved: solution.result.saved,
    skills: solution.result.used, seconds: solution.result.seconds
  }
}));
if (!solution || solution.result.used > 2)
  throw new Error('Friendly puzzle has no verified one-builder rescue with real assets');
