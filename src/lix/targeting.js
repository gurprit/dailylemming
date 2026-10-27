// Shared desktop-hover and touch-tap targeting for the Lix skill adapter.
// Draw the same target that receives the selected skill; never highlight a
// fallen, exiting, unavailable or otherwise ineligible creature.
export function selectableUnit(unit, skill, remaining = {}) {
  if (!unit || !remaining?.[skill]) return false;
  if (skill === 'builder' && unit.state === 'builder') return true;
  return unit.state === 'walking' && unit.grounded === true;
}
export function unitAtPoint(units, x, y, skill, remaining, radius = 25) {
  let candidate = -1, best = Infinity;
  units.forEach((unit, i) => {
    if (!selectableUnit(unit, skill, remaining)) return;
    const d = Math.hypot(x - unit.x, y - (unit.y - 10));
    if (d <= radius && d < best) { candidate = i; best = d; }
  });
  return candidate;
}
export function drawUnitTarget(ctx, unit) {
  const cx = Math.round(unit.x), cy = Math.round(unit.y - 13);
  const halfWidth = 12, halfHeight = 18, arm = 6;
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#a6ffd4';
  ctx.shadowColor = '#6af6aa';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
    const x = cx + dx * halfWidth, y = cy + dy * halfHeight;
    ctx.moveTo(x - dx * arm, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y - dy * arm);
  }
  ctx.stroke();
  ctx.restore();
}
