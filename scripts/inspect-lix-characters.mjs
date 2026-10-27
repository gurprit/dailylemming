// Inspect the actual Lix Cutbit character atlas, not made-up frame counts.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PNG } from 'pngjs';
import { detectLixFrames, cutLixFrame } from '../src/lix/frames.js';
import { frameIsPresent, inspectCharacterAtlas } from '../src/lix/characters.js';
import { keyBlackBackground } from '../src/lix/key-black.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asset = path.join(root, 'public/lix/characters/lixsprites.png');
const raw = PNG.sync.read(await readFile(asset));
const verifiedAtlas = inspectCharacterAtlas(raw);
const layout = verifiedAtlas.layout;
const keyed = keyBlackBackground({ width: raw.width, height: raw.height,
  data: raw.data.slice() }, layout);
console.log('Original Lix atlas exterior black pixels made transparent: ' + keyed);
if (keyed < 50) throw new Error('Expected opaque black character backgrounds in original atlas');
const activityNames = [
  'nothing','faller','tumbler','stunner','lander','splatter',
  'burner','drowner','exiter','walker','runner','climber',
  'ascender','floater','imploder','exploder','blocker',
  'builder','shrugger','platformer','shrugger2',
  'basher','miner','digger','jumper','batter','cuber'
];
const rows = [];
for (let row = 0; row < layout.rows; row++) {
  const frames = [];
  for (let col = 0; col < layout.columns; col++) {
    const frame = cutLixFrame(raw, layout, row * layout.columns + col);
    let visiblePixels = 0;
    // Lix treats a frame as absent when its first interior pixel is filled
    // with the same grid colour; alpha presence is a conservative fallback.
    for (let i = 3; i < frame.data.length; i += 4)
      if (frame.data[i] >= 96) visiblePixels++;
    frames.push({ index: col, visiblePixels, present: frameIsPresent(raw,layout,col,row) });
  }
  rows.push({
    row, activity: activityNames[row] || 'unknown',
    framesWithPixels: frames.filter(f => f.present).length,
    nonemptyFrames: frames.filter(f => f.visiblePixels > 0).map(f => f.index),
    counts: frames.map(f => f.visiblePixels)
  });
}
const report = { playableActivityNames: [...verifiedAtlas.rows.keys()], upstream: 'SimonN/LixD', sheet: 'data/images/lixsprites.png',
  layout, width: raw.width, height: raw.height, rows };
console.log('Lix animation atlas geometry: ' + JSON.stringify({
  width: raw.width, height: raw.height, layout,
  samples: rows.filter(r=>['walker','faller','builder','blocker','basher','digger','miner','exiter'].includes(r.activity))
}));
await mkdir(path.join(root, 'generated/lix'), { recursive: true });
await writeFile(path.join(root, 'generated/lix/character-atlas.json'),
  JSON.stringify(report, null, 2) + '\n');
if (!layout.grid || layout.rows < 24 || layout.columns < 8)
  throw new Error('Official Lix sprite grid not detected; inspect frame format');
for (const activity of ['walker','faller','builder','blocker','basher','digger','miner','exiter']) {
  const row = rows.find(x => x.activity === activity);
  if (!row || row.framesWithPixels < 2)
    throw new Error('Missing original Lix frames for ' + activity);
}
