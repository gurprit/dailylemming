// Keep the rendering contract independent from the asset decoder.
// composeLixLevel currently stores an array of canvases, whereas the decoder
// itself stores {canvas, data} frame records. Both formats are accepted.
export function gadgetDrawable(gadget, ticks = 0) {
  const frames = gadget?.frames;
  const i = Array.isArray(frames) && frames.length
    ? Math.floor(Math.max(0, ticks) / 5) % frames.length
    : -1;
  const candidate = i < 0 ? gadget?.image : frames[i];
  const drawable = candidate?.canvas ?? candidate;
  if (!drawable) throw new Error('Missing drawable Lix gadget sprite: ' +
    (gadget?.sourceImage || gadget?.image || 'unknown'));
  return drawable;
}
