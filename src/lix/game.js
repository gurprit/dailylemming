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
export const EXIT_ANIMATION_TICKS = 14;
export const PLAYABLE_SKILLS = Object.freeze(['builder', 'blocker', 'basher', 'digger', 'miner', 'platformer', 'jumper', 'walker', 'runner', 'climber', 'floater']);
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
    if (this.hatches.length < 1 || this.goals.length < 1)
      throw new Error('A level requires at least one hatch and one goal');
    if (!PLAYABLE_SKILLS.some(skill => (level.skills[skill.toUpperCase()] || 0) > 0))
      throw new Error('This experiment requires at least one supported skill');
    this.reset();
  }

  reset() {
    // Resetting restores the original map, erasing all previous bridge pixels.
    this.terrain = composeLixLevel(this.level, this.images).terrain;
    this.remaining = Object.fromEntries(PLAYABLE_SKILLS.map(skill => [
      skill, this.level.skills[skill.toUpperCase()] === -1
        ? -1 : Math.max(0, this.level.skills[skill.toUpperCase()] || 0)
    ]));
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
    // Permanent blockers stay behind as volunteers. Once all other Lix
    // have resolved and the rescue quota is reached, don't run down the
    // entire level clock waiting for a Blocker to vanish.
    return this.spawned === this.initial
      && this.units.every(u => u.state === 'saved' || u.state === 'lost'
        || (u.state === 'blocker' && this.saved >= this.required));
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
  hasSkill(skill) { return this.remaining[skill] === -1 || this.remaining[skill] > 0; }
  useSkill(skill) { if (this.remaining[skill] > 0) this.remaining[skill]--; }
  assignBuilder(index = 0) { return this.assignSkill('builder', index); }
  assignSkill(skill, index = 0) {
    if (!PLAYABLE_SKILLS.includes(skill)) return false;
    const u = this.units[index];
    if (this.done || !u || !this.hasSkill(skill)) return false;
    // Continuous staircases can queue extra builder assignments.
    if (skill === 'builder' && u.state === 'builder') {
      this.saveCheckpoint();
      this.useSkill('builder');
      this.assigned++;
      u.queuedBuilders = (u.queuedBuilders || 0) + 1;
      this.emit('queued', u, String(u.queuedBuilders));
      return true;
    }
    // Persistent traits are assigned to active Lix, even during a fall.
    const trait = ['runner','climber','floater'].includes(skill);
    const turning = skill === 'walker';
    if ((!trait && !turning && (u.state !== 'walking' || !u.grounded))
      || (turning && !['walking','blocker','runner'].includes(u.state))
      || (trait && ['saved','lost','exiting','blocker'].includes(u.state)))
      return false;
    this.saveCheckpoint();
    this.useSkill(skill);
    this.assigned++;
    if (trait) {
      u[skill] = true;
      this.emit('assigned', u, skill);
      return true;
    }
    if (turning) {
      u.state = 'walking';
      u.vx *= -1;
      u.grounded = true;
      this.emit('assigned', u, skill);
      return true;
    }
    u.vy = skill === 'jumper' ? -10 : 0;
    u.actionTicks = 0;
    if (skill === 'builder') {
      u.state = 'builder';
      u.buildTicks = 0;
      u.buildSteps = 0;
      u.queuedBuilders = 0;
    } else {
      u.state = skill === 'jumper' ? 'jumping' : skill;
      if (skill === 'platformer') {u.platformSteps=0;u.platformTicks=0;}
      if (skill === 'jumper') {u.jumpTicks=0;u.grounded=false;}
    }
    this.emit('assigned', u, skill);
    return true;
  }
  spawn() {
    // Native tutorial levels sometimes have multiple entrances. Distribute
    // the stream round-robin; undo deterministically restores spawned count.
    const hatch = this.hatches[this.spawned % this.hatches.length];
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

  // Blockers hold their ground, redirecting walkers that approach.
  // They can be undone with the existing checkpoint controls.
  stepBlocker(u) {
    u.grounded = true;
    // Keep animation phase local to this unit: the initial blocker pose plays
    // once, then its own idle cycle loops independently of world time.
    u.actionTicks = (u.actionTicks || 0) + 1;
  }
  stepBasher(u) {
    u.actionTicks++;
    if (u.actionTicks % 3 !== 1) return;
    const direction = Math.sign(u.vx) || 1;
    const x = Math.round(u.x + direction * 6);
    const left = direction > 0 ? x : x - 11;
    let removable = false, steel = false;
    for (let yy = Math.round(u.y) - 25; yy < u.y; yy++) {
      for (let xx = left; xx < left + 12; xx++) {
        const i = this.terrain.index(xx, yy);
        if (i < 0) continue;
        if (this.terrain.steel[i]) steel = true;
        else if (this.terrain.solid(xx, yy)) removable = true;
      }
    }
    if (steel || !removable) {
      u.state = 'walking';
      if (steel) u.vx *= -1;
      this.emit(steel ? 'basher-steel' : 'basher-finished', u);
      return;
    }
    this.terrain.digRect(left, Math.round(u.y) - 25, 12, 25);
    this.changed = true;
    u.x = clamp(u.x + direction * 2, 1, this.width - 2);
    this.emit('bashed', u);
  }
  stepDigger(u) {
    u.actionTicks++;
    if (u.actionTicks % 4 !== 1) return;
    const x = Math.round(u.x), y = Math.round(u.y);
    let steel = false, ground = false;
    for (let xx = x - 6; xx < x + 7; xx++) for (let yy = y + 1; yy <= y + 4; yy++) {
      const i = this.terrain.index(xx, yy);
      if (i < 0) continue;
      if (this.terrain.steel[i]) steel = true;
      else if (this.terrain.solid(xx, yy)) ground = true;
    }
    if (steel || !ground) {
      u.state = steel ? 'walking' : 'falling';
      u.grounded = Boolean(steel);
      u.vy = steel ? 0 : 4;
      this.emit(steel ? 'digger-steel' : 'digger-finished', u);
      return;
    }
    this.terrain.digRect(x - 6, y + 1, 13, 4);
    this.changed = true;
    u.y += 2;
    this.emit('dug', u);
  }
  stepExiting(u) {
    // Keep the creature visible for the authentic 14-tick Lix exiter cycle.
    // Only increase saved AFTER the cycle finishes, so the victory dialog
    // cannot obscure the little celebratory escape animation.
    u.exitTicks++;
    if (u.exitTicks < EXIT_ANIMATION_TICKS) return;
    u.state = 'saved';
    this.saved++;
    this.emit('saved', u);
  }

  // Miner chips a descending diagonal tunnel. Every three physics updates
  // the character carves non-steel pixels just ahead and beneath its feet.
  // This is browser-adapter gameplay, not a byte-perfect Lix skill replay.
  stepMiner(u) {
    u.actionTicks++;
    if (u.actionTicks % 3 !== 1) return;
    const facing = Math.sign(u.vx) || 1;
    const nearX = Math.round(u.x + facing * 3);
    const left = facing > 0 ? nearX : nearX - 11;
    const top = Math.round(u.y) - 4;
    let removable = false, steel = false;
    for (let yy = top; yy < top + 15; yy++) {
      for (let xx = left; xx < left + 12; xx++) {
        const i = this.terrain.index(xx, yy);
        if (i < 0) continue;
        if (this.terrain.steel[i]) steel = true;
        else if (this.terrain.solid(xx, yy)) removable = true;
      }
    }
    if (steel || !removable) {
      u.state = steel ? 'walking' : 'falling';
      u.grounded = Boolean(steel);
      u.vy = steel ? 0 : 4;
      this.emit(steel ? 'miner-steel' : 'miner-finished', u);
      return;
    }
    this.terrain.digRect(left, top, 12, 15);
    this.changed = true;
    u.x = clamp(u.x + facing * 2, 1, this.width - 2);
    u.y += 2;
    u.grounded = false;
    // Original Lix Miner sheet has a repeating pick swing. Only signal
    // visible dirt impact once every 12 ticks, not every 3-tick terrain cut.
    this.emit('mined', u, (u.actionTicks - 1) % 12 === 0 ? 'impact' : 'scrape');
  }

  stepPlatformer(u) {
    // Flat bridge: no ascent, contrasting with Builder's stepped staircase.
    u.platformTicks++;
    if (u.platformTicks % 8 === 1) {
      const x = u.vx > 0 ? Math.round(u.x) : Math.round(u.x - 12);
      if (this.terrain.solid(u.x + u.vx * 4, u.y - 13)) {
        u.state = 'walking';u.vx*=-1;this.emit('platformer-blocked',u);return;
      }
      this.terrain.paintRect(x, Math.round(u.y) + 1, 12, 2,[237,190,107,255]);
      this.changed=true;u.platformSteps++;
      this.emit('platform',u,String(u.platformSteps));
    }
    if (u.platformTicks % 8 === 4 || u.platformTicks % 8 === 6)
      u.x = clamp(u.x + u.vx * 2,1,this.width-2);
    if (u.platformSteps >= 12 && u.platformTicks % 8 === 7) {
      u.state='walking';u.grounded=true;this.emit('platformer-finished',u);
    }
  }
  stepJumper(u) {
    u.jumpTicks++;
    const step = Math.max(2, u.runner ? 4 : 3);
    const nextX = clamp(u.x + Math.sign(u.vx || 1)*step,1,this.width-2);
    if (!this.terrain.solid(nextX,u.y-6)) u.x=nextX;
    u.y += u.vy;
    u.vy = Math.min(9,u.vy+2);
    if(u.vy>=0){
      const land=this.landingY(u.x,u.y,u.y+Math.max(1,u.vy));
      if(land!==null){
        u.y=land;u.vy=0;u.fall=0;u.grounded=true;u.state='walking';
        this.emit('landed',u);return;
      }
    }
    if (u.jumpTicks>28){u.state='falling';u.vy=4;}
  }
  stepClimber(u) {
    const edge=u.x+Math.sign(u.vx || 1)*3;
    // Climb vertically until the wall ceases at head/feet height.
    u.y-=3;u.actionTicks=(u.actionTicks||0)+1;
    if(!this.terrain.solid(edge,u.y-3)){
      u.x=clamp(edge,1,this.width-2);
      u.grounded=true;u.state='walking';this.emit('climbed',u);
    } else if(u.actionTicks>100){
      u.state='falling';u.vy=4;
    }
  }

  // Native walkers can climb small lips rather than flip at each tiny slope.
  // Steeper terrain reverses their direction. Free fall is vertical.
  stepWalker(u) {
    const nextX = u.x + Math.sign(u.vx || 1) * (u.runner ? 4 : 2);
    if (nextX < 1 || nextX >= this.width - 1) {
      u.vx *= -1;
      return;
    }
    if (this.units.some(other => other !== u && other.state === 'blocker'
        && Math.abs(nextX - other.x) <= 8 && Math.abs(u.y - other.y) <= 15)) {
      u.vx *= -1;
      this.emit('blocked', u);
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
      if (!stepHeight && u.climber) {
        u.state='climbing';u.actionTicks=0;u.grounded=false;
        this.emit('climbing',u);return;
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
    const step = u.floater ? Math.min(3,Math.max(2,u.vy || 2))
      : Math.min(8, Math.max(4, u.vy || 4));
    const landing = this.landingY(u.x, oldY + 1, oldY + step + 1);
    if (landing !== null) {
      u.fall += Math.max(0, landing - oldY);
      u.y = landing;
      u.vy = 0;
      u.grounded = true;
      if (!u.floater && u.fall > MAX_SAFE_FALL) {
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
      u.vy = u.floater ? 3 : clamp(step + 1, 4, 8);
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
      if (u.state === 'exiting') { this.stepExiting(u); continue; }
      if (u.state === 'builder') this.stepBuilder(u);
      else if (u.state === 'blocker') this.stepBlocker(u);
      else if (u.state === 'basher') this.stepBasher(u);
      else if (u.state === 'digger') this.stepDigger(u);
      else if (u.state === 'miner') this.stepMiner(u);
      else if (u.state === 'platformer') this.stepPlatformer(u);
      else if (u.state === 'jumping') this.stepJumper(u);
      else if (u.state === 'climbing') this.stepClimber(u);
      else if (u.state === 'walking') this.stepWalker(u);
      else if (u.state === 'spawning' || u.state === 'falling') this.stepFaller(u);
      if (u.state === 'lost') continue;
      if (this.inGoal(u)) {
        u.state = 'exiting';
        u.exitTicks = 0;
        u.exitOriginY = u.y;
        this.emit('exit-started', u);
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
      skills: { ...this.remaining },
      exiting: this.units.filter(u => u.state === 'exiting').length,
      paused: this.paused, started: this.started, done: this.done, won: this.won };
  }
}
