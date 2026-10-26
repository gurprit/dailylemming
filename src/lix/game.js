// Experimental Lix gameplay adapter. Original CC0 map and pixel terrain;
// character timings are provisional and still require comparison with Lix replays.
import { composeLixLevel } from './terrain.js';

export const TICK_MS = 1000 / 30;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));

export class LixGameModel {
  constructor(level, decodedImages, { maxSeconds = 300 } = {}) {
    this.level = level;
    this.images = decodedImages;
    this.width = level.numeric.SIZE_X;
    this.height = level.numeric.SIZE_Y;
    this.limit = maxSeconds * 30;
    this.baseGadgets = composeLixLevel(level, decodedImages).gadgets;
    this.hatches = this.baseGadgets.filter(g => g.kind === 'hatch');
    this.goals = this.baseGadgets.filter(g => g.kind === 'goal');
    this.hazards = this.baseGadgets.filter(g => g.kind === 'hazard');
    if (this.hatches.length !== 1 || this.goals.length < 1)
      throw new Error('This experiment requires exactly one hatch and one or more goals');
    if (!('BUILDER' in level.skills) || level.skills.BUILDER < 1)
      throw new Error('This prototype requires the builder skill');
    this.reset();
  }
  reset() {
    this.terrain = composeLixLevel(this.level, this.images).terrain;
    this.remaining = { builder: Math.max(0, this.level.skills.BUILDER) };
    this.units = [];
    this.spawned = 0;
    this.saved = 0;
    this.lost = 0;
    this.assigned = 0;
    this.ticks = 0;
    this.paused = true;
    this.started = false;
    this.done = false;
    this.won = false;
    this.changed = true;
  }
  get initial() { return this.level.numeric.INITIAL; }
  get required() { return this.level.numeric.REQUIRED; }
  get seconds() { return Math.floor(this.ticks / 30); }
  get readyToFinish() { return this.spawned === this.initial && this.units.every(u => u.state === 'saved' || u.state === 'lost'); }
  togglePause() {
    if (this.done) return;
    if (this.paused) this.started = true;
    this.paused = !this.paused;
  }
  assignBuilder(index = 0) {
    const u = this.units[index];
    if (!u || u.state === 'saved' || u.state === 'lost' || !this.remaining.builder
      || u.state === 'builder') return false;
    this.remaining.builder--;
    this.assigned++;
    u.state = 'builder';
    u.buildTicks = 0;
    u.buildSteps = 0;
    u.vy = 0;
    return true;
  }
  spawn() {
    const hatch = this.hatches[0];
    const w = hatch.imageData.width;
    const h = hatch.imageData.height;
    const u = {
      x: hatch.x + Math.round(w / 2),
      y: hatch.y + h - 2,
      vx: 1,
      vy: 0,
      fall: 0,
      grounded: false,
      state: 'walking',
      buildTicks: 0,
      buildSteps: 0
    };
    this.units.push(u);
    this.spawned++;
  }
  // Avoid falling through one-pixel bridges by sweeping across the whole foot path.
  landingY(x, from, to) {
    for (let y = Math.floor(from); y <= Math.ceil(to) + 1; y++) {
      if (this.terrain.solid(x, y)) return y - 1;
    }
    return null;
  }
  inGoal(u) {
    return this.goals.some(g => {
      const w = g.imageData.width, h = g.imageData.height;
      return u.x >= g.x + 2 && u.x <= g.x + w - 2
        && u.y >= g.y && u.y <= g.y + Math.max(h, 50) + 4;
    });
  }
  inHazard(u) {
    return this.hazards.some(g => {
      const w = g.imageData.width, h = g.imageData.height;
      if (g.image.endsWith('.W')) {
        return u.x >= g.x && u.x < g.x + w && u.y >= g.y + 1 && u.y <= g.y + Math.max(h, 12);
      }
      // A provisional trap bounding box, pending Lix trigger-area metadata.
      return u.x >= g.x + 4 && u.x < g.x + Math.max(8, w - 4)
        && u.y >= g.y + 4 && u.y <= g.y + Math.max(8, h - 4);
    });
  }
  stepBuilder(u) {
    if (++u.buildTicks % 5 !== 0) return;
    // An eight-pixel step rising four pixels, retaining a collision surface.
    const nx = u.x + u.vx * 8;
    const ny = u.y - 4;
    const left = Math.min(u.x, nx);
    this.terrain.paintRect(left, ny, 9, 5, [232, 183, 105, 255]);
    this.changed = true;
    u.x = nx; u.y = ny; u.vy = 0; u.fall = 0; u.grounded = true;
    if (++u.buildSteps === 12 || nx < 2 || nx >= this.width - 2) u.state = 'walking';
  }
  stepWalker(u) {
    const candidateX = u.x + u.vx * 1.3;
    if (candidateX < 1 || candidateX >= this.width - 1) {
      u.vx *= -1;
    } else {
      // Turn back at a solid wall too steep for a 4-pixel step.
      const ahead = this.terrain.solid(candidateX, u.y - 5);
      if (ahead) {
        let canStep = false;
        for (let s = 1; s <= 4; s++) {
          if (!this.terrain.solid(candidateX, u.y - s - 5)
            && !this.terrain.solid(candidateX, u.y - s - 1)) {
            u.y -= s; canStep = true; break;
          }
        }
        if (canStep) u.x = candidateX;
        else u.vx *= -1;
      } else u.x = candidateX;
    }
    if (this.terrain.solid(u.x, u.y + 1)) {
      u.vy = 0; u.fall = 0; u.grounded = true;
      return;
    }
    // Step down small changes in terrain without bouncing.
    for (let step = 2; step <= 4 && u.grounded; step++) {
      if (this.terrain.solid(u.x, u.y + step)) {
        u.y += step - 1;
        u.vy = 0; u.fall = 0;
        return;
      }
    }
    const oldY = u.y;
    u.vy = clamp(u.vy + 0.38, 0, 4);
    const nextY = oldY + u.vy;
    const landing = this.landingY(u.x, oldY + 1, nextY);
    if (landing !== null) {
      u.fall = 0; u.vy = 0; u.grounded = true; u.y = landing;
    } else {
      u.y = nextY; u.fall += u.vy; u.grounded = false;
    }
  }
  tick() {
    if (this.done || this.paused) return;
    this.ticks++;
    // Lix timing approximation: convert ~50 source frames to 30Hz simulation.
    const interval = Math.max(1, Math.round((this.level.numeric.SPAWN_INTERVAL || 30) * 30 / 60));
    if (this.spawned < this.initial && this.ticks % interval === 1) this.spawn();
    for (const u of this.units) {
      if (u.state === 'lost' || u.state === 'saved') continue;
      if (u.state === 'builder') this.stepBuilder(u);
      else this.stepWalker(u);
      if (this.inGoal(u)) { u.state = 'saved'; this.saved++; continue; }
      if (this.inHazard(u) || u.y > this.height + 10 || u.fall > 110) {
        u.state = 'lost'; this.lost++;
      }
    }
    if (this.readyToFinish || this.ticks >= this.limit
      || this.lost > this.initial - this.required) {
      this.done = true; this.paused = true;
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
