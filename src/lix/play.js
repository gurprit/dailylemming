import trickyLevel from '../../content/lix/lovely/6gaps.txt?raw';
import friendlyLevel from '../../content/original/little-bridge.txt?raw';
import { parseLix, sourceAssets } from './parse.js';
import { LixGameModel, TICK_MS } from './game.js';
import { detectLixFrames, cutLixFrame } from './frames.js';
import { gadgetDrawable } from './render.js';
import { getPractice, savePractice, practiceLabel } from './practice.js';
import { projectBuilder } from './preview.js';
import { loadCharacterAtlas, drawCharacterSprite } from './characters.js';
import { drawWaterBackdrop } from './water.js';

const SHA = 'f1e805048fe439a4a0e9cc650c613713ababac8b';
const PREFIX = 'https://raw.githubusercontent.com/SimonN/LixD/' + SHA + '/images/';
const el = id => document.getElementById(id);
const canvas = el('playfield');
const ctx = canvas.getContext('2d');
const levelId = new URLSearchParams(location.search).get('level') === '6gaps'
  ? '6gaps' : 'little-bridge';
const level = levelId === '6gaps'
  ? parseLix(trickyLevel, { sourcePath: 'levels/single/lemforum/Lovely/6gaps.txt' })
  : parseLix(friendlyLevel, { sourcePath: 'content/original/little-bridge.txt' });
document.body.classList.toggle('easy-mode', levelId === 'little-bridge');
let model = null;
let spriteCache = null;
let characterAtlas = null;
let last = 0, accumulator = 0, speed = 1, animation = 0, ended = false;
let processedEvents = 0;
const landscape = { width: level.numeric.SIZE_X, height: level.numeric.SIZE_Y };
canvas.width = landscape.width; canvas.height = landscape.height;
const ground = document.createElement('canvas');
ground.width = landscape.width; ground.height = landscape.height;
const groundCtx = ground.getContext('2d');

