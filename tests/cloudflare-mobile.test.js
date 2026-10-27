import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fitMapScale, mapTouchGeometry, zoomMapAtFingers, MAX_MAP_SCALE } from '../src/lix/map-zoom.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('Cloudflare serves the complete Vite build as static assets', () => {
  const config = JSON.parse(read('wrangler.jsonc'));
  assert.equal(config.name, 'daily-lemming');
  assert.equal(config.assets.directory, './dist');
  assert.equal(config.assets.html_handling, 'auto-trailing-slash');
  assert.ok(!config.assets.not_found_handling,
    'the multi-page game should not route missing files back to index.html');
  const packageJson = JSON.parse(read('package.json'));
  assert.match(packageJson.scripts.build, /lix:vendor:first/);
  assert.match(packageJson.scripts.deploy, /wrangler deploy/);
  assert.ok(packageJson.devDependencies.wrangler);
  assert.match(read('vite.config.js'), /index\.html/);
  assert.match(read('vite.config.js'), /daily\.html/);
});

test('mobile canvas handles its own touch gestures without zooming the entire page', () => {
  const html = read('index.html');
  const player = read('src/lix/play.js');
  assert.match(html, /id="map-zoom"[^>]*aria-pressed="true"/);
  assert.match(html, /touch-action:none/);
  assert.match(html, /Pinch to zoom/);
  assert.match(html, /@media\(max-width:660px\), \(pointer:coarse\)/);
  assert.match(player, /canvas\.style\.width = \(landscape\.width \* mapScale\)/);
  assert.match(player, /zoomMapAtFingers\(/);
  assert.match(player, /viewport\.scrollLeft = target\.left/);
  assert.match(player, /viewport\.scrollTop = target\.top/);
  assert.match(player, /function assignAtPointer\(event\)/);
  assert.match(player, /canvas\.setPointerCapture\?\.\(event\.pointerId\)/);
  assert.match(player, /canvas\.addEventListener\('pointerup'/);
  assert.match(player, /canvas\.addEventListener\('pointercancel'/);
  assert.match(player, /tapCandidate = null/);
});

test('pinch zoom holds the world point under the fingers', () => {
  assert.equal(fitMapScale(512, 320), 0.625);
  const centre = mapTouchGeometry({ x: 100, y: 60 }, { x: 200, y: 60 });
  assert.deepEqual(centre, { x: 150, y: 60, distance: 100 });
  const view = zoomMapAtFingers({
    startScale: 1, startDistance: 100, worldX: 200, worldY: 100,
    first: { x: 50, y: 60 }, second: { x: 250, y: 60 },
    mapWidth: 512, viewportWidth: 320
  });
  assert.deepEqual(view, { scale: 2, left: 250, top: 140 });
  const pan = zoomMapAtFingers({
    startScale: 2, startDistance: 100, worldX: 200, worldY: 100,
    first: { x: 100, y: 120 }, second: { x: 200, y: 120 },
    mapWidth: 512, viewportWidth: 320
  });
  assert.deepEqual(pan, { scale: 2, left: 250, top: 80 });
});

test('pinch zoom clamps to fit scale and 4x native pixels', () => {
  const args = {
    startScale: 1, startDistance: 100, worldX: 90, worldY: 90,
    mapWidth: 512, viewportWidth: 320
  };
  const smaller = zoomMapAtFingers({
    ...args, first: { x: 0, y: 0 }, second: { x: 20, y: 0 }
  });
  assert.equal(smaller.scale, 0.625);
  const larger = zoomMapAtFingers({
    ...args, first: { x: 0, y: 0 }, second: { x: 1000, y: 0 }
  });
  assert.equal(larger.scale, MAX_MAP_SCALE);
});

test('game keeps the record and credits but removes technical explanatory boxes', () => {
  const html = read('index.html'), player = read('src/lix/play.js');
  assert.match(html, /Your daily or practice record/);
  assert.match(html, /id="source-link"/);
  for (const term of ['How to play', 'Drop into the adventure', 'id="level-intro"',
    'id="compat-warning"', 'A genuine Lovely community level',
    'Authentic Lix community puzzle']) {
    assert.ok(!html.includes(term), 'player page still includes: ' + term);
  }
  assert.doesNotMatch(player, /el\('level-intro'\)/);
  assert.doesNotMatch(player, /el\('compat-warning'\)/);
});
