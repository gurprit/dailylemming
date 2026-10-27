import trickyLevel from '../../content/lix/lovely/6gaps.txt?raw';
import lovely_pipedream from '../../content/lix/lovely/pipedream.txt?raw';
import lovely_beneaththelab from '../../content/lix/lovely/beneaththelab.txt?raw';
import lovely_climbtofreedom from '../../content/lix/lovely/climbtofreedom.txt?raw';
import lovely_everylix from '../../content/lix/lovely/everylix.txt?raw';
import lovely_escapethepit from '../../content/lix/lovely/escapethepit.txt?raw';
import lovely_pitfall from '../../content/lix/lovely/pitfall.txt?raw';
import lovely_putyourlix from '../../content/lix/lovely/putyourlix.txt?raw';
import lovely_solareclipse from '../../content/lix/lovely/solareclipse.txt?raw';
import lovely_alternative from '../../content/lix/lovely/alternative.txt?raw';
import lovely_anecklaceofraindrops from '../../content/lix/lovely/anecklaceofraindrops.txt?raw';
import friendlyLevel from '../../content/original/little-bridge.txt?raw';
import doubleTroubleLevel from '../../content/original/double-trouble.txt?raw';
import tunnelTimeLevel from '../../content/original/tunnel-time.txt?raw';
import digForFreedomLevel from '../../content/original/dig-for-freedom.txt?raw';
import secretPassageLevel from '../../content/original/secret-passage.txt?raw';
import turnaroundLevel from '../../content/original/turnaround.txt?raw';
import bridgeBrigadeLevel from '../../content/original/bridge-brigade.txt?raw';
import pitfallLevel from '../../content/lix/lovely/pitfall.txt?raw';
import mazeLevel from '../../content/lix/lovely/buildingblock.txt?raw';
import lixBuilders from '../../content/lix/tutorial/builders.txt?raw';
import lixBashers from '../../content/lix/tutorial/bashers.txt?raw';
import lixDiggers from '../../content/lix/tutorial/diggers.txt?raw';
import lixMiners from '../../content/lix/tutorial/miners.txt?raw';
import lixBlockers from '../../content/lix/tutorial/blockers.txt?raw';
import lixPlatformers from '../../content/lix/tutorial/platformers.txt?raw';
import lixJumpers from '../../content/lix/tutorial/jumpers.txt?raw';
import lixRunners from '../../content/lix/tutorial/runners.txt?raw';
import lixWalkersTurn from '../../content/lix/tutorial/walkers-turn.txt?raw';
import lixClimbersFloaters from '../../content/lix/tutorial/climbers-floaters.txt?raw';
import { LEVEL_OPTIONS, resolveLevelId } from './level-options.js';
import { parseLix, sourceAssets } from './parse.js';
import { LixGameModel, TICK_MS, PHYSICS_HZ } from './game.js';
import { detectLixFrames, cutLixFrame } from './frames.js';
import { gadgetDrawable } from './render.js';
import { getPractice, savePractice, practiceLabel } from './practice.js';
import { projectBuilder } from './preview.js';
import { loadCharacterAtlas, drawCharacterSprite } from './characters.js';
import { drawWaterBackdrop, drawWaterline } from './water.js';
import { unitAtPoint, drawUnitTarget } from './targeting.js';
import { DirtParticles } from './particles.js';
import { utcDay } from '../daily.js';
import { dailyChallenge, dailyStreak, readDaily, saveDaily, dailyResultText } from './daily-challenge.js';
import { mysteryLevel } from './featured-levels.js';

const SHA = 'f1e805048fe439a4a0e9cc650c613713ababac8b';
const PREFIX = 'https://raw.githubusercontent.com/SimonN/LixD/' + SHA + '/images/';
const el = id => document.getElementById(id);
const canvas = el('playfield');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(location.search);
const dailyMode = params.get('mode') === 'daily';
const mysteryMode = !dailyMode && !params.has('level');
const daily = dailyChallenge(utcDay());
const mystery = mysteryLevel(utcDay());
const levelId = dailyMode ? daily.levelId
  : mysteryMode ? mystery.levelId : resolveLevelId(params.get('level'));
