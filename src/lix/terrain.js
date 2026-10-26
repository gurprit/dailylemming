// Pixel terrain for the Lix browser experiment. 1 output pixel = 1 source level pixel.
// No rectangles or geometry invented from a level's source tile positions.
export const COLOR_KEY = Object.freeze({ r: 255, g: 0, b: 255 });
export function isVisiblePixel(r, g, b, a) {
  // Historic Lix art can contain #ff00ff colour-key pixels.
  return a >= 96 && !(r >= 250 && g <= 6 && b >= 250);
}
export function transformPoint(x, y, width, height, flags = '') {
  // Flip vertically first, then 90-degree clockwise turns, per Lix format.
  let xx = x, yy = flags.includes('f') ? height - 1 - y : y;
  let w = width, h = height;
  for (let i = 0; i < ((flags.match(/r/g) || []).length % 4); i++) {
    [xx, yy] = [h - 1 - yy, xx];
    [w, h] = [h, w];
  }
  return { x: xx, y: yy, width: w, height: h };
}
export function transformedSize(w, h, flags = '') {
  const turns = (flags.match(/r/g) || []).length % 4;
  return turns % 2 ? { width: h, height: w } : { width: w, height: h };
}
export class PixelTerrain {
  constructor(width, height) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width * height > 3_000_000)
      throw new Error('Unsupported map dimensions');
    this.width = width;
    this.height = height;
    this.pixels = new Uint8ClampedArray(width * height * 4);
    this.steel = new Uint8Array(width * height);
  }
  index(x, y) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return -1;
    return y * this.width + x;
  }
  solid(x, y) {
    const i = this.index(Math.round(x), Math.round(y));
    return i >= 0 && this.pixels[i * 4 + 3] >= 96;
  }
  stamp(tile, imageData, { steel = false } = {}) {
    if (!imageData || imageData.width < 1 || imageData.height < 1 || !imageData.data)
      throw new Error('No image data for tile ' + tile.image);
    const { width, height, data } = imageData;
    const dark = tile.flags.includes('d');
    const noOverwrite = tile.flags.includes('n');
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      if (!isVisiblePixel(data[from], data[from + 1], data[from + 2], data[from + 3])) continue;
      const point = transformPoint(x, y, width, height, tile.flags);
      const i = this.index(point.x + tile.x, point.y + tile.y);
      if (i < 0) continue;
      const to = i * 4;
      if (dark) {
        if (!this.steel[i]) this.pixels.fill(0, to, to + 4);
      } else {
        if (noOverwrite && this.pixels[to + 3] >= 96) continue;
        this.pixels[to] = data[from];
        this.pixels[to + 1] = data[from + 1];
        this.pixels[to + 2] = data[from + 2];
        this.pixels[to + 3] = data[from + 3];
        if (steel) this.steel[i] = 1;
      }
    }
  }
  paintRect(x, y, w, h, color = [246, 198, 110, 255]) {
    const left = Math.max(0, Math.floor(x)), right = Math.min(this.width, Math.ceil(x + w));
    const top = Math.max(0, Math.floor(y)), bottom = Math.min(this.height, Math.ceil(y + h));
    for (let yy = top; yy < bottom; yy++) for (let xx = left; xx < right; xx++) {
      const i = this.index(xx, yy);
      if (this.steel[i]) continue;
      const p = i * 4;
      this.pixels.set(color, p);
    }
  }
  digRect(x, y, w, h) {
    const left = Math.max(0, Math.floor(x)), right = Math.min(this.width, Math.ceil(x + w));
    const top = Math.max(0, Math.floor(y)), bottom = Math.min(this.height, Math.ceil(y + h));
    for (let yy = top; yy < bottom; yy++) for (let xx = left; xx < right; xx++) {
      const i = this.index(xx, yy);
      if (!this.steel[i]) this.pixels.fill(0, i * 4, i * 4 + 4);
    }
  }
  async toImageData() {
    return new ImageData(new Uint8ClampedArray(this.pixels), this.width, this.height);
  }
}
export function expandTiles(tiles, groups, { depth = 0, stack = [], dx = 0, dy = 0 } = {}) {
  if (depth > 8) throw new Error('Lix nested tile groups exceed limit');
  const output = [];
  for (const tile of tiles) {
    if (tile.kind !== 'group') {
      output.push({ ...tile, x: tile.x + dx, y: tile.y + dy });
      continue;
    }
    if (tile.flags.includes('r') || tile.flags.includes('f'))
      throw new Error('Rotated tile group not supported: ' + tile.image);
    const name = tile.image.slice(6);
    if (stack.includes(name)) throw new Error('Recursive tile group: ' + name);
    const inside = groups[name];
    if (!inside) throw new Error('Missing group ' + name);
    output.push(...expandTiles(inside, groups, { depth: depth + 1,
      stack: [...stack, name], dx: dx + tile.x, dy: dy + tile.y }));
  }
  return output;
}
export function composeLixLevel(level, images) {
  const terrain = new PixelTerrain(level.numeric.SIZE_X, level.numeric.SIZE_Y);
  const ordered = expandTiles(level.tiles, level.groups);
  const gadgets = [];
  for (const tile of ordered) {
    const sprite = images.get(tile.image + '.png');
    if (!sprite) throw new Error('Missing required Lix image ' + tile.image + '.png');
    if (tile.kind === 'terrain' || tile.kind === 'steel') terrain.stamp(tile, sprite.data, { steel: tile.kind === 'steel' });
    else gadgets.push({
      ...tile,
      // A drawable Image/Canvas is not a string resource identifier.
      // Retain the Lix gadget asset name for water/trap classification.
      sourceImage: tile.image,
      imageData: sprite.data,
      image: sprite.canvas
    });
  }
  return { terrain, gadgets };
}
