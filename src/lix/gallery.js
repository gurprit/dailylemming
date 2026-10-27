import { CHARACTER_ACTIVITIES, loadCharacterAtlas, drawActivitySprite } from './characters.js';

const cards = document.querySelector('#cards');
const status = document.querySelector('#status');
const toggle = document.querySelector('#toggle');
const speed = document.querySelector('#speed');
const gallery = document.querySelector('.gallery');
const previews = [];
let atlas = null, playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
let frameCounter = 0, last = 0, pending = 0;

function createPreview(row) {
  const card = document.createElement('article');
  card.className = 'sprite-card';
  const canvas = document.createElement('canvas');
  canvas.width = 220; canvas.height = 110;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', row.label + ' Lix animation preview');
  const detail = document.createElement('div');
  detail.className = 'sprite-info';
  const name = document.createElement('h2');
  name.textContent = row.label;
  const count = document.createElement('span');
  count.textContent = row.indices.length + ' original frames';
  const note = document.createElement('small');
  note.textContent = row.playable ? '✓ In the playable experiment' : 'Preview only · coming later';
  detail.append(name, count, note);
  card.append(canvas, detail);
  cards.append(card);
  previews.push({ row, canvas, ctx: canvas.getContext('2d') });
}
function render() {
  for (const { row, canvas, ctx } of previews) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const x = canvas.width / 2, y = canvas.height / 2 + 30;
    ctx.fillStyle = '#496582';
    ctx.fillRect(35, 90, canvas.width - 70, 2);
    drawActivitySprite(ctx, atlas, row.key, frameCounter,
      { x, y, scale: 2.25 });
  }
}
function animate(now) {
  const fps = Number(speed.value);
  if (last === 0) last = now;
  if (playing) {
    pending += Math.min(120, now - last);
    while (pending >= 1000 / fps) {
      frameCounter++;
      pending -= 1000 / fps;
    }
  }
  last = now;
  render();
  requestAnimationFrame(animate);
}
toggle.addEventListener('click', () => {
  playing = !playing;
  toggle.textContent = playing ? '⏸ Pause animation' : '▶ Play animation';
  toggle.setAttribute('aria-pressed', String(!playing));
});
if (!playing) toggle.textContent = '▶ Play animation';
async function boot() {
  try {
    atlas = await loadCharacterAtlas();
    for (const activity of CHARACTER_ACTIVITIES) {
      const row = atlas.rows.get(activity.key);
      if (row) createPreview(row);
    }
    status.textContent = previews.length + ' action cycles · '
      + atlas.layout.width + '×' + atlas.layout.height + 'px frames · original CC0';
    gallery.setAttribute('aria-busy', 'false');
    requestAnimationFrame(animate);
  } catch (error) {
    gallery.setAttribute('aria-busy', 'false');
    status.textContent = 'The Lix character sheet could not be loaded: ' + error.message;
    console.error(error);
  }
}
boot();
