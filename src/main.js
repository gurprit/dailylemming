import { Game } from './game.js';
import { LEVELS } from './levels.js';
import { utcDay, dayNumber, indexForDay, readProgress, saveResult, streak, shareText } from './daily.js';

const day = utcDay();
const dayIndex = Math.max(0, dayNumber(day));
const level = LEVELS[indexForDay(day, LEVELS.length)];
const byId = id => document.getElementById(id);
const fmt = seconds => String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')
  + ':' + String(Math.max(0, seconds) % 60).padStart(2, '0');

byId('today-label').textContent = day + ' · UTC CHALLENGE';
byId('chapter').textContent = "TODAY'S ESCAPE · #" + (dayIndex + 1);
byId('day-tag').textContent = String(dayIndex + 1).padStart(3, '0');
byId('level-title').textContent = level.title;
byId('level-subtitle').textContent = level.subtitle;
byId('difficulty').textContent = level.difficulty.toUpperCase();
byId('total').textContent = '/' + level.total;
byId('required').textContent = level.required;

const skillList = [
  { id: 'builder', icon: '🧱', label: 'Builder' },
  { id: 'basher', icon: '⛏️', label: 'Basher' },
  { id: 'digger', icon: '🕳️', label: 'Digger' },
  { id: 'blocker', icon: '🛑', label: 'Blocker' }
];
let selected = skillList.find(s => level.skills[s.id] > 0)?.id || 'builder';
let finalResult = null;
let instance;
let lastSkillSignature = '';

function message(value) { byId('message').textContent = value; }
function renderRecord() {
  const progress = readProgress();
  byId('streak').textContent = String(streak(progress, day));
  const today = progress[day];
  if (today) {
    byId('record-title').textContent = today.won ? 'Escape accomplished!' : 'Keep trying!';
    byId('record-copy').textContent = 'First run: ' + today.first.saved + '/' + today.first.total
      + ' rescued in ' + fmt(today.first.seconds) + '. Best run: '
      + today.best.saved + '/' + today.best.total + ' rescued in '
      + fmt(today.best.seconds) + '. Your original result stays on record.';
  }
}
function showSkills(state) {
  // Replacing buttons every physics tick swallowed clicks during normal play.
  // Rebuild only when available skills or the selection actually changes.
  const signature = selected + '|' + skillList.map(s => state.skills[s.id]).join('|');
  if (signature === lastSkillSignature) return;
  lastSkillSignature = signature;
  const parent = byId('skills');
  parent.replaceChildren();
  for (const skill of skillList) {
    const count = state.skills[skill.id];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'skill-button';
    button.disabled = count < 1;
    button.setAttribute('aria-pressed', String(selected === skill.id && count > 0));
    button.setAttribute('aria-label', skill.label + ': ' + count + ' available');
    const icon = document.createElement('span');
    icon.className = 'skill-icon'; icon.textContent = skill.icon;
    const copy = document.createElement('span');
    copy.className = 'skill-text';
    const name = document.createElement('b'); name.textContent = skill.label;
    const quantity = document.createElement('small'); quantity.textContent = count + ' left';
    copy.append(name, quantity);
    button.append(icon, copy);
    button.addEventListener('click', () => {
      selected = skill.id;
      instance.setSkill(skill.id);
      showSkills({ skills: instance.skills });
      message(skill.label + ' selected. Tap a creature to assign it.');
    });
    parent.append(button);
  }
}
function update(state) {
  byId('saved').textContent = state.saved;
  byId('time').textContent = fmt(state.limit - state.seconds);
  byId('used').textContent = String(state.used);
  byId('pause').textContent = !state.started ? '▶ Start game'
    : state.paused && !state.done ? '▶ Resume' : '⏸ Pause';
  byId('speed').textContent = '⏩ ' + state.speed + '× Speed';
  if (!state.skills[selected]) {
    selected = skillList.find(skill => state.skills[skill.id] > 0)?.id || selected;
  }
  showSkills(state);
}
function finish(result) {
  finalResult = result;
  saveResult(day, result);
  renderRecord();
  byId('result-title').textContent = result.won ? 'They made it!' : 'Not quite home.';
  byId('result-symbol').textContent = result.won ? '✦' : '↻';
  byId('result-description').textContent = result.won
    ? 'You rescued enough wanderers to complete today’s escape. One little victory!'
    : 'Those tiny legs could use another strategy. You can give it another go.';
  byId('result-saved').textContent = result.saved + '/' + result.total;
  byId('result-used').textContent = String(result.used);
  byId('result-time').textContent = fmt(result.seconds);
  byId('result-overlay').hidden = false;
  byId('share').focus();
}
instance = new Game(byId('game'), level, { update, finish, message });
instance.setSkill(selected);
renderRecord();

function restart() {
  byId('result-overlay').hidden = true;
  finalResult = null;
  instance.reset();
  instance.setSkill(selected);
  message('Practice again! Your first run remains recorded.');
}
byId('restart').addEventListener('click', restart);
byId('again').addEventListener('click', restart);
byId('close').addEventListener('click', () => { byId('result-overlay').hidden = true; });
byId('pause').addEventListener('click', () => instance.togglePause());
byId('speed').addEventListener('click', () => instance.toggleSpeed());
byId('share').addEventListener('click', async () => {
  if (!finalResult) return;
  const text = shareText(day, finalResult, dayIndex);
  try {
    if (navigator.share) await navigator.share({ text });
    else if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      byId('share').textContent = 'Copied! ✓';
    } else {
      message(text);
      byId('result-description').textContent = text;
    }
  } catch (error) {
    if (error?.name !== 'AbortError') {
      byId('result-description').textContent = 'Sharing was unavailable on this device.';
    }
  }
});
window.addEventListener('keydown', event => {
  if (byId('result-overlay').hidden === false) {
    if (event.key === 'Escape') byId('result-overlay').hidden = true;
    return;
  }
  if (event.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (event.code === 'Space') { event.preventDefault(); instance.togglePause(); }
  if (event.key.toLowerCase() === 'r') restart();
  const index = Number(event.key) - 1;
  if (index >= 0 && index < skillList.length && instance.skills[skillList[index].id] > 0) {
    selected = skillList[index].id;
    instance.setSkill(selected);
    showSkills({ skills: instance.skills });
  }
});
window.addEventListener('pagehide', () => instance.stop());
