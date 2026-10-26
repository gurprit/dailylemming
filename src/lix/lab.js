import { parseLix, sourceAssets, assessLixCompatibility } from './parse.js';
import orderText from '../../content/lix/lovely/_order.X.txt?raw';

const sources = import.meta.glob('../../content/lix/lovely/*.txt', {
  query: '?raw',
  import: 'default'
});
const upstream = 'f1e805048fe439a4a0e9cc650c613713ababac8b';
const assetPrefix = 'https://raw.githubusercontent.com/SimonN/LixD/' + upstream + '/images/';
const paths = new Map(Object.entries(sources).map(([key, loader]) => [key.split('/').pop(), loader]));
const names = orderText.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 30);
const chooser = document.querySelector('#chooser');
const zoom = document.querySelector('#zoom');
const canvas = document.querySelector('#map');
const status = document.querySelector('#status');
const imageCache = new Map();
let active = 0;

function asset(name) {
  if (!imageCache.has(name)) imageCache.set(name, new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Cannot load ' + name));
    img.src = assetPrefix + name.split('/').map(encodeURIComponent).join('/');
  }));
  return imageCache.get(name);
}
async function preload(level) {
  const out = new Map(), files = sourceAssets(level);
  let failed = 0, position = 0;
  async function worker() {
    while (position < files.length) {
      const file = files[position++];
      try { out.set(file, await asset(file)); } catch { failed++; }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  return { out, failed };
}
function paint(ctx, tile, images, xOffset = 0, yOffset = 0) {
  const image = images.get(tile.image + '.png');
  if (!image) return;
  const x = tile.x + xOffset, y = tile.y + yOffset;
  const rotations = (tile.flags.match(/r/g) || []).length % 4;
  ctx.save();
  if (tile.flags.includes('d')) ctx.globalCompositeOperation = 'destination-out';
  else if (tile.flags.includes('n')) ctx.globalCompositeOperation = 'destination-over';
  ctx.translate(x, y);
  // Lix applies vertical mirroring before clockwise quarter turns.
  // This is an *approximate preview* placement, not certified collision geometry.
  if (rotations === 1) { ctx.translate(image.height, 0); ctx.rotate(Math.PI / 2); }
  if (rotations === 2) { ctx.translate(image.width, image.height); ctx.rotate(Math.PI); }
  if (rotations === 3) { ctx.translate(0, image.width); ctx.rotate(3 * Math.PI / 2); }
  if (tile.flags.includes('f')) {
    ctx.translate(0, image.height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}
function paintItems(ctx, items, level, images, groupStack = [], x = 0, y = 0) {
  for (const tile of items) {
    if (tile.kind !== 'group') { paint(ctx, tile, images, x, y); continue; }
    const key = tile.image.slice(6);
    if (groupStack.includes(key) || groupStack.length > 6) continue;
    const sub = level.groups[key];
    if (sub) paintItems(ctx, sub, level, images, [...groupStack, key], x + tile.x, y + tile.y);
    // Group-level flips/rotations aren't applied in this diagnostic view.
  }
}
function render(level, images) {
  const width = level.numeric.SIZE_X, height = level.numeric.SIZE_Y;
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a2742'; ctx.fillRect(0, 0, width, height);
  const terrain = document.createElement('canvas');
  terrain.width = width; terrain.height = height;
  const tc = terrain.getContext('2d');
  paintItems(tc, level.tiles.filter(t => ['terrain','steel','group'].includes(t.kind)), level, images);
  ctx.drawImage(terrain, 0, 0);
  // Gadgets drawn last; their animated frames and trigger geometry aren't simulated.
  paintItems(ctx, level.tiles.filter(t => ['hatch','goal','hazard'].includes(t.kind)), level, images);
}
function scaleCanvas() {
  const n = Number(zoom.value) / 100;
  canvas.style.width = Math.round(canvas.width * n) + 'px';
  canvas.style.height = Math.round(canvas.height * n) + 'px';
  document.querySelector('#zoom-value').textContent = zoom.value + '%';
}
function showDetails(level, name) {
  document.querySelector('#title').textContent = level.title;
  const meta = document.querySelector('#metadata');
  meta.replaceChildren();
  const data = [ 'By ' + (level.author || 'unknown'),
    level.numeric.SIZE_X + ' × ' + level.numeric.SIZE_Y + ' px',
    'Rescue ' + level.numeric.REQUIRED + '/' + level.numeric.INITIAL,
    level.tiles.length + ' placements'];
  for (const item of data) {
    const span = document.createElement('span'); span.textContent = item;
    meta.append(span);
  }
  const skills = Object.entries(level.skills).filter(([, n]) => n !== 0)
    .map(([skill, n]) => skill.toLowerCase() + ' ' + (n < 0 ? '∞' : n)).join(', ');
  const blockers = assessLixCompatibility(level).reasons;
  document.querySelector('#flags').textContent = 'Skills: ' + (skills || 'none')
    + '. Compatibility blockers: ' + blockers.join('; ') + '.';
  document.querySelector('#original').href =
    'https://github.com/SimonN/LixD/blob/' + upstream
    + '/levels/single/lemforum/Lovely/' + name;
}
async function pick() {
  const seq = ++active, filename = chooser.value;
  status.textContent = 'Loading CC0 terrain artwork…';
  try {
    const text = await paths.get(filename)();
    const level = parseLix(text, { sourcePath: filename });
    const { out, failed } = await preload(level);
    if (seq !== active) return;
    render(level, out);
    showDetails(level, filename);
    scaleCanvas();
    status.textContent = 'Loaded ' + out.size + ' image types.'
      + (failed ? ' ' + failed + ' images unavailable; preview is incomplete.' : '')
      + ' This is only an approximate visual preview, not a game.';
  } catch (error) {
    if (seq === active) status.textContent = 'Unable to display level: ' + String(error);
  }
}
for (const name of names) {
  const el = document.createElement('option'); el.value = name;
  el.textContent = name.replace(/\.txt$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  chooser.append(el);
}
chooser.value = 'pipedream.txt';
chooser.addEventListener('change', pick);
zoom.addEventListener('input', scaleCanvas);
pick();
