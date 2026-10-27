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


// A shallow visible waterline at the foot of the canvas. The backdrop above
// remains behind terrain, but this strip ensures the blue water continues
// across the entire screen instead of appearing as one isolated animated tile.
export function drawWaterline(ctx, gadgets, ticks, width, height, stripHeight = 14) {
  const water = gadgets.find(g => g.kind === 'hazard' && g.sourceImage?.endsWith('.W'));
  if (!water) return false;
  const sprite = gadgetDrawable(water, ticks);
  if (!(sprite.width > 0 && sprite.height > 0)) return false;
  const h = Math.min(Math.round(stripHeight), sprite.height, height);
  if (h <= 0) return false;
  const top = height - h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, top, width, h);
  ctx.clip();
  for (let x = 0; x < width; x += sprite.width)
    ctx.drawImage(sprite, 0, 0, sprite.width, h, x, top, sprite.width, h);
  ctx.restore();
  return true;
}
