import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { parseLix, sourceAssets, assessLixCompatibility } from '../src/lix/parse.js';

const sourceDir = new URL('../content/lix/lovely/', import.meta.url);
const fetchLevel = async filename => readFile(new URL(filename, sourceDir), 'utf8');

test('all 30 upstream CC0 source files are available and parsable', async () => {
  const order = (await fetchLevel('_order.X.txt')).split(/\r?\n/).map(x => x.trim()).filter(Boolean).slice(0, 30);
  assert.equal(order.length, 30);
  const files = (await readdir(sourceDir)).filter(f => f.endsWith('.txt') && f !== '_order.X.txt');
  assert.equal(files.length, 30);
  for (const name of order) {
    const level = parseLix(await fetchLevel(name), { sourcePath: name });
    assert.ok(level.title.trim(), name + ': title');
    assert.ok(level.author.trim(), name + ': author');
    assert.ok(level.numeric.INITIAL >= level.numeric.REQUIRED, name + ': rescue count');
    assert.ok(level.tiles.length, name + ': tiles');
    assert.ok(sourceAssets(level).length, name + ': assets');
    assert.equal(assessLixCompatibility(level).playable, false,
      name + ': not allowed into the daily rotation before gameplay verification');
  }
});
test('pipedream preserves its exact upstream author, skills, terrain and objective', async () => {
  const level = parseLix(await fetchLevel('pipedream.txt'));
  assert.equal(level.title, 'Pipe Dream');
  assert.ok(level.author);
  assert.equal(level.numeric.SIZE_X, 1536);
  assert.ok(level.skills.BUILDER > 0);
  assert.ok(level.skills.BASHER > 0);
  assert.ok(level.tiles.filter(t => t.kind === 'hatch').length > 0);
  assert.ok(level.tiles.filter(t => t.kind === 'goal').length > 0);
});
test('tile groups retain their composition and detect unknown references', () => {
  const raw = '$AUTHOR Test\n$ENGLISH Groups\n#SIZE_X 120\n#SIZE_Y 100\n#INITIAL 2\n#REQUIRED 1\n'
    + ':matt/Hatch.H: 0 4\n:matt/Goal.G: 70 0\n'
    + '$BEGIN_TILE_GROUP abc\n:matt/bricks/01: 1 2 frr\n$END_TILE_GROUP\n:Group-abc: 5 6\n';
  const level = parseLix(raw);
  assert.equal(level.groups.abc[0].flags, 'frr');
  assert.equal(level.tiles.at(-1).kind, 'group');
  assert.deepEqual(sourceAssets(level), ['matt/Goal.G.png', 'matt/Hatch.H.png', 'matt/bricks/01.png']);
  assert.throws(() => parseLix(raw.replace('Group-abc: 5', 'Group-missing: 5')), /Undefined tile group/);
});
test('malformed, unsafe, and incomplete sources fail closed', () => {
  const base = '$AUTHOR Test\n$ENGLISH Safe\n#SIZE_X 120\n#SIZE_Y 100\n#INITIAL 2\n#REQUIRED 1\n'
    + ':matt/Hatch.H: 0 4\n:matt/Goal.G: 70 0\n';
  assert.throws(() => parseLix(base + ':../secret: 0 0\n'), /Unsafe Lix tile path/);
  assert.throws(() => parseLix(base.replace('#REQUIRED 1', '#REQUIRED 3')), /Invalid map dimensions/);
  assert.throws(() => parseLix(base + '$END_TILE_GROUP\n'), /Stray group terminator/);
  assert.throws(() => parseLix(base.replace(':matt/Goal.G: 70 0', '')), /no hatch or goal/);
  assert.throws(() => parseLix('x'.repeat(4_000_001)), /oversized/);
});
