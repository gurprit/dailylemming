// Cache only the assets used by the first experimental playable Lix level.
// Run before build for a self-contained deploy, or locally for offline repeat play.
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLix, sourceAssets } from '../src/lix/parse.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const level = parseLix(await readFile(path.join(root, 'content/lix/lovely/6gaps.txt'), 'utf8'));
const source = 'https://raw.githubusercontent.com/SimonN/LixD/f1e805048fe439a4a0e9cc650c613713ababac8b/images/';
const dir = path.join(root, 'public/lix/images');
const names = sourceAssets(level);
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
console.log('Lix experimental level: ' + names.length + ' PNG assets, '
  + fetched + ' downloaded, ' + existed + ' cached, ' + errors.length + ' errors.');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
}
