import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLix, sourceAssets, assessLixCompatibility } from '../src/lix/parse.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.join(root, 'content/lix/lovely');
const output = path.join(root, 'generated/lix');
export const UPSTREAM_REV = 'f1e805048fe439a4a0e9cc650c613713ababac8b';
export const UPSTREAM_PREFIX = 'https://raw.githubusercontent.com/SimonN/LixD/' + UPSTREAM_REV;

async function makeReport() {
  const order = (await readFile(path.join(input, '_order.X.txt'), 'utf8'))
    .split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 30);
  if (order.length !== 30 || new Set(order).size !== 30)
    throw new Error('Expected exactly 30 distinct levels from the Lovely pack');
  const report = [];
  for (let i = 0; i < order.length; i++) {
    const file = order[i];
    if (!/^[a-z0-9_-]+\.txt$/.test(file)) throw new Error('Unsafe level filename: ' + file);
    const sourcePath = 'levels/single/lemforum/Lovely/' + file;
    const raw = await readFile(path.join(input, file), 'utf8');
    const level = parseLix(raw, { sourcePath });
    const assets = sourceAssets(level);
    const compatibility = assessLixCompatibility(level);
    report.push({
      ordinal: i + 1,
      id: 'lix-lovely-' + file.slice(0, -4),
      title: level.title.trim(),
      author: level.author.trim(),
      source: 'https://github.com/SimonN/LixD/blob/' + UPSTREAM_REV + '/' + sourcePath,
      license: 'CC0-1.0',
      width: level.numeric.SIZE_X,
      height: level.numeric.SIZE_Y,
      initial: level.numeric.INITIAL,
      required: level.numeric.REQUIRED,
      skills: level.skills,
      assets,
      tileCount: level.tiles.length,
      groupCount: Object.keys(level.groups).length,
      compatibility
    });
  }
  const referencedAssets = [...new Set(report.flatMap(r => r.assets))].sort();
  const catalogue = {
    origin: 'Lix (https://github.com/SimonN/LixD)',
    upstreamRevision: UPSTREAM_REV,
    license: 'CC0-1.0',
    sourcePack: 'Lix singleplayer / lemforum / Lovely',
    classification: 'SOURCE_IMPORT_ONLY',
    warning: '30 level sources are preserved, not yet faithfully playable. NOT used in the daily rotation.',
    imported: report.length,
    candidateLevels: report,
    assetPaths: referencedAssets
  };
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, 'catalogue.json'), JSON.stringify(catalogue, null, 2) + '\n');
  const summary = [
    '# Lix source import audit',
    '',
    '30 verified level source files from the CC0 Lovely community pack.',
    'These are NOT playable daily levels until a pixel-terrain engine and all required skills are implemented and solved on mobile.',
    '',
    '| # | Level | Author | Skills | Assets | Tile placements |',
    '|---:|---|---|---:|---:|---:|',
    ...report.map(r => '| ' + r.ordinal + ' | ' + r.title.replace(/\|/g, '\\|')
      + ' | ' + r.author.replace(/\|/g, '\\|') + ' | '
      + Object.values(r.skills).filter(n => n !== 0).length + ' | ' + r.assets.length
      + ' | ' + r.tileCount + ' |'),
    '',
    'Unique image dependencies: ' + referencedAssets.length,
    'All compatibility flags: NOT READY',
    'Pinned source revision: ' + UPSTREAM_REV,
    ''
  ].join('\n');
  await writeFile(path.join(output, 'audit.md'), summary);
  console.log('Audited ' + report.length + ' imported Lix levels; '
    + referencedAssets.length + ' unique image files required.');
  return catalogue;
}
const catalogue = await makeReport();

// Optional: download CC0 image files to the local public folder.
// Not part of build/test: may be many MB; run explicitly when building the real engine.
if (process.argv.includes('--assets')) {
  const assets = catalogue.assetPaths;
  const destRoot = path.join(root, 'public/lix/images');
  const { access } = await import('node:fs/promises');
  let next = 0, completed = 0;
  const errors = [];
  async function worker() {
    while (next < assets.length) {
      const rel = assets[next++];
      const dest = path.join(destRoot, rel);
      if (!dest.startsWith(destRoot + path.sep)) throw new Error('Path traversal');
      try {
        try { await access(dest); completed++; continue; } catch {}
        const response = await fetch(UPSTREAM_PREFIX + '/images/' + rel, {
          signal: AbortSignal.timeout(20000)
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.length > 5_000_000) throw new Error('Asset too large');
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, bytes);
        completed++;
      } catch (error) {
        errors.push(rel + ': ' + String(error));
      }
    }
  }
  await Promise.all(Array.from({ length: 6 }, () => worker()));
  console.log('Downloaded/cached ' + completed + '/' + assets.length + ' assets');
  if (errors.length) { console.error(errors.slice(0, 25).join('\n')); process.exitCode = 1; }
}
