// A pause-only planning aid. Geometry is an estimate: real Lix skill
// animation/steel interaction is still verified separately in simulation.
export function projectBuilder(terrain, unit, steps = 12) {
  if (!unit || !['walking', 'builder'].includes(unit.state)) return null;
  const facing = unit.vx >= 0 ? 1 : -1;
  const bricks = [];
  for (let i = 0; i < steps; i++) {
    const footX = unit.x + facing * 4 * i;
    const footY = unit.y - 2 * i;
    const checkX = Math.round(footX + facing * 4);
    const checkY = Math.round(footY - 16);
    if (terrain.solid(checkX, checkY)) {
      const at = terrain.index(checkX, checkY);
      return { bricks, blocked: { x: checkX, y: checkY,
        steel: at >= 0 && Boolean(terrain.steel[at]) } };
    }
    bricks.push({ x: facing > 0 ? footX : footX - 10, y: footY + 2,
      width: 12, height: 2 });
  }
  return { bricks, blocked: null };
}
