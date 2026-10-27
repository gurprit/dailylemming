// Optional deterministic route search for the first real Lix level.
// Search is for THIS adapter's physics; it is not a proof of original Lix
// replay compatibility. Run after npm run lix:vendor:first.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { parseLix, sourceAssets } from '../src/lix/parse.js';
import { detectLixFrames, cutLixFrame } from '../src/lix/frames.js';
import { LixGameModel } from '../src/lix/game.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const level = parseLix(await readFile(path.join(root, 'content/lix/lovely/6gaps.txt'), 'utf8'));
const assets = new Map();
for (const name of sourceAssets(level)) {
  const raw = PNG.sync.read(await readFile(path.join(root, 'public/lix/images', name)));
  const layout = detectLixFrames(raw);
  const frames = Array.from({ length: layout.columns * layout.rows }, (_, i) => {
    const data = cutLixFrame(raw, layout, i);
    return { data, canvas: { width: data.width, height: data.height } };
  });
  assets.set(name, { ...frames[0], frames, layout });
}

function cloneModel(m) {
  return Object.assign(Object.create(LixGameModel.prototype), m, {
    units: m.units.map(u => ({ ...u })),
    remaining: { ...m.remaining },
    terrain: Object.assign(Object.create(Object.getPrototypeOf(m.terrain)), m.terrain, {
      pixels: m.terrain.pixels.slice(),
      steel: m.terrain.steel.slice()
    }),
    events: []
  });
}
const initial = new LixGameModel(level, assets);
initial.togglePause();
for (let n = 0; n < 80; n++) {
  initial.tick();
  if (initial.units[0]?.state === 'walking' && initial.units[0].grounded) break;
}
if (initial.units[0]?.state !== 'walking' || !initial.units[0].grounded)
  throw new Error('Could not establish a standing start for route search');

let beam = [{ model: initial, actions: [] }];
let explored = 0, bestX = 0, success = null;
const layers = [];
for (let depth = 0; depth < 5 && beam.length && !success; depth++) {
  const candidates = [];
  for (const node of beam) {
    for (let wait = 0; wait <= 38; wait += 2) {
      const m = cloneModel(node.model);
      for (let t = 0; t < wait && !m.done; t++) m.tick();
      const u = m.units[0];
      if (m.done || !u || u.state !== 'walking' || !u.grounded || u.vx < 0)
        continue;
      if (!m.assignBuilder(0)) continue;
      explored++;
      const action = { tick: m.ticks, x: Math.round(u.x), y: Math.round(u.y) };
      // Finish the builder, then wait for her to stand on land again.
      for (let t = 0; t < 250 && !m.done; t++) {
        m.tick();
        const unit = m.units[0];
        if (unit.state === 'walking' && unit.grounded && t > 16) break;
      }
      const position = m.units[0]?.x ?? 0;
      bestX = Math.max(bestX, position);
      const actions = [...node.actions, action];
      if (m.won) { success = { actions, ticks: m.ticks, saved: m.saved }; break; }
      if (!m.done && m.units[0]?.state === 'walking'
          && m.units[0]?.grounded && m.units[0].vx > 0)
        candidates.push({ model: m, actions });
    }
    if (success) break;
  }
  const deduped = new Map();
  for (const c of candidates) {
    const u = c.model.units[0];
    const key = Math.round(u.x / 3) + ':' + Math.round(u.y / 4);
    const current = deduped.get(key);
    if (!current || c.model.ticks < current.model.ticks)
      deduped.set(key, c);
  }
  beam = [...deduped.values()].sort((a, b) =>
    b.model.units[0].x - a.model.units[0].x || a.model.ticks - b.model.ticks).slice(0, 24);
  layers.push({ builders: depth + 1, candidates: candidates.length,
    retained: beam.length, farthestX: beam[0]?.model.units[0].x ?? 0 });
}
const report = { level: level.title, explored, bestX, layers, solved: !!success,
  solution: success, note: 'Heuristic adapter search, not original Lix verification' };
await mkdir(path.join(root, 'generated/lix'), { recursive: true });
await writeFile(path.join(root, 'generated/lix/route-search.json'), JSON.stringify(report, null, 2) + '\n');
console.log('Lix candidate solution search: ' + JSON.stringify(report));
