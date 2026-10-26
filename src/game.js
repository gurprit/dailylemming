// Temporary original gameplay prototype. Replaceable via the future Lix-compatible engine adapter.
// No original Lemmings sprites, levels, audio, or code are bundled.
const W = 880, H = 360, FRAME = 40;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

export class Game {
  constructor(canvas, level, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.level = level;
    this.callbacks = callbacks;
    this.selected = 'builder';
    this.speed = 1;
    this.running = true;
    this.raf = null;
    this.frame = this.frame.bind(this);
    this.handlePointer = this.handlePointer.bind(this);
    canvas.addEventListener('pointerdown', this.handlePointer);
    this.reset();
    this.raf = requestAnimationFrame(this.frame);
  }
  reset() {
    this.terrain = this.level.terrain.map(t => ({ ...t }));
    this.skills = { ...this.level.skills };
    this.units = [];
    this.spawned = 0;
    this.saved = 0;
    this.lost = 0;
    this.used = 0;
    this.ticks = 0;
    this.acc = 0;
    this.last = 0;
    this.done = false;
    this.paused = false;
    this.running = true;
    this.emit();
  }
  setSkill(skill) { this.selected = skill; this.emit(); }
  togglePause() { if (!this.done) this.paused = !this.paused; this.emit(); }
  toggleSpeed() { this.speed = this.speed === 1 ? 2 : 1; this.emit(); }
  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerdown', this.handlePointer);
  }
  get seconds() { return Math.floor(this.ticks * FRAME / 1000); }
  emit() {
    this.callbacks.update?.({
      saved: this.saved, lost: this.lost, total: this.level.total,
      required: this.level.required, spawned: this.spawned,
      seconds: this.seconds, limit: this.level.limit, skills: { ...this.skills },
      used: this.used, paused: this.paused, speed: this.speed, done: this.done
    });
  }
  handlePointer(event) {
    if (this.done) return;
    const r = this.canvas.getBoundingClientRect();
    const x = (event.clientX - r.left) * W / r.width;
    const y = (event.clientY - r.top) * H / r.height;
    const range = Math.max(25, 24 * W / r.width);
    let closest = null, nearest = range;
    for (const unit of this.units) {
      if (unit.state !== 'walk' && unit.state !== 'builder'
          && unit.state !== 'basher' && unit.state !== 'digger') continue;
      const distance = Math.hypot(unit.x - x, unit.y - 12 - y);
      if (distance < nearest) { nearest = distance; closest = unit; }
    }
    if (!closest || !this.skills[this.selected]) {
      this.callbacks.message?.('Select an available skill and tap a wanderer.');
      return;
    }
    const names = { builder: 'builder', basher: 'basher', digger: 'digger', blocker: 'blocker' };
    const skill = names[this.selected];
    if (!skill) return;
    closest.state = skill;
    closest.taskTicks = 0;
    closest.remaining = { builder: 16, basher: 72, digger: 34, blocker: Infinity }[skill];
    closest.vy = 0;
    this.skills[skill]--;
    this.used++;
    this.callbacks.message?.(skill.charAt(0).toUpperCase() + skill.slice(1) + ' assigned!');
    this.emit();
  }
  solid(x, y) {
    return this.terrain.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
  }
  carve(x, y, w, h) {
    const next = [];
    for (const r of this.terrain) {
      const left = Math.max(x, r.x), right = Math.min(x + w, r.x + r.w);
      const top = Math.max(y, r.y), bottom = Math.min(y + h, r.y + r.h);
      if (right <= left || bottom <= top) { next.push(r); continue; }
      const parts = [
        { x: r.x, y: r.y, w: r.w, h: top - r.y },
        { x: r.x, y: bottom, w: r.w, h: r.y + r.h - bottom },
        { x: r.x, y: top, w: left - r.x, h: bottom - top },
        { x: right, y: top, w: r.x + r.w - right, h: bottom - top }
      ];
      for (const p of parts) if (p.w > 0 && p.h > 0) next.push({ ...p, art: r.art });
    }
    this.terrain = next;
  }
  stepUnit(unit) {
    if (unit.state === 'blocker') return;
    if (unit.state === 'builder') {
      unit.taskTicks++;
      if (unit.taskTicks % 5 === 0) {
        const oldX = unit.x;
        unit.x += unit.dir * 8;
        unit.y -= 3;
        this.terrain.push({ x: Math.min(oldX, unit.x) - 2,
          y: unit.y, w: 13, h: 5, art: 'bridge' });
        if (--unit.remaining <= 0) unit.state = 'walk';
      }
      return;
    }
    if (unit.state === 'basher') {
      this.carve(unit.dir > 0 ? unit.x + 2 : unit.x - 13, unit.y - 21, 12, 19);
      unit.x += 1.35 * unit.dir;
      if (--unit.remaining <= 0) unit.state = 'walk';
      return;
    }
    if (unit.state === 'digger') {
      if (unit.taskTicks++ % 3 === 0)
        this.carve(unit.x - 10, unit.y - 1, 20, 9);
      if (--unit.remaining <= 0) unit.state = 'walk';
    }
    if (!this.solid(unit.x, unit.y + 1)) {
      unit.vy = clamp(unit.vy + 0.43, 0, 5);
      unit.y += unit.vy;
      unit.fall += unit.vy;
      if (unit.landed && unit.fall > 85) { unit.state = 'lost'; this.lost++; return; }
    } else {
      while (this.solid(unit.x, unit.y) && unit.y > 0) unit.y--;
      unit.landed = true;
      unit.vy = 0;
      unit.fall = 0;
      const ahead = unit.x + unit.dir * 2;
      const blocked = this.units.some(other => other.state === 'blocker'
        && other !== unit && Math.abs(other.x - ahead) < 11
        && Math.abs(other.y - unit.y) < 20);
      if (blocked || this.solid(ahead, unit.y - 9)) unit.dir *= -1;
      else unit.x += 1.45 * unit.dir;
    }
    if (unit.x < 2 || unit.x > W - 2) unit.dir *= -1;
    if (unit.y > H + 20) { unit.state = 'lost'; this.lost++; return; }
    if (Math.abs(unit.x - this.level.exit.x) < 18
        && Math.abs(unit.y - this.level.exit.y) < 38) {
      unit.state = 'safe';
      this.saved++;
    }
  }
  tick() {
    if (this.done) return;
    this.ticks++;
    if (this.spawned < this.level.total && this.ticks % 32 === 1) {
      this.units.push({ x: this.level.spawn.x, y: this.level.spawn.y,
        vy: 0, dir: 1, fall: 0, landed: false, state: 'walk',
        taskTicks: 0, remaining: 0 });
      this.spawned++;
    }
    for (const unit of this.units) {
      if (unit.state !== 'lost' && unit.state !== 'safe') this.stepUnit(unit);
    }
    // Wait for the full group instead of ending as soon as the pass threshold is met.
    // This preserves the chance to rescue 100% and score every survivor.
    if (this.seconds >= this.level.limit
      || this.lost > this.level.total - this.level.required
      || (this.spawned === this.level.total
        && this.units.every(u => ['lost', 'safe', 'blocker'].includes(u.state))))
      this.finish(this.saved >= this.level.required);
    else this.emit();
  }
  finish(won) {
    if (this.done) return;
    this.done = true;
    this.paused = true;
    this.emit();
    this.callbacks.finish?.({ won, saved: this.saved, total: this.level.total,
      used: this.used, seconds: this.seconds });
  }
  frame(now) {
    if (!this.running) return;
    if (this.last === 0) this.last = now;
    const elapsed = Math.min(100, now - this.last);
    this.last = now;
    if (!this.paused) {
      this.acc += elapsed * this.speed;
      while (this.acc >= FRAME && !this.done) {
        this.tick();
        this.acc -= FRAME;
      }
    }
    this.draw();
    this.raf = requestAnimationFrame(this.frame);
  }
  draw() {
    const ctx = this.ctx, bounds = this.canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(bounds.width * dpr);
    const pixelHeight = Math.round(bounds.height * dpr);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth; this.canvas.height = pixelHeight;
    }
    ctx.setTransform(pixelWidth / W, 0, 0, pixelHeight / H, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#111832'); sky.addColorStop(1, '#253552');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#a6c1f0';
    for (let n = 0; n < 37; n++) {
      const x = (n * 137 + 23) % W, y = (n * 71 + 17) % 210;
      ctx.globalAlpha = 0.25 + ((n * 7) % 7) / 12;
      ctx.fillRect(x, y, n % 5 ? 2 : 3, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#1c2a44';
    for (let x = -90; x < W + 130; x += 154) {
      ctx.beginPath(); ctx.arc(x + 40, 305, 125, Math.PI, 0);
      ctx.fill();
    }
    for (const tile of this.terrain) {
      ctx.fillStyle = tile.art === 'bridge' ? '#f6b35e' : '#64415a';
      ctx.fillRect(tile.x, tile.y, tile.w, tile.h);
      ctx.fillStyle = tile.art === 'bridge' ? '#fbdca1' : '#87dd96';
      ctx.fillRect(tile.x, tile.y, tile.w, Math.min(5, tile.h));
      if (tile.h > 13 && tile.art !== 'bridge') {
        ctx.fillStyle = 'rgba(255,255,255,.085)';
        for (let i = tile.x + 18; i < tile.x + tile.w; i += 31)
          ctx.fillRect(i, tile.y + 12, 9, 3);
      }
    }
    const exit = this.level.exit;
    ctx.save();
    ctx.shadowColor = '#bdf9c7'; ctx.shadowBlur = 22;
    ctx.fillStyle = '#6cecbd'; ctx.fillRect(exit.x - 14, exit.y - 23, 28, 24);
    ctx.shadowBlur = 0; ctx.fillStyle = '#173e4e';
    ctx.fillRect(exit.x - 8, exit.y - 17, 16, 18);
    ctx.fillStyle = '#e5ffef'; ctx.font = 'bold 13px system-ui';
    ctx.textAlign = 'center'; ctx.fillText('EXIT', exit.x, exit.y - 33);
    ctx.restore();
    const hatch = this.level.spawn;
    ctx.fillStyle = '#fecb70'; ctx.fillRect(hatch.x - 14, hatch.y - 25, 28, 6);
    ctx.fillStyle = '#b4766c'; ctx.fillRect(hatch.x - 9, hatch.y - 19, 18, 8);
    for (const unit of this.units) {
      if (unit.state === 'lost' || unit.state === 'safe') continue;
      const x = Math.round(unit.x), y = Math.round(unit.y);
      ctx.save(); ctx.translate(x, y); ctx.scale(unit.dir, 1);
      if (unit.state === 'blocker') {
        ctx.globalAlpha = 0.23; ctx.fillStyle = '#f8ba88'; ctx.fillRect(-14, -19, 28, 20); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#d9e1ff'; ctx.fillRect(-5, -16, 10, 9);
      ctx.fillStyle = '#f4bc9a'; ctx.fillRect(-4, -15, 8, 8);
      ctx.fillStyle = '#61e6a7'; ctx.fillRect(-6, -20, 12, 6);
      ctx.fillStyle = '#399bca'; ctx.fillRect(-5, -8, 10, 6);
      ctx.fillStyle = '#cfd8fc'; ctx.fillRect(-5, -2, 4, 3); ctx.fillRect(2, -2, 4, 3);
      ctx.fillStyle = '#2b3446'; ctx.fillRect(2, -13, 2, 2);
      if (unit.state === 'builder') {
        ctx.fillStyle = '#f6b35e'; ctx.fillRect(5, -14, 8, 3);
      } else if (unit.state === 'basher') {
        ctx.fillStyle = '#fbdca1'; ctx.fillRect(5, -16, 9, 4);
      }
      ctx.restore();
    }
    if (this.paused && !this.done) {
      ctx.fillStyle = 'rgba(10,18,37,.65)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f3faf9'; ctx.font = 'bold 34px system-ui';
      ctx.textAlign = 'center'; ctx.fillText('PAUSED', W / 2, H / 2 - 2);
      ctx.font = '16px system-ui'; ctx.fillText('Tap a little wanderer to assign a skill', W / 2, H / 2 + 28);
    }
  }
}