function fmt(s) {
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
function say(s) { el('message').textContent = s; }
function showPractice(record = getPractice(undefined, levelId)) {
  el('practice-best').textContent = practiceLabel(record);
}
function freshGround() {
  if (!model?.changed) return;
  const data = new ImageData(new Uint8ClampedArray(model.terrain.pixels),
    model.terrain.width, model.terrain.height);
  groundCtx.putImageData(data, 0, 0);
  model.changed = false;
}
async function decodePng(path) {
  const url = PREFIX + path.split('/').map(encodeURIComponent).join('/');
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const raw = document.createElement('canvas');
        raw.width = img.naturalWidth;
        raw.height = img.naturalHeight;
        const rawCtx = raw.getContext('2d', { willReadFrequently: true });
        rawCtx.drawImage(img, 0, 0);
        const bitmap = rawCtx.getImageData(0, 0, raw.width, raw.height);
        // Lix sprites are frame grids, not one giant gadget. The sprite
        // metadata must be calculated before key-colour transparency.
        const layout = detectLixFrames(bitmap);
        const frames = [];
        for (let i = 0; i < layout.columns * layout.rows; i++) {
          const clipped = cutLixFrame(bitmap, layout, i);
          const off = document.createElement('canvas');
          off.width = clipped.width;
          off.height = clipped.height;
          off.getContext('2d').putImageData(
            new ImageData(clipped.data, clipped.width, clipped.height), 0, 0);
          frames.push({ data: clipped, canvas: off });
        }
        resolve({ ...frames[0], frames, layout });
      } catch (error) { reject(new Error('Unable to decode ' + path + ': ' + error)); }
    };
    // Prefer local, bundled CC0 art. Vite dev falls back to remote upstream
    // until npm run lix:vendor:first has populated the local public folder.
    const local = import.meta.env.BASE_URL + 'lix/images/'
      + path.split('/').map(encodeURIComponent).join('/');
    img.onerror = () => {
      if (img.src !== url) img.src = url;
      else reject(new Error('Image could not load: ' + path));
    };
    img.src = local;
  });
}
async function loadArt() {
  const assets = sourceAssets(level);
  const result = new Map();
  let next = 0, loaded = 0;
  async function worker() {
    while (next < assets.length) {
      const path = assets[next++];
      const decoded = await decodePng(path);
      result.set(path, decoded);
      loaded++;
      el('loading').textContent = 'Loading real Lix graphics… ' + loaded + '/' + assets.length;
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, assets.length) }, worker));
  return result;
}
function drawBuilderPreview(u) {
  if (!model.paused || !model.remaining.builder ||
    !['walking', 'builder'].includes(u.state)) return null;
  if (u.state === 'walking' && !u.grounded) return null;
  const projection = projectBuilder(model.terrain, u);
  if (!projection) return null;
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#ffdd93';
  ctx.strokeStyle = '#fdf8cb';
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(u.x, u.y - 10, 18, 0, Math.PI * 2);
  ctx.stroke();
  for (const brick of projection.bricks) {
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
  }
  if (projection.blocked) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff8f86';
    ctx.strokeStyle = '#fff1da';
    ctx.lineWidth = 2;
    const { x, y } = projection.blocked;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.fillText('!', x - 2, y + 4);
  }
  ctx.restore();
  return projection.blocked;
}
function paintCharacter(u) {
  if (['lost', 'saved'].includes(u.state)) return;
  if (drawCharacterSprite(ctx, characterAtlas, u, model?.ticks || 0)) return;
  const x = Math.round(u.x), y = Math.round(u.y);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(u.vx > 0 ? 1 : -1, 1);
  ctx.fillStyle = '#f5b6a0'; ctx.fillRect(-4, -15, 8, 8);
  ctx.fillStyle = '#82f8af'; ctx.fillRect(-6, -20, 12, 6);
  ctx.fillRect(-5, -22, 10, 3);
  ctx.fillStyle = '#5cbeff'; ctx.fillRect(-5, -7, 10, 6);
  ctx.fillStyle = '#ebf3fc';
  ctx.fillRect(-5, -1, 4, 3); ctx.fillRect(1, -1, 4, 3);
  ctx.fillStyle = '#23304a'; ctx.fillRect(2, -13, 2, 2);
  if (u.state === 'builder') {
    ctx.fillStyle = '#eeb76e'; ctx.fillRect(5, -13, 7, 3);
  }
  ctx.restore();
}
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#121d37'); sky.addColorStop(1, '#283a5a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!model) return;
  freshGround();
  if (levelId === 'little-bridge') drawWaterBackdrop(ctx, model.baseGadgets, model.ticks,
    canvas.width, canvas.height);
  ctx.drawImage(ground, 0, 0);
  // A forgiving visual cue for the first puzzle; old community map has none.
  if (levelId === 'little-bridge') {
    const x = 232, y = 203;
    ctx.save();
    ctx.fillStyle = '#b1ffd1';
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('BUILD HERE', x, y - 21);
    ctx.fillStyle = 'rgba(130,255,177,.7)';
    ctx.fillRect(x - 1, y - 15, 2, 12);
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 6);
    ctx.lineTo(x, y);
    ctx.lineTo(x + 5, y - 6);
    ctx.fill();
    ctx.restore();
  }
  for (const g of model.baseGadgets) {
    if (!g.image || (levelId === 'little-bridge' && g.sourceImage?.endsWith('.W'))) continue;
    // Animated hatches and liquids cycle through their clipped Cutbit frames.
    ctx.drawImage(gadgetDrawable(g, model.ticks), g.x, g.y);
    if (g.kind === 'goal') {
      ctx.fillStyle = '#98f4b6';
      ctx.font = 'bold 11px system-ui';
      ctx.fillText('EXIT', g.x + 4, Math.max(12, g.y - 7));
    }
  }
  let obstacle = null;
  for (const u of model.units) {
    obstacle ||= drawBuilderPreview(u);
    paintCharacter(u);
  }
  const warning = el('preview-warning');
  warning.hidden = !obstacle;
  if (obstacle) warning.textContent = obstacle.steel
    ? '⚠ Steel above: a longer queued staircase may collide and turn your builder back.'
    : '⚠ Overhead obstacle: this staircase may stop early and reverse direction.';
  if (model.paused && !model.done) {
    ctx.fillStyle = 'rgba(12,22,42,.56)';
    ctx.fillRect(0, 0, canvas.width, 46);
    ctx.fillStyle = '#e9faf0'; ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui';
    ctx.fillText(model.started ? 'PAUSED' : 'READY TO BUILD?', canvas.width / 2, 19);
    ctx.font = '11px system-ui';
    ctx.fillText('Press Start / Resume when ready', canvas.width / 2, 37);
    ctx.textAlign = 'left';
  }
}
function updateHud() {
  if (!model) return;
  const state = model.snapshot();
  el('saved').textContent = state.saved + '/' + state.total;
  el('builders').textContent = String(state.builder);
  el('count').textContent = String(state.builder);
  el('timer').textContent = fmt(state.seconds);
  el('state').textContent = state.done ? (state.won ? 'SAVED!' : 'FAILED')
    : state.paused ? (state.started ? 'PAUSED' : 'READY') : 'RUNNING';
  el('pause').textContent = state.started ? (state.paused ? '▶ Resume' : '⏸ Pause') : '▶ Start';
  el('builder').disabled = state.builder < 1 || state.done;
  el('pause').disabled = state.done;
  el('speed').textContent = '⏩ ' + speed + '× speed';
  el('step').disabled = !state.paused || state.done;
  el('undo').disabled = !model.undoAvailable;
  el('builder').setAttribute('aria-pressed', String(state.builder > 0));
}
function finish() {
  if (ended) return;
  ended = true;
  const snap = model.snapshot();
  const practice = savePractice(snap, undefined, levelId);
  showPractice(practice);
  el('result-icon').textContent = snap.won ? '✦' : '↻';
  el('result-heading').textContent = snap.won ? 'You did it!' : 'One more try?';
  el('result-summary').textContent = 'Saved ' + snap.saved + '/' + snap.total
    + ' in ' + fmt(snap.seconds) + ' using ' + snap.used + ' builder assignments.'
    + (practice.improved ? ' New practice personal best! ✨'
      : snap.won ? ' Great work!' : ' Experiment with the timing and placement of your bridges.');
  el('result').hidden = false;
  el('result-retry').focus();
}
function loop(now) {
  if (!model) return;
  try {
    if (!last) last = now;
    const dt = Math.min(100, now - last);
    last = now;
    if (!model.paused && !model.done) {
      accumulator += dt * speed;
      let n = 0;
      while (accumulator >= TICK_MS && !model.done && n++ < 10) {
        model.tick();
        accumulator -= TICK_MS;
      }
    }
    // Event-based hints surface physics changes without interrupting gameplay.
    while (processedEvents < model.events.length) {
      const event = model.events[processedEvents++];
      if (event.type === 'landed') say('Landed safely. Tap the walker to build a bridge.');
      if (event.type === 'builder-finished') say('Staircase finished. Another builder can be assigned.');
      if (event.type === 'builder-continued') say('Queued builder activated, staircase continuing!');
      if (event.type === 'builder-blocked') say('Builder hit an obstacle and turned around.');
      if (event.type === 'drowned') say('The wanderer fell into danger. Try another route!');
    }
    updateHud();
    draw();
    if (model.done) finish();
    animation = requestAnimationFrame(loop);
  } catch (error) {
    // Don't leave the status stuck at RUNNING when a render/physics error
    // prevents requestAnimationFrame from scheduling another frame.
    model.paused = true;
    el('state').textContent = 'ERROR';
    el('pause').disabled = true;
    el('loading').textContent = 'Game stopped: ' + (error?.message || String(error))
      + '. Please refresh or restart after fixing the error.';
    el('loading').hidden = false;
    say('The game encountered an error; details are shown on the game screen.');
    console.error('Daily Lemming: game loop stopped', error);
  }
}
function restart() {
  if (!model) return;
  model.reset();
  accumulator = 0; last = 0; speed = 1; ended = false;
  processedEvents = 0;
  el('result').hidden = true;
  say(levelId === 'little-bridge'
    ? 'Just one gap. Tap the walker near the BUILD HERE arrow to make a little bridge.'
    : 'Five builders. Six gaps. One tiny walker. Can you find the route?');
  updateHud();
  draw();
}
canvas.addEventListener('pointerdown', event => {
  if (!model || model.done) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * canvas.width / rect.width;
  const y = (event.clientY - rect.top) * canvas.height / rect.height;
  // At least 40 CSS pixels of hit target on phones, regardless of canvas scale.
  const radius = Math.max(27, 40 * canvas.width / rect.width);
  const index = model.units.findIndex(u => ['walking', 'builder'].includes(u.state)
    && Math.hypot(x - u.x, y - (u.y - 10)) <= radius);
  if (index < 0) {
    say('Tap the walker when it is standing on terrain. You can pause and step forward to aim.');
    return;
  }
  const wasBuilding = model.units[index]?.state === 'builder';
  if (model.assignBuilder(index)) {
    say(wasBuilding
      ? 'Another builder queued! The staircase will continue without stopping.'
      : 'Builder assigned! A staircase is being constructed.');
  } else {
    say('Start builders on solid ground, or tap an active builder to queue another staircase.');
  }
  updateHud();
});
el('builder').addEventListener('click', () => say('Builder selected: tap the little walker to create stairs.'));
el('pause').addEventListener('click', () => { if (model) { model.togglePause(); updateHud(); } });
el('restart').addEventListener('click', restart);
function undo() {
  if (!model?.undoBuilder()) return;
  ended = false;
  processedEvents = model.events.length;
  accumulator = 0;
  last = 0;
  el('result').hidden = true;
  say('Last builder undone. Skill, position and terrain restored. Press Resume when ready.');
  updateHud();
  draw();
}
el('undo').addEventListener('click', undo);
el('step').addEventListener('click', () => {
  if (model?.stepOnce()) { updateHud(); draw(); }
});
el('speed').addEventListener('click', () => {
  speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
  updateHud();
});
el('result-retry').addEventListener('click', restart);
el('result-close').addEventListener('click', () => { el('result').hidden = true; });
window.addEventListener('keydown', event => {
  if (!model) return;
  if (event.key === 'Escape') { el('result').hidden = true; return; }
  if (!el('result').hidden) return;
  if (event.code === 'Space') { event.preventDefault(); model.togglePause(); updateHud(); }
  if (event.key.toLowerCase() === 'r') restart();
  if (event.key.toLowerCase() === 'z' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    undo();
  }
  if (event.key === '.' && model?.stepOnce()) { updateHud(); draw(); }
});
window.addEventListener('pagehide', () => cancelAnimationFrame(animation));
async function boot() {
  try {
    // Original character art is optional; retain the hand-drawn figure
    // when the sheet can't be downloaded for any reason.
    const [terrainImages, atlas] = await Promise.all([
      loadArt(),
      loadCharacterAtlas().catch(error => {
        console.warn('Lix character sheet unavailable; using placeholder', error);
        return null;
      })
    ]);
    spriteCache = terrainImages;
    characterAtlas = atlas;
    model = new LixGameModel(level, spriteCache);
    el('art-status').textContent = characterAtlas
      ? 'Original Lix character sprites · CC0'
      : 'Fallback character · sheet unavailable';
    el('level-title').textContent = level.title;
    el('mode-tag').textContent = levelId === 'little-bridge'
      ? '🌿 EASY PRACTICE · ONE LITTLE BRIDGE'
      : '🧪 HARD PRACTICE · ORIGINAL LIX COMMUNITY LEVEL';
    el('level-intro').textContent = levelId === 'little-bridge'
      ? 'A single small gap, three builders and no nasty steel ceilings. Follow the BUILD HERE arrow to cross safely.'
      : 'The original CC0 puzzle by mobius: six gaps, five builders, and a much trickier route.';
    el('credit').textContent = levelId === 'little-bridge'
      ? 'Original introductory level by Daily Lemming. CC0 artwork from Lix.'
      : 'Original Lix level by mobius. Level and artwork made available under CC0.';
    el('source-link').href = levelId === 'little-bridge'
      ? 'https://github.com/gurprit/dailylemming/blob/feat/lix-physics-polish/content/original/little-bridge.txt'
      : 'https://github.com/SimonN/LixD/blob/f1e805048fe439a4a0e9cc650c613713ababac8b/levels/single/lemforum/Lovely/6gaps.txt';
    document.title = level.title + ' | Daily Lemming';
    say(levelId === 'little-bridge'
      ? 'Press Start, then assign a builder near the BUILD HERE arrow. You have three attempts.'
      : 'Five builders. Six gaps. One tiny walker. Can you find the route?');
    el('loading').hidden = true;
    showPractice();
    updateHud(); draw();
    animation = requestAnimationFrame(loop);
  } catch (error) {
    el('loading').textContent = 'Unable to load this level: ' + (error?.message || String(error))
      + '. Please check your internet connection or try again.';
  }
}
boot();
