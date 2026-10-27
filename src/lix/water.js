// Little Bridge's decorative water backdrop. Draw behind solid terrain so
// water spans the entire bottom, without overlaying land as a tiny blue tile.
// Physical water trigger remains the map's authored gadget and is unchanged.
import { gadgetDrawable } from './render.js';

export function drawWaterBackdrop(ctx, gadgets, ticks, width, height) {
  const water = gadgets.find(g => g.kind === 'hazard' && g.sourceImage?.endsWith('.W'));
  if (!water) return false;
  const sprite = gadgetDrawable(water, ticks);
  const cellWidth = sprite.width || water.imageData.width;
  const cellHeight = sprite.height || water.imageData.height;
  if (!Number.isFinite(cellWidth) || cellWidth < 1 || !Number.isFinite(cellHeight)
      || cellHeight < 1) return false;
  const top = Math.max(0, Math.min(height, water.y));
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, width, height - top);
  ctx.clip();
  for (let x = 0; x < width; x += cellWidth) {
    ctx.drawImage(sprite, x, top);
  }
  ctx.restore();
  return true;
}