const config = LEVEL_OPTIONS[levelId];
const DEMO_TUTORIAL_SKILL = {
  'lix-builders':'builder','lix-bashers':'basher','lix-diggers':'digger',
  'lix-miners':'miner','lix-blockers':'blocker','lix-platformers':'platformer',
  'lix-jumpers':'jumper','lix-runners':'runner',
  'lix-walkers-turn':'walker','lix-climbers-floaters':'climber'
};
const source = {
  'little-bridge': friendlyLevel, 'double-trouble': doubleTroubleLevel, 'tunnel-time': tunnelTimeLevel, 'dig-for-freedom': digForFreedomLevel, 'secret-passage': secretPassageLevel, turnaround: turnaroundLevel,
  'bridge-brigade': bridgeBrigadeLevel, '6gaps': trickyLevel,
  pitfall: pitfallLevel, 'building-block-maze': mazeLevel,
  'lix-builders': lixBuilders, 'lix-bashers': lixBashers,
  'lix-diggers': lixDiggers, 'lix-miners': lixMiners, 'lix-blockers': lixBlockers,
  'lix-platformers': lixPlatformers, 'lix-jumpers': lixJumpers,
  'lix-runners': lixRunners, 'lix-walkers-turn': lixWalkersTurn,
  'lix-climbers-floaters': lixClimbersFloaters,
  'lovely-pipedream': lovely_pipedream,
  'lovely-beneaththelab': lovely_beneaththelab,
  'lovely-climbtofreedom': lovely_climbtofreedom,
  'lovely-everylix': lovely_everylix,
  'lovely-escapethepit': lovely_escapethepit,
  'lovely-pitfall': lovely_pitfall,
  'lovely-putyourlix': lovely_putyourlix,
  'lovely-solareclipse': lovely_solareclipse,
  'lovely-alternative': lovely_alternative,
  'lovely-anecklaceofraindrops': lovely_anecklaceofraindrops
}[levelId];
const sourcePath = config.category === 'community-puzzle'
  ? 'levels/single/lemforum/Lovely/' + config.communityFile + '.txt'
  : config.category === 'official-tutorial'
  ? 'levels/tutorial/basic/' + config.tutorialFile + '.txt'
  : config.verified
  ? 'content/original/' + levelId + '.txt'
  : 'levels/single/lemforum/Lovely/' + ({
    '6gaps': '6gaps', pitfall: 'pitfall', 'building-block-maze': 'buildingblock'
  }[levelId]) + '.txt';
