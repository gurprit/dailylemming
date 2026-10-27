// Remove the opaque near-black exterior of each original Lix character
// frame, without erasing isolated dark eyes and interior line work.
// Grid borders are not character pixels and are never flood filled into.
export function keyBlackBackground(image, layout, threshold = 10) {
  const { width, height, data } = image;
  if (!layout?.grid || !Number.isInteger(layout.columns) || !Number.isInteger(layout.rows))
    throw new Error('Expected the original Lix Cutbit character frame grid');
  let removed = 0;
  const { width: fw, height: fh } = layout;
  const visited = new Uint8Array(fw * fh);
  const queue = new Int32Array(fw * fh);
  const isBlack = (x, y) => {
    const n = ((1 + y + Math.floor(y / fh) * 0) * width + x) * 4;
    return n; // unused: per-frame coordinates are calculated below
  };
  for (let row = 0; row < layout.rows; row++) for (let col = 0; col < layout.columns; col++) {
    visited.fill(0);
    const left = 1 + col * (fw + 1), top = 1 + row * (fh + 1);
    const offset = p => ((top + Math.floor(p / fw)) * width + left + p % fw) * 4;
    const dark = p => {
      const i = offset(p);
      return data[i + 3] >= 96 && data[i] <= threshold
        && data[i + 1] <= threshold && data[i + 2] <= threshold;
    };
    let head = 0, tail = 0;
    const push = p => {
      if (!visited[p] && dark(p)) { visited[p] = 1; queue[tail++] = p; }
    };
    for (let x = 0; x < fw; x++) { push(x); push((fh - 1) * fw + x); }
    for (let y = 0; y < fh; y++) { push(y * fw); push(y * fw + fw - 1); }
    while (head < tail) {
      const p = queue[head++], x = p % fw, y = Math.floor(p / fw);
      data[offset(p) + 3] = 0;
      removed++;
      if (x > 0) push(p - 1);
      if (x + 1 < fw) push(p + 1);
      if (y > 0) push(p - fw);
      if (y + 1 < fh) push(p + fw);
    }
  }
  return removed;
}
