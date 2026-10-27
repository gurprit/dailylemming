// Defaults match LixD src/tile/gadtile.d (per-frame gadget sizes).
// Optional custom trigger .txt overrides are a later compatibility milestone.
export function gadgetTrigger(g) {
  const { width: w, height: h } = g.imageData;
  switch (g.kind) {
    case 'hatch': return {
      x: g.x + Math.floor(w / 2) - (g.flags?.includes('r') ? 2 : 0),
      y: g.y + Math.max(20, h - 24)
    };
    case 'goal': return {
      x: g.x + Math.floor(w / 2) - 6,
      y: g.y + h - 8,
      width: 12, height: 12
    };
    case 'hazard': {
      if (g.sourceImage?.endsWith('.W')) {
        return { x: g.x, y: g.y + 20, width: w, height: Math.max(0, h - 20) };
      }
      if (g.sourceImage?.endsWith('.F')) {
        return { x: g.x, y: g.y, width: w, height: h + 12 };
      }
      return { x: g.x + Math.floor(w / 2) - 2,
        y: g.y + Math.floor(h * .8) - 3, width: 4, height: 6 };
    }
    default: return null;
  }
}
export function insideTrigger(foot, r, margin = 0) {
  return Boolean(r && foot.x >= r.x - margin && foot.x < r.x + r.width + margin
    && foot.y >= r.y - margin && foot.y < r.y + r.height + margin);
}
