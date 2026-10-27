// Lightweight purely visual soil chips, decoupled from deterministic physics.
// Uses a supplied random generator for testability. No particles on steel.
const EARTH = ['#d8ad76','#a97a55','#e5c189','#765339','#c89966'];
export class DirtParticles {
  constructor(random = Math.random) {
    this.random = random;
    this.items = [];
    this.max = 160;
  }
  clear() { this.items.length = 0; }
  burst(type, x, y, facing = 1) {
    if (!['dug','mined','bashed'].includes(type)) return;
    const count = type === 'dug' ? 8 : type === 'mined' ? 10 : 8;
    for (let n = 0; n < count; n++) {
      const r = this.random, sideways = r() * 2 - 1;
      const backward = type === 'mined' ? -Math.sign(facing || 1) : type === 'bashed' ? -Math.sign(facing || 1) * .6 : 0;
      this.items.push({
        x: x + (r() - .5) * 8, y: y + (type === 'dug' ? 0 : type === 'bashed' ? -10 : -5),
        vx: (sideways * (type === 'bashed' ? 36 : 26) + backward * (18 + r() * 45)),
        vy: -(type === 'bashed' ? 24 + r() * 60 : 42 + r() * 70),
        life: .30 + r() * .30, maxLife: .6,
        size: r() < .65 ? 2 : 3,
        color: EARTH[Math.floor(r() * EARTH.length)]
      });
    }
    if (this.items.length > this.max) this.items.splice(0, this.items.length - this.max);
  }
  update(seconds) {
    const dt = Math.max(0, Math.min(.05, seconds || 0));
    if (!dt) return;
    for (const p of this.items) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.vx *= 1 - 1.7 * dt;
      p.life -= dt;
    }
    this.items = this.items.filter(p => p.life > 0);
  }
  draw(ctx) {
    ctx.save();
    for (const p of this.items) {
      ctx.globalAlpha = Math.min(1, Math.max(0, p.life / .24));
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.restore();
  }
}
