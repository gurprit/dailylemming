// Lix Cutbit sprite-grid convention, ported from LixD src/graphic/cutbit.d.
// The outer grid is one pixel thick, and each cell is separated by one pixel.
// We inspect the original RGBA pixels BEFORE removing magenta colour keys.

export function detectLixFrames(source) {
  const { width, height, data } = source;
  if (!Number.isInteger(width) || !Number.isInteger(height)
      || width < 1 || height < 1 || data.length !== width * height * 4)
    throw new Error('Invalid spritesheet dimensions or data');
  const pixelEquals = (ax, ay, bx, by) => {
    const a = (ay * width + ax) * 4;
    const b = (by * width + bx) * 4;
    for (let i = 0; i < 4; i++) if (data[a + i] !== data[b + i]) return false;
    return true;
  };
  const single = { width, height, columns: 1, rows: 1, grid: false };
  if (width < 3 || height < 3
      || !pixelEquals(0, 0, 0, 1)
      || !pixelEquals(0, 0, 1, 0)
      || pixelEquals(0, 0, 1, 1)) return single;
  let cellWidth = width;
  let cellHeight = height;
  for (let x = 2; x < width; x++) if (pixelEquals(x, 1, 0, 0)) {
    cellWidth = x - 1; break;
  }
  for (let y = 2; y < height; y++) if (pixelEquals(1, y, 0, 0)) {
    cellHeight = y - 1; break;
  }
  const columns = Math.max(1, Math.floor((width - 1) / (cellWidth + 1)));
  const rows = Math.max(1, Math.floor((height - 1) / (cellHeight + 1)));
  return columns > 1 || rows > 1
    ? { width: cellWidth, height: cellHeight, columns, rows, grid: true }
    : single;
}

export function cutLixFrame(source, layout, frameIndex = 0) {
  const { width: frameWidth, height: frameHeight, columns, rows, grid } = layout;
  if (!Number.isInteger(frameIndex) || frameIndex < 0 || frameIndex >= columns * rows)
    throw new Error('Invalid spritesheet frame index');
  const fromX = grid ? 1 + (frameIndex % columns) * (frameWidth + 1) : 0;
  const fromY = grid ? 1 + Math.floor(frameIndex / columns) * (frameHeight + 1) : 0;
  const out = new Uint8ClampedArray(frameWidth * frameHeight * 4);
  for (let y = 0; y < frameHeight; y++) for (let x = 0; x < frameWidth; x++) {
    const from = ((fromY + y) * source.width + fromX + x) * 4;
    const to = (y * frameWidth + x) * 4;
    out.set(source.data.subarray(from, from + 4), to);
    // Lix's legacy transparent colour key: pure bright magenta.
    if (out[to] >= 250 && out[to + 1] <= 6 && out[to + 2] >= 250)
      out[to + 3] = 0;
  }
  return { width: frameWidth, height: frameHeight, data: out };
}
