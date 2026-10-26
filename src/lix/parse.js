// Lix text-level format parser. Upstream specification:
// https://github.com/SimonN/LixD/blob/master/doc/formats/level.txt
// Parsing is deliberately separate from physics: faithfully loading a level
// does not mean its mechanics are automatically playable.
const SIZE_LIMIT = 4_000_000;
const SKILLS = new Set(['WALKER','RUNNER','CLIMBER','FLOATER','EXPLODER',
  'EXPLODER2','BLOCKER','BUILDER','PLATFORMER','BASHER','MINER','DIGGER',
  'JUMPER','BATTER','CUBER']);
const KNOWN_NUMBERS = new Set(['SIZE_X','SIZE_Y','INITIAL','REQUIRED',
  'SPAWN_INTERVAL','TORUS_X','TORUS_Y','SECONDS']);
const VALID_IMAGE = /^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/;
const TILE_RE = /^:([^:]+):\s+(-?\d+)\s+(-?\d+)(?:\s+([a-z]+))?\s*$/;

function parseTile(line, lineNumber) {
  const hit = line.match(TILE_RE);
  if (!hit) throw new Error('Invalid Lix tile at line ' + lineNumber + ': ' + line);
  const [, image, xx, yy, modifiers = ''] = hit;
  if (!VALID_IMAGE.test(image) || image.includes('..') || image.startsWith('/'))
    throw new Error('Unsafe Lix tile path at line ' + lineNumber);
  if (!/^[dfrn]*$/.test(modifiers))
    throw new Error('Unsupported tile flags at line ' + lineNumber + ': ' + modifiers);
  const group = image.startsWith('Group-');
  let kind = 'terrain';
  if (group) kind = 'group';
  else if (/\.H$/i.test(image)) kind = 'hatch';
  else if (/\.G$/i.test(image)) kind = 'goal';
  else if (/\.[TFW]$/i.test(image)) kind = 'hazard';
  else if (/\.S$/i.test(image)) kind = 'steel';
  return { image, x: Number(xx), y: Number(yy), flags: modifiers, kind };
}
export function parseLix(source, { sourcePath = '' } = {}) {
  if (typeof source !== 'string' || source.length > SIZE_LIMIT)
    throw new Error('Invalid or oversized Lix source');
  const level = {
    sourcePath, title: '', author: '', built: '', hints: [], numeric: {},
    skills: {}, groups: {}, tiles: []
  };
  let currentGroup = null;
  source.split(/\r?\n/).forEach((raw, idx) => {
    const line = raw.trim();
    if (!line || line.startsWith('//') || line.startsWith(';')) return;
    if (line.startsWith('$BEGIN_TILE_GROUP ')) {
      const name = line.slice('$BEGIN_TILE_GROUP '.length).trim();
      if (!name || !VALID_IMAGE.test(name) || currentGroup !== null || level.groups[name])
        throw new Error('Invalid or duplicate group at line ' + (idx + 1));
      level.groups[name] = [];
      currentGroup = name;
      return;
    }
    if (line === '$END_TILE_GROUP') {
      if (currentGroup === null) throw new Error('Stray group terminator at line ' + (idx + 1));
      currentGroup = null;
      return;
    }
    if (line.startsWith(':')) {
      const tile = parseTile(line, idx + 1);
      (currentGroup === null ? level.tiles : level.groups[currentGroup]).push(tile);
      return;
    }
    if (line.startsWith('$')) {
      const hit = line.match(/^\$([A-Z_]+)\s+(.*)$/);
      if (!hit) throw new Error('Malformed property on line ' + (idx + 1));
      const [, key, value] = hit;
      if (key === 'AUTHOR') level.author = value;
      if (key === 'ENGLISH') level.title = value;
      if (key === 'BUILT') level.built = value;
      if (key === 'HINT_ENGLISH') level.hints.push(value);
      return;
    }
    if (line.startsWith('#')) {
      const hit = line.match(/^#([A-Z_0-9]+)\s+(-?\d+)\s*$/);
      // Unknown numeric keys are retained, never silently treated as skills.
      if (!hit) throw new Error('Malformed numeric property on line ' + (idx + 1));
      const [, key, value] = hit;
      const n = Number(value);
      if (!Number.isSafeInteger(n)) throw new Error('Unsafe integer at line ' + (idx + 1));
      if (SKILLS.has(key)) level.skills[key] = n;
      else level.numeric[key] = n;
      return;
    }
    throw new Error('Unrecognized Lix line ' + (idx + 1) + ': ' + line);
  });
  if (currentGroup !== null) throw new Error('Unterminated tile group: ' + currentGroup);
  for (const key of ['SIZE_X', 'SIZE_Y', 'INITIAL', 'REQUIRED']) {
    if (!Number.isInteger(level.numeric[key])) throw new Error('Missing #' + key);
  }
  if (level.numeric.SIZE_X < 1 || level.numeric.SIZE_Y < 1
    || level.numeric.INITIAL < 1 || level.numeric.REQUIRED < 1
    || level.numeric.REQUIRED > level.numeric.INITIAL)
    throw new Error('Invalid map dimensions or rescue requirement');
  if (!level.tiles.some(t => t.kind === 'hatch') || !level.tiles.some(t => t.kind === 'goal'))
    throw new Error('Level has no hatch or goal');
  const groups = new Set(Object.keys(level.groups));
  const used = [...level.tiles, ...Object.values(level.groups).flat()];
  for (const tile of used) if (tile.kind === 'group'
    && !groups.has(tile.image.slice('Group-'.length)))
    throw new Error('Undefined tile group: ' + tile.image);
  if (!level.title) throw new Error('Level has no English title');
  return level;
}
export function sourceAssets(level) {
  const all = [...level.tiles, ...Object.values(level.groups).flat()];
  return [...new Set(all.filter(t => t.kind !== 'group')
    .map(t => t.image + '.png'))].sort();
}
export function assessLixCompatibility(level) {
  // Prototype has only 4 skills, rectangle terrain and basic collisions.
  // This function intentionally rejects before falsely marking playable.
  const reasons = [];
  const extras = Object.entries(level.skills).filter(([skill, count]) =>
    !['BUILDER','BASHER','DIGGER','BLOCKER'].includes(skill) && count !== 0);
  if (extras.length) reasons.push('additional skills: ' + extras.map(([s]) => s).join(', '));
  if (Object.keys(level.groups).length) reasons.push('tile groups');
  if (level.tiles.some(t => t.kind === 'hazard')) reasons.push('hazards and trigger physics');
  if (level.tiles.some(t => t.kind === 'steel')) reasons.push('steel collisions');
  if (level.numeric.TORUS_X || level.numeric.TORUS_Y) reasons.push('toroidal map');
  if (level.tiles.some(t => /[dfrn]/.test(t.flags) && t.kind === 'terrain'))
    reasons.push('pixel-accurate terrain transformations');
  // ALL Lix terrain is bitmap-based, even levels with no flags!
  reasons.push('Lix sprite and pixel-terrain engine not installed');
  return { playable: false, reasons };
}