const level = parseLix(source, { sourcePath });
document.body.classList.toggle('easy-mode', config.verified);
document.body.classList.toggle('community-mode', !config.verified);
let model = null;
let spriteCache = null;
let characterAtlas = null;
let selectedSkill = 'builder';
const SKILL_LABELS = {
  builder: '🧱 Builder', blocker: '🛑 Blocker',
  basher: '⛏️ Basher', digger: '🕳️ Digger', miner: '⛏ Miner',
  walker: '↩ Walker', runner: '🏃 Runner', climber: '🧗 Climber',
  floater: '🪂 Floater', platformer: '🪵 Platformer', jumper: '↗ Jumper',
  exploder: '💣 Exploder'
};
let last = 0, accumulator = 0, speed = 1, animation = 0, ended = false;
let processedEvents = 0;
let pointerPosition = null;
const dirt = new DirtParticles();
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
  if (dailyMode) {
    const current = readDaily()[daily.day];
    el('practice-best').textContent = current
      ? 'First: ' + current.first.saved + '/' + current.first.total + ' saved. '
        + 'Best: ' + current.best.saved + '/' + current.best.total
        + ' with ' + current.best.used + ' skills in ' + fmt(current.best.seconds)
        + '. ' + current.attempts + ' attempts.'
      : 'Your first daily rescue awaits!';
    el('daily-streak').textContent = String(dailyStreak(daily.day));
  } else {
    el('practice-best').textContent = practiceLabel(record);
  }
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
  if (selectedSkill !== 'builder' || !model.paused || !model.remaining.builder ||
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
  const spriteDrawn = drawCharacterSprite(ctx, characterAtlas, u, model?.ticks || 0);
  if (u.state === 'exiting') {
    // A restrained sparkle burst to accompany the native exiter jump.
    const phase = Math.min(1, (u.exitTicks || 0) / 18);
    ctx.save();
    ctx.fillStyle = '#a6f8bb';
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      const radius = 4 + phase * 16;
      ctx.globalAlpha = 1 - phase * .9;
      ctx.fillRect(Math.round(u.x + Math.cos(angle) * radius),
        Math.round(u.y - 14 + Math.sin(angle) * radius - phase * 12), 2, 2);
    }
    ctx.restore();
  }
  if (spriteDrawn) return;
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
  if (config.verified) drawWaterBackdrop(ctx, model.baseGadgets, model.ticks,
    canvas.width, canvas.height);
  ctx.drawImage(ground, 0, 0);
  // Show continuous animated water at the bottom edge, not a lone tile.
  if (config.verified) drawWaterline(ctx, model.baseGadgets,
    model.ticks, canvas.width, canvas.height);
  // A forgiving visual cue for the first puzzle; old community map has none.
  if (levelId === 'little-bridge' || levelId === 'double-trouble') {
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
    if (levelId === 'double-trouble') {
      const x2 = 444, y2 = 203;
      ctx.save();
      ctx.fillStyle = '#b1ffd1';
      ctx.font = 'bold 11px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('BUILD AGAIN', x2, y2 - 21);
      ctx.fillRect(x2 - 1, y2 - 15, 2, 12);
      ctx.beginPath();
      ctx.moveTo(x2 - 5, y2 - 6);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x2 + 5, y2 - 6);
      ctx.fill();
      ctx.restore();
    }
  }
  if (levelId === 'turnaround' || levelId === 'bridge-brigade') {
    ctx.save();
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b1ffd1';
    const hints = [{label:'BLOCK HERE', x:234, y:186}];
    if (levelId === 'bridge-brigade') hints.push({label:'BUILD HERE', x:560, y:184});
    for (const h of hints) {
      ctx.fillText(h.label, h.x, h.y);
      ctx.fillRect(h.x - 1, h.y + 6, 2, 12);
      ctx.beginPath();
      ctx.moveTo(h.x - 5, h.y + 16);
      ctx.lineTo(h.x, h.y + 22);
      ctx.lineTo(h.x + 5, h.y + 16);
      ctx.fill();
    }
    ctx.restore();
  }
  if (levelId === 'secret-passage') {
    ctx.save();
    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = '#b1ffd1';
    ctx.textAlign = 'center';
    const hints = [
      {label: 'MINE HERE', x: 180, y: 114},
      {label: 'BASH HERE', x: 424, y: 209}
    ];
    for (const h of hints) {
      ctx.fillText(h.label, h.x, h.y);
      ctx.fillRect(h.x - 1, h.y + 6, 2, 10);
      ctx.beginPath();
      ctx.moveTo(h.x - 5, h.y + 14);
      ctx.lineTo(h.x, h.y + 20);
      ctx.lineTo(h.x + 5, h.y + 14);
      ctx.fill();
    }
    ctx.restore();
  }
  if (levelId === 'dig-for-freedom') {
    ctx.save();
    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = '#b1ffd1';
    ctx.textAlign = 'center';
    ctx.fillText('DIG HERE', 160, 121);
    ctx.fillRect(159, 126, 2, 12);
    ctx.beginPath();
    ctx.moveTo(155, 136); ctx.lineTo(160, 142); ctx.lineTo(165, 136); ctx.fill();
    ctx.restore();
  }
  if (levelId === 'tunnel-time') {
    ctx.save();
    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = '#b1ffd1';
    ctx.textAlign = 'center';
    ctx.fillText('BASH HERE', 292, 185);
    ctx.fillRect(291, 191, 2, 12);
    ctx.beginPath();
    ctx.moveTo(287, 200); ctx.lineTo(292, 206); ctx.lineTo(297, 200); ctx.fill();
    ctx.restore();
  }
  for (const g of model.baseGadgets) {
    if (!g.image || (config.verified && g.sourceImage?.endsWith('.W'))) continue;
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
  dirt.draw(ctx);
  // Classic five-to-one countdown follows each armed Lix, even while it walks.
  for (const unit of model.units) {
    if (!(unit.fuseTicks > 0) || ['saved','lost','exiting'].includes(unit.state)) continue;
    const number = Math.ceil(unit.fuseTicks / PHYSICS_HZ);
    const x = Math.round(unit.x), y = Math.round(unit.y - 33);
    ctx.save();
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#161b2a'; ctx.lineWidth = 3;
    ctx.fillStyle = number < 3 ? '#ff754f' : '#fff6ae';
    ctx.strokeText(String(number), x, y);
    ctx.fillText(String(number), x, y);
    ctx.restore();
  }
  for (const event of model.events.slice(-24)) {
    const age = model.ticks - event.tick;
    if (event.type !== 'exploded' || age < 0 || age > 5) continue;
    ctx.save();
    ctx.strokeStyle = age < 2 ? '#fff8b7' : '#ff9b43';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(event.x,event.y-9,4+age*4,0,Math.PI*2);
    ctx.stroke(); ctx.restore();
  }
  const hovered = pointerPosition && !model.done
    ? unitAtPoint(model.units, pointerPosition.x, pointerPosition.y,
      selectedSkill, model.remaining, pointerPosition.radius)
    : -1;
  canvas.style.cursor = hovered >= 0 ? 'none' : 'crosshair';
  if (hovered >= 0) drawUnitTarget(ctx, model.units[hovered]);
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
  el('builders').textContent = String(Object.values(state.skills || {}).reduce((a, n) => a + n, 0));
  el('timer').textContent = fmt(state.seconds);
  el('state').textContent = state.done ? (state.won ? 'SAVED!' : 'FAILED')
    : state.paused ? (state.started ? 'PAUSED' : 'READY') : 'RUNNING';
  el('pause').textContent = state.started ? (state.paused ? '▶ Resume' : '⏸ Pause') : '▶ Start';
  for (const skill of Object.keys(SKILL_LABELS)) {
    const btn = el('skill-' + skill);
    const count = state.skills?.[skill] || 0;
    if (!btn) continue;
    btn.hidden = count === 0 && !(level.skills[skill.toUpperCase()] !== undefined
      && level.skills[skill.toUpperCase()] !== 0);
    btn.disabled = count === 0 || state.done;
    btn.setAttribute('aria-pressed', String(selectedSkill === skill));
    btn.textContent = SKILL_LABELS[skill] + ' · ' + (count < 0 ? '∞' : count);
  }
  el('pause').disabled = state.done;
  el('speed').textContent = '⏩ ' + speed + '× speed';
  el('step').disabled = !state.paused || state.done;
  el('undo').disabled = !model.undoAvailable;

}
function finish() {
  if (ended) return;
  ended = true;
  const snap = model.snapshot();
  const staleDaily = dailyMode && utcDay() !== daily.day;
  if (staleDaily) {
    say('The UTC daily challenge changed while you played. Refresh for the new puzzle.');
  }
  const practice = dailyMode
    ? (staleDaily ? null : saveDaily(daily.day, levelId, snap))
    : savePractice(snap, undefined, levelId);
  showPractice(practice);
  el('result-icon').textContent = snap.won ? '✦' : '↻';
  el('result-heading').textContent = snap.won ? 'You did it!' : 'One more try?';
  el('result-summary').textContent = 'Saved ' + snap.saved + '/' + snap.total
    + ' in ' + fmt(snap.seconds) + ' using ' + snap.used + ' skill assignments.'
    + (!dailyMode && practice?.improved ? ' New practice personal best! ✨'
      : snap.won ? ' Great work!' : ' Experiment with a different skill or timing.');
  const next = levelId === 'little-bridge' ? 'double-trouble'
    : levelId === 'double-trouble' ? 'tunnel-time'
    : levelId === 'tunnel-time' ? 'dig-for-freedom'
    : levelId === 'dig-for-freedom' ? 'secret-passage'
    : levelId === 'secret-passage' ? 'turnaround'
    : levelId === 'turnaround' ? 'bridge-brigade' : null;
  el('result-next').hidden = dailyMode || !(snap.won && next);
  el('result-share').hidden = !dailyMode || staleDaily;
  el('result-next').textContent = next
    ? 'Next level: ' + LEVEL_OPTIONS[next].name + ' →' : '';
  el('result').hidden = false;
  (el('result-next').hidden ? el('result-retry') : el('result-next')).focus();
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
      // Excavation and debris are intentionally separate. Miner physics cuts
      // every few ticks, but debris only flies when the pick strikes terrain.
      if (event.type === 'exploded') {
        dirt.burst('exploded', event.x, event.y);
        say('BOOM! A crater has opened. Beware of nearby Lix!');
      }
      if (event.type === 'armed') say('Five seconds to BOOM! Watch the countdown. 💣');
      if (event.type === 'dug' || event.type === 'bashed'
          || (event.type === 'mined' && event.detail === 'impact')) {
        const unit = model.units.find(u => Math.abs(u.x - event.x) < 9
          && Math.abs(u.y - event.y) < 9);
        dirt.burst(event.type, event.x, event.y, unit?.vx || 1);
      }
      if (event.type === 'landed') say('Landed safely. Tap the walker to build a bridge.');
      if (event.type === 'builder-finished') say('Staircase finished. Another builder can be assigned.');
      if (event.type === 'builder-continued') say('Queued builder activated, staircase continuing!');
      if (event.type === 'builder-blocked') say('Builder hit an obstacle and turned around.');
      if (event.type === 'drowned') say('The wanderer fell into danger. Try another route!');
      if (event.type === 'exit-started') say('Freedom! ✨ Watch your Lix leap through the exit…');
      if (event.type === 'blocked') say('The Blocker turned another Lix around!');
      if (event.type === 'assigned' && event.detail === 'blocker'
          && levelId === 'bridge-brigade' && model.remaining.builder > 0) {
        selectedSkill = 'builder';
        say('Blocker in place! Builder selected. Now guide the next Lix over the gap.');
      }
      if (event.type === 'basher-steel' || event.type === 'digger-steel')
        say('That steel cannot be cut. Try another route.');
      if (event.type === 'basher-finished') say('The Basher has finished tunnelling.');
      if (event.type === 'digger-finished') say('The Digger has reached open space.');
      if (event.type === 'miner-finished') {
        if (levelId === 'secret-passage' && model.remaining.basher > 0) {
          selectedSkill = 'basher';
          say('The Miner broke through! Basher selected next. Tap your Lix at BASH HERE.');
        } else say('The Miner broke through to open space!');
      }
      if (event.type === 'miner-steel') say('The Miner cannot dig through steel.');
    }
    if (!model.paused && !model.done) dirt.update(Math.min(.04, dt / 1000));
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
  selectedSkill = DEMO_TUTORIAL_SKILL[levelId]
    || (['turnaround','bridge-brigade'].includes(levelId) ? 'blocker'
    : levelId === 'secret-passage' ? 'miner'
    : Object.keys(SKILL_LABELS).find(skill => model.hasSkill(skill)) || 'builder');
  accumulator = 0; last = 0; speed = 1; ended = false;
  processedEvents = 0;
  dirt.clear();
  pointerPosition = null;
  canvas.style.cursor = 'crosshair';
  el('result').hidden = true;
  el('result-share').hidden = true;
  el('result-share').textContent = 'Share daily result ↗';
  say(config.hint);
  updateHud();
  draw();
}
function pointerPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
    radius: Math.max(25, 36 * canvas.width / rect.width)
  };
}
canvas.addEventListener('pointermove', event => {
  // Only mouse and pen pointers have a persistent hover state.
  if (event.pointerType === 'touch') return;
  pointerPosition = pointerPoint(event);
});
canvas.addEventListener('pointerleave', () => {
  pointerPosition = null;
  canvas.style.cursor = 'crosshair';
});
canvas.addEventListener('pointerdown', event => {
  if (!model || model.done) return;
  const point = pointerPoint(event);
  const index = unitAtPoint(model.units, point.x, point.y,
    selectedSkill, model.remaining, point.radius);
  if (index < 0) {
    say('Tap the walker when it is standing on terrain. You can pause and step forward to aim.');
    return;
  }
  const wasBuilding = model.units[index]?.state === 'builder';
  if (model.assignSkill(selectedSkill, index)) {
    const message = {
      builder: wasBuilding
        ? 'Another Builder queued. The staircase will continue!'
        : 'Builder assigned. Your Lix is laying stairs!',
      blocker: 'Blocker assigned. Approaching Lix will turn around!',
      basher: 'Basher assigned. Cutting a horizontal tunnel!',
      digger: 'Digger assigned. Digging a shaft down!',
      miner: 'Miner assigned. Carving a diagonal tunnel!',
      walker: 'Walker turns around or releases a blocker.',
      runner: 'Runner moves faster!',
      climber: 'Climber can scale obstacles!',
      floater: 'Floater parachutes through long drops!',
      platformer: 'Platformer builds a flat bridge!',
      jumper: 'Jumper leaps over gaps!',
      exploder: 'Exploder armed! Countdown above the moving Lix.'
    };
    say(message[selectedSkill]);
  } else {
    say('Choose an available skill and tap a Lix standing on solid ground.');
  }
  updateHud();
});
for (const skill of Object.keys(SKILL_LABELS)) {
  const btn = el('skill-' + skill);
  btn.addEventListener('click', () => {
    if (!model || !model.hasSkill(skill)) return;
    selectedSkill = skill;
    say(skill === 'builder' ? 'Tap a grounded Lix to build stairs.'
      : 'Selected ' + skill + '. Tap a grounded Lix to assign it.');
    updateHud();
  });
}
el('level-picker').addEventListener('change', event => {
  const id = event.target.value;
  window.location.href = id === '__mystery__' ? './index.html'
    : id === '__daily__' ? './index.html?mode=daily'
    : './index.html?level=' + encodeURIComponent(resolveLevelId(id));
});
el('pause').addEventListener('click', () => { if (model) { model.togglePause(); updateHud(); } });
el('restart').addEventListener('click', restart);
function undo() {
  if (!model?.undoBuilder()) return;
  ended = false;
  processedEvents = model.events.length;
  dirt.clear();
  accumulator = 0;
  last = 0;
  el('result').hidden = true;
  say('Last skill undone. Inventory, position and terrain restored. Press Resume when ready.');
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
el('result-next').addEventListener('click', () => {
  const next = levelId === 'little-bridge' ? 'double-trouble'
    : levelId === 'double-trouble' ? 'tunnel-time'
    : levelId === 'tunnel-time' ? 'dig-for-freedom'
    : levelId === 'dig-for-freedom' ? 'secret-passage'
    : levelId === 'secret-passage' ? 'turnaround'
    : levelId === 'turnaround' ? 'bridge-brigade' : null;
  if (next) window.location.href = './index.html?level=' + next;
});
el('result-share').addEventListener('click', async () => {
  if (!dailyMode || utcDay() !== daily.day) return;
  const record = readDaily()[daily.day];
  if (!record) return;
  const text = dailyResultText(daily.day, record);
  try {
    if (navigator.share) await navigator.share({ text });
    else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      el('result-share').textContent = 'Copied! ✓';
    } else say(text);
  } catch (error) {
    if (error?.name !== 'AbortError') say('Sharing is unavailable on this device.');
  }
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
// Keep the tab honest when somebody plays across a 00:00 UTC reset.
function checkDailyReset() {
  if (!dailyMode || utcDay() === daily.day) return;
  if (model && !model.done) model.paused = true;
  say('A new UTC daily puzzle is ready. Reload to play today\'s challenge!');
  el('daily-date').textContent = 'NEW CHALLENGE AVAILABLE · RELOAD';
}
window.addEventListener('focus', checkDailyReset);
const resetPoll = window.setInterval(checkDailyReset, 60_000);
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(animation);
  window.clearInterval(resetPoll);
});
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
    selectedSkill = DEMO_TUTORIAL_SKILL[levelId]
      || (['turnaround','bridge-brigade'].includes(levelId) ? 'blocker'
      : levelId === 'secret-passage' ? 'miner'
      : Object.keys(SKILL_LABELS)
        .find(skill => model.hasSkill(skill)) || 'builder');
    el('art-status').textContent = characterAtlas
      ? 'Original Lix character sprites · CC0'
      : 'Fallback character · sheet unavailable';
    el('level-title').textContent = level.title;
    el('daily-bar').hidden = !dailyMode;
    if (dailyMode) {
      el('daily-date').textContent = daily.day + ' · UTC · DAY ' + String(daily.number).padStart(3,'0');
    }
    el('result-share').hidden = true;
    el('mode-tag').textContent = mysteryMode
      ? '🎲 TODAY\'S MYSTERY · REAL LIX COMMUNITY PUZZLE'
      : dailyMode
      ? '✳ VERIFIED DAILY CHALLENGE · ' + config.name.toUpperCase()
      : config.verified
      ? '🌿 VERIFIED PRACTICE · ' + config.name.toUpperCase()
      : config.category === 'official-tutorial'
        ? '🟢 ORIGINAL LIX BASIC TUTORIAL · ' + config.name.toUpperCase()
        : '🧪 COMMUNITY LEVEL · EXPERIMENTAL PHYSICS';
    el('level-intro').textContent = config.intro;
    el('credit').textContent = config.credit;
    el('source-link').href = config.source;
    el('level-picker').value = mysteryMode ? '__mystery__'
      : dailyMode ? '__daily__' : levelId;
    const warning = el('compat-warning');
    warning.hidden = config.verified;
    warning.textContent = config.verified ? ''
      : config.category === 'official-tutorial'
        ? 'Authentic CC0 Lix beginner tutorial. Our browser physics differ from the original; this level loads but has not yet passed a full-solution test.'
        : 'This imported level is experimental. Original physics and some abilities are still unavailable; a win is not guaranteed.';
    document.title = level.title + ' | Daily Lemming';
    say(config.hint);
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
