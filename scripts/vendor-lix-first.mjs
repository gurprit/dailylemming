// Cache artwork for the playable puzzles and original Lix tutorial imports.
// Run before build for a self-contained deploy, or locally for offline repeat play.
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLix, sourceAssets } from '../src/lix/parse.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Ship the artwork used by the tutorial and the two optional, experimental
// community stages; avoid downloading all 30 community puzzle packs.
const levelFiles = [
  'content/lix/lovely/6gaps.txt',
  'content/original/little-bridge.txt',
  'content/original/double-trouble.txt',
  'content/original/tunnel-time.txt',
  'content/original/dig-for-freedom.txt',
  'content/original/secret-passage.txt',
  'content/original/turnaround.txt',
  'content/original/bridge-brigade.txt',
  'content/lix/lovely/pitfall.txt',
  'content/lix/lovely/buildingblock.txt',
  'content/lix/lovely/pipedream.txt',
  'content/lix/lovely/beneaththelab.txt',
  'content/lix/lovely/climbtofreedom.txt',
  'content/lix/lovely/everylix.txt',
  'content/lix/lovely/escapethepit.txt',
  'content/lix/lovely/putyourlix.txt',
  'content/lix/lovely/solareclipse.txt',
  'content/lix/lovely/alternative.txt',
  'content/lix/lovely/anecklaceofraindrops.txt',
  'content/lix/tutorial/builders.txt',
  'content/lix/tutorial/bashers.txt',
  'content/lix/tutorial/diggers.txt',
  'content/lix/tutorial/miners.txt',
  'content/lix/tutorial/blockers.txt',
  'content/lix/tutorial/platformers.txt',
  'content/lix/tutorial/jumpers.txt',
  'content/lix/tutorial/runners.txt',
  'content/lix/tutorial/walkers-turn.txt',
  'content/lix/tutorial/climbers-floaters.txt'
];
const levels = await Promise.all(levelFiles.map(async file =>
  parseLix(await readFile(path.join(root, file), 'utf8'))));
const source = 'https://raw.githubusercontent.com/SimonN/LixD/f1e805048fe439a4a0e9cc650c613713ababac8b/images/';
const dir = path.join(root, 'public/lix/images');
const names = [...new Set(levels.flatMap(sourceAssets))].sort();
let index = 0, fetched = 0, existed = 0;
const errors = [];

async function worker() {
  while (index < names.length) {
    const name = names[index++];
    if (!/^[\w./-]+$/.test(name) || name.includes('..') || name.startsWith('/')) {
      errors.push('Invalid image path: ' + name); continue;
    }
    const dest = path.join(dir, name);
    try {
      try { await access(dest); existed++; continue; } catch {}
      let bytes;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(source + name.split('/').map(encodeURIComponent).join('/'), {
            signal: AbortSignal.timeout(20000)
          });
          if (!response.ok) throw new Error('HTTP ' + response.status);
          bytes = Buffer.from(await response.arrayBuffer());
          break;
        } catch (error) {
          if (attempt === 2) throw error;
        }
      }
      if (bytes.length < 24 || bytes.length > 3_000_000
        || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
        throw new Error('Invalid PNG data');
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, bytes);
      fetched++;
    } catch (error) { errors.push(name + ': ' + error.message); }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log('Lix tutorial and selected community levels: ' + names.length + ' PNG assets, '
  + fetched + ' downloaded, ' + existed + ' cached, ' + errors.length + ' errors.');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
}


// Lix's official animated character atlas is separate from terrain sprites.
const charactersFile = path.join(root, 'public/lix/characters/lixsprites.png');
try {
  let present = false;
  try {
    await access(charactersFile);
    const { stat } = await import('node:fs/promises');
    present = (await stat(charactersFile)).size > 3000;
  } catch {}
  if (!present) {
    const charUrl = 'https://raw.githubusercontent.com/SimonN/LixD/'
      + 'f1e805048fe439a4a0e9cc650c613713ababac8b/data/images/lixsprites.png';
    const response = await fetch(charUrl, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 3000 || bytes.length > 2_000_000
        || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a')
      throw new Error('Unexpected Lix character PNG');
    await mkdir(path.dirname(charactersFile), { recursive: true });
    await writeFile(charactersFile, bytes);
    console.log('Vendored CC0 Lix character atlas (' + bytes.length + ' bytes).');
  } else {
    console.log('Lix character atlas already cached.');
  }
} catch (error) {
  console.error('Lix character atlas download failed: ' + error.message);
  process.exitCode = 1;
}
