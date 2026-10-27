// Original Lix CC0 character artwork, from data/images/lixsprites.png.
// Activities/row indices mirror SimonN/LixD src/net/ac.d (Ac enum).
// Sprite coordinates and foot anchor mirror src/physics/lixxie/lixxie.d.
import { detectLixFrames } from './frames.js';
import { keyBlackBackground } from './key-black.js';

export const CHARACTER_ACTIVITIES = Object.freeze([
  { key: 'faller', row: 1, label: 'Falling', playable: true },
  { key: 'exiter', row: 8, label: 'Entering the exit', playable: false },
  { key: 'walker', row: 9, label: 'Walking', playable: true },
  { key: 'runner', row: 10, label: 'Running', playable: false },
  { key: 'climber', row: 11, label: 'Climbing', playable: false },
  { key: 'floater', row: 13, label: 'Floating', playable: false },
  { key: 'blocker', row: 16, label: 'Blocking', playable: false },
  { key: 'builder', row: 17, label: 'Building', playable: true },
  { key: 'platformer', row: 19, label: 'Platform building', playable: false },
  { key: 'basher', row: 21, label: 'Bashing', playable: false },
  { key: 'miner', row: 22, label: 'Mining', playable: false },
  { key: 'digger', row: 23, label: 'Digging', playable: false },
  { key: 'jumper', row: 24, label: 'Jumping', playable: false }
]);
export const CHARACTER_ATLAS_URL = 'lix/characters/lixsprites.png';
const PINNED_SHA = 'f1e805048fe439a4a0e9cc650c613713ababac8b';
export const CHARACTER_UPSTREAM_URL =
  'https://raw.githubusercontent.com/SimonN/LixD/' + PINNED_SHA
  + '/data/images/lixsprites.png';

export function frameIsPresent(source, layout, col, row) {
  if (col < 0 || col >= layout.columns || row < 0 || row >= layout.rows)
    return false;
  if (!layout.grid) return col === 0 && row === 0;
  const d = source.data;
  const x = 1 + col * (layout.width + 1);
  const y = 1 + row * (layout.height + 1);
  const corner = (y * source.width + x) * 4;
  // The Cutbit grid explicitly marks absent frames by copying the grid
  // colour into the frame's top-left pixel.
  for (let i = 0; i < 4; i++) if (d[corner + i] !== d[i]) return true;
  return false;
}

export function inspectCharacterAtlas(source) {
  const layout = detectLixFrames(source);
  if (!layout.grid || layout.rows < 25 || layout.columns < 8)
    throw new Error('The Lix character sheet does not have its expected frame grid');
  const rows = new Map();
  for (const activity of CHARACTER_ACTIVITIES) {
    const indices = [];
    for (let col = 0; col < layout.columns; col++)
      if (frameIsPresent(source, layout, col, activity.row)) indices.push(col);
    if (!indices.length) throw new Error('No Lix frames for ' + activity.key);
    rows.set(activity.key, { ...activity, indices });
  }
  return { layout, rows };
}

export function drawActivitySprite(ctx, atlas, activity, tick, {
  x = 0, y = 0, facingLeft = false, scale = 1
} = {}) {
  const row = atlas?.rows.get(activity);
  if (!row?.indices.length) return false;
  const { width: w, height: h } = atlas.layout;
  const col = row.indices[Math.floor(Math.max(0, tick)) % row.indices.length];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facingLeft ? -scale : scale, scale);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(atlas.canvas,
    1 + col * (w + 1), 1 + row.row * (h + 1), w, h,
    -(Math.floor(w / 2) - 1), -(h - 8), w, h);
  ctx.restore();
  return true;
}

export function activityForUnit(unit) {
  if (unit.state === 'builder') return 'builder';
  if (unit.state === 'walking') return 'walker';
  if (unit.state === 'falling' || unit.state === 'spawning') return 'faller';
  return null; // no invented animation for unimplemented skills
}
export function frameColumnForUnit(unit, tick, indices) {
  if (!indices?.length) return null;
  // Lix's builder animation advances once per physics tick; builder starts
  // around source frame 6. Walkers also advance on native 15Hz physics ticks.
  const offset = unit.state === 'builder' ? (unit.buildTicks || 0) + 5
    : Math.floor(Math.max(0, tick));
  return indices[((offset % indices.length) + indices.length) % indices.length];
}
export function drawCharacterSprite(ctx, atlas, unit, tick) {
  const activity = activityForUnit(unit);
  if (!activity || !atlas?.canvas) return false;
  const row = atlas.rows.get(activity);
  if (!row) return false;
  const col = frameColumnForUnit(unit, tick, row.indices);
  if (col === null) return false;
  const { width: w, height: h } = atlas.layout;
  const sx = 1 + col * (w + 1);
  const sy = 1 + row.row * (h + 1);
  ctx.save();
  ctx.translate(Math.round(unit.x), Math.round(unit.y));
  ctx.scale(unit.vx < 0 ? -1 : 1, 1);
  // Native Lix anchor: at the feet, 8px above the bottom of its sprite.
  ctx.drawImage(atlas.canvas, sx, sy, w, h,
    -(Math.floor(w / 2) - 1), -(h - 8), w, h);
  ctx.restore();
  return true;
}

export async function loadCharacterAtlas({
  localUrl = import.meta.env.BASE_URL + CHARACTER_ATLAS_URL,
  fallbackUrl = CHARACTER_UPSTREAM_URL
} = {}) {
  const load = url => new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load: ' + url));
    image.src = url;
  });
  let image;
  try { image = await load(localUrl); }
  catch { image = await load(fallbackUrl); }
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const raw = context.getImageData(0, 0, canvas.width, canvas.height);
  const { layout, rows } = inspectCharacterAtlas(raw);
  // Lix's sprite atlas uses black behind the characters. Flood-fill only
  // near-black pixels connected to each frame's border, protecting dark eyes.
  keyBlackBackground(raw, layout);
  // Decode the colour key after reading frame-grid metadata.
  for (let i = 0; i < raw.data.length; i += 4) {
    if (raw.data[i] >= 250 && raw.data[i + 1] <= 6 && raw.data[i + 2] >= 250)
      raw.data[i + 3] = 0;
  }
  context.putImageData(raw, 0, 0);
  return { canvas, layout, rows };
}
