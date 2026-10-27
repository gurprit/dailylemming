// Geometry for touch-first zooming. Kept independent of the DOM so that
// pinch, pan and zoom bounds can be tested without a browser.
export const MAX_MAP_SCALE = 4;

export function fitMapScale(mapWidth, viewportWidth) {
  if (!(mapWidth > 0) || !(viewportWidth > 0)) return 1;
  return Math.min(MAX_MAP_SCALE, viewportWidth / mapWidth);
}

// Fill the available height in portrait so there is no blank strip beneath
// the artwork. Wider maps are cropped horizontally and remain pannable.
export function coverMapScale(mapWidth, mapHeight, viewportWidth, viewportHeight) {
  if (!(mapWidth > 0) || !(mapHeight > 0)
      || !(viewportWidth > 0) || !(viewportHeight > 0)) return 1;
  return Math.min(MAX_MAP_SCALE, Math.max(
    viewportWidth / mapWidth, viewportHeight / mapHeight
  ));
}

export function mapTouchGeometry(first, second) {
  const x = (first.x + second.x) / 2;
  const y = (first.y + second.y) / 2;
  const distance = Math.hypot(second.x - first.x, second.y - first.y);
  return { x, y, distance };
}

export function zoomMapAtFingers({
  startScale, startDistance, worldX, worldY, first, second, mapWidth, viewportWidth
}) {
  const midpoint = mapTouchGeometry(first, second);
  const minimum = fitMapScale(mapWidth, viewportWidth);
  const scale = Math.max(minimum, Math.min(MAX_MAP_SCALE,
    startScale * (midpoint.distance / Math.max(1, startDistance))));
  return {
    scale,
    left: worldX * scale - midpoint.x,
    top: worldY * scale - midpoint.y
  };
}
