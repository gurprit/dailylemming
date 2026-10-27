// Experimental Lix adapter. Source maps and pixel collisions are genuine
// Lix; skill timing and walking are progressively aligned with native rules.
// Not yet a byte-perfect substitute for the original game's replay engine.
import { composeLixLevel } from './terrain.js';
import { gadgetTrigger, insideTrigger } from './gadgets.js';

// LixD: ticksPerSecond=60, phyusPerSecondAtNormalSpeed=15.
// One browser physics update is one Lix physics update.
export const PHYSICS_HZ = 15;
export const TICK_MS = 1000 / PHYSICS_HZ;
export const BUILDER_STEPS = 12;
const STEP_TICKS = 16;
const MAX_SAFE_FALL = 126;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export class LixGameModel {
  constructor(level, decodedImages, { maxSeconds = 300 } = {}) {
    this.level = level;
    this.images = decodedImages;
    this.width = level.numeric.SIZE_X;
    this.height = level.numeric.SIZE_Y;
    this.limit = maxSeconds * PHYSICS_HZ;
    this.baseGadgets = composeLixLevel(level, decodedImages).gadgets;
    this.hatches = this.baseGadgets.filter(g => g.kind === 'hatch');
    this.goals = this.baseGadgets.filter(g => g.kind === 'goal');
    this.hazards = this.baseGadgets.filter(g => g.kind === 'hazard');
    if (this.hatches.length !== 1 || this.goals.length < 1)
      throw new Error('This experiment requires exactly one hatch and at least one goal');
    if (!Number.isInteger(level.skills.BUILDER) || level.skills.BUILDER < 1)
      throw new Error('This experiment requires at least one builder');
    this.reset();
  }

  reset() {
    // Resetting restores the original map, erasing all previous bridge pixels.
    this.terrain = composeLixLevel(this.level, this.images).terrain;
    this.remaining = { builder: this.level.skills.BUILDER };
    this.units = [];
    this.spawned = this.saved = this.lost = this.assigned = this.ticks = 0;
    this.paused = true;
    this.started = this.done = this.won = false;
    this.changed = true;
    this.events = [];
    this.history = [];
  }
  get initial() { return this.level.numeric.INITIAL; }
  get required() { return this.level.numeric.REQUIRED; }
  get seconds() { return Math.floor(this.ticks / PHYSICS_HZ); }
  get readyToFinish() {
    return this.spawned === this.initial
      && this.units.every(u => u.state === 'saved' || u.state === 'lost');
  }
  emit(type, unit, detail = '') {
    this.events.push({ type, tick: this.ticks,
      x: Math.round(unit.x), y: Math.round(unit.y), detail });
  }
  togglePause() {
    if (this.done) return;
    if (this.paused) this.started = true;
    this.paused = !this.paused;
  }
  stepOnce() {
    // Pause-and-step is useful for precise, touch-friendly skill timing.
    if (!this.paused || this.done) return false;
    this.started = true;
    this.paused = false;
    this.tick();
    this.paused = true;
    return true;
  }
  get undoAvailable() { return !this.done && this.history.length > 0; }
  saveCheckpoint() {
    // The first puzzle has at most five assignments. Save only the modified
    // pixel buffer, not duplicate image/steel data or potentially huge art.
    this.history.push({
      pixels: this.terrain.pixels.slice(),
      units: this.units.map(u => ({ ...u })),
      remaining: { ...this.remaining },
      spawned: this.spawned, saved: this.saved, lost: this.lost,
      assigned: this.assigned, ticks: this.ticks,
      eventsLength: this.events.length, started: this.started
    });
  }
  undoBuilder() {
    if (!this.undoAvailable) return false;
    const before = this.history.pop();
    this.terrain.pixels.set(before.pixels);
    this.units = before.units.map(u => ({ ...u }));
    this.remaining = { ...before.remaining };
    this.spawned = before.spawned;
    this.saved = before.saved;
    this.lost = before.lost;
    this.assigned = before.assigned;
    this.ticks = before.ticks;
    this.events.length = before.eventsLength;
    this.started = before.started;
    this.done = false;
    this.won = false;
    this.paused = true;
    this.changed = true;
    return true;
  }
  assignBuilder(index = 0) {
    const u = this.units[index];
    // Lix builder assignments can be queued while the current 12-brick
    // staircase is in progress. This extends it without wasting an action.
    if (this.done || !u || !this.remaining.builder) return false;
    if (u.state === 'builder') {
      this.saveCheckpoint();
      this.remaining.builder--;
      this.assigned++;
      u.queuedBuilders = (u.queuedBuilders || 0) + 1;
      this.emit('queued', u, String(u.queuedBuilders));
      return true;
    }
    // A falling Lix cannot conjure a staircase in mid-air.
    if (u.state !== 'walking' || !u.grounded) return false;
    this.saveCheckpoint();
    this.remaining.builder--;
    this.assigned++;
    u.state = 'builder';
    u.buildTicks = 0;
    u.buildSteps = 0;
    u.queuedBuilders = 0;
    u.vy = 0;
    this.emit('assigned', u, 'builder');
    return true;
  }
  spawn() {
    const hatch = this.hatches[0];
    const point = gadgetTrigger(hatch);
    const u = { x: point.x, y: point.y,
      vx: hatch.flags?.includes('r') ? -1 : 1, vy: 0, fall: 0,
      grounded: false, state: 'spawning', buildTicks: 0, buildSteps: 0 };
    this.units.push(u);
    this.spawned++;
    this.emit('spawn', u);
  }
  landingY(x, from, to) {
    for (let y = Math.floor(from); y <= Math.ceil(to); y++)
      if (this.terrain.solid(x, y)) return y - 1;
    return null;
  }
  inGoal(u) {
    const foot = { x: u.x, y: u.y };
    return this.goals.some(g => insideTrigger(foot, gadgetTrigger(g)));
  }
  inHazard(u) {
    const foot = { x: u.x, y: u.y };
    return this.hazards.some(g => insideTrigger(foot, gadgetTrigger(g)));
  }

  stepBuilder(u) {
    const phase = u.buildTicks++ % STEP_TICKS;
    if (phase === 1) {
      // LixD builder: 12 bricks, each brick 12px wide, 2px high.
      // The older experimental version rose 4px and travelled 8px at once,
      // allowing unrealistic giant staircases.
      const x = u.vx > 0 ? u.x : u.x - 10;
      const y = u.y + 2;
      // Halt on steel or a solid obstacle at head height.
      if (this.terrain.solid(u.x + u.vx * 4, u.y - 16)) {
        u.state = 'walking';
        u.vx *= -1;
        this.emit('builder-blocked', u);
        return;
      }
      this.terrain.paintRect(x, y, 12, 2, [237, 190, 107, 255]);
      this.changed = true;
      u.y -= 2;
      u.buildSteps++;
      this.emit('brick', u, String(u.buildSteps));
    }
    if (phase === 12 || phase === 13) {
      u.x += u.vx * 2; // Two short forward movements per brick.
      u.x = clamp(u.x, 1, this.width - 2);
    }
    if (phase === 15 && u.buildSteps >= BUILDER_STEPS) {
      if (u.queuedBuilders > 0) {
        u.queuedBuilders--;
        u.buildTicks = 0;
        u.buildSteps = 0;
        this.emit('builder-continued', u);
      } else {
        u.state = 'walking';
        u.grounded = false;
        u.vy = 0;
        this.emit('builder-finished', u);
      }
    }
  }

  // Native walkers can climb small lips rather than flip at each tiny slope.
  // Steeper terrain reverses their direction. Free fall is vertical.
  stepWalker(u) {
    const nextX = u.x + u.vx * 2;
    if (nextX < 1 || nextX >= this.width - 1) {
      u.vx *= -1;
      return;
    }
    const obstacle = this.terrain.solid(nextX, u.y - 2)
      || this.terrain.solid(nextX, u.y - 5);
    if (obstacle) {
      let stepHeight = 0;
      for (let rise = 1; rise <= 6; rise++) {
        if (!this.terrain.solid(nextX, u.y - rise)
          && !this.terrain.solid(nextX, u.y - rise - 5)
          && this.terrain.solid(nextX, u.y - rise + 2)) {
          stepHeight = rise;
          break;
        }
      }
      if (!stepHeight) {
        u.vx *= -1;
        this.emit('turned', u);
        return;
      }
      u.y -= stepHeight;
    }
    u.x = nextX;
    if (this.terrain.solid(u.x, u.y + 1)
      || this.terrain.solid(u.x, u.y + 2)) {
      u.vy = u.fall = 0;
      u.grounded = true;
      return;
    }
    // Step down a short ledge instead of bouncing into fall state.
    for (let drop = 3; drop <= 6; drop++) {
      if (this.terrain.solid(u.x, u.y + drop)) {
        u.y += drop - 1;
        u.vy = u.fall = 0;
        u.grounded = true;
        return;
      }
    }
    u.grounded = false;
    u.state = 'falling';
    u.vy = 4;
    this.emit('falling', u);
  }
  stepFaller(u) {
    const oldY = u.y;
    const step = Math.min(8, Math.max(4, u.vy || 4));
    const landing = this.landingY(u.x, oldY + 1, oldY + step + 1);
    if (landing !== null) {
      u.fall += Math.max(0, landing - oldY);
      u.y = landing;
      u.vy = 0;
      u.grounded = true;
      if (u.fall > MAX_SAFE_FALL) {
        u.state = 'lost';
        this.lost++;
        this.emit('splatted', u);
      } else {
        u.fall = 0;
        u.state = 'walking';
        this.emit('landed', u);
      }
    } else {
      u.y += step;
      u.fall += step;
      u.vy = clamp(step + 1, 4, 8);
      u.grounded = false;
    }
  }
  tick() {
    if (this.done || this.paused) return;
    this.ticks++;
    const interval = Math.max(1, this.level.numeric.SPAWN_INTERVAL || 30);
    if (this.spawned < this.initial && (this.ticks - 1) % interval === 0) this.spawn();
    for (const u of this.units) {
      if (u.state === 'saved' || u.state === 'lost') continue;
      if (u.state === 'builder') this.stepBuilder(u);
      else if (u.state === 'walking') this.stepWalker(u);
      else if (u.state === 'spawning' || u.state === 'falling') this.stepFaller(u);
      if (u.state === 'lost') continue;
      if (this.inGoal(u)) {
        u.state = 'saved'; this.saved++;
        this.emit('saved', u);
      } else if (this.inHazard(u) || u.y > this.height + 12) {
        u.state = 'lost'; this.lost++;
        this.emit('drowned', u);
      }
    }
    if (this.readyToFinish || this.ticks >= this.limit
        || this.lost > this.initial - this.required) {
      this.done = true;
      this.paused = true;
      this.won = this.saved >= this.required;
    }
  }
  snapshot() {
    return { spawned: this.spawned, saved: this.saved, lost: this.lost,
      total: this.initial, required: this.required, used: this.assigned,
      seconds: this.seconds, builder: this.remaining.builder,
      paused: this.paused, started: this.started, done: this.done, won: this.won };
  }
}
