import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

test('mobile game has an accessible map zoom control and scrollable playfield', () => {
  const html = read('index.html');
  const player = read('src/lix/play.js');
  assert.match(html, /id="map-zoom"[^>]*aria-pressed="true"/);
  assert.match(html, /\.experiment-view\.is-fit canvas\{width:100%\}/);
  assert.match(html, /touch-action:pan-x pan-y/);
  assert.match(player, /landscape\.width \+ 'px'/);
  assert.match(player, /mapZoomed = !mapZoomed/);
  assert.match(player, /syncMapZoom\(\)/);
});

test('touch swipes do not trigger an accidental skill assignment', () => {
  const player = read('src/lix/play.js');
  assert.match(player, /function assignAtPointer\(event\)/);
  assert.match(player, /canvas\.addEventListener\('pointerup'/);
  assert.match(player, /Math\.hypot\(event\.clientX - starting\.x, event\.clientY - starting\.y\) > 12/);
  assert.match(player, /canvas\.addEventListener\('pointercancel'/);
});
