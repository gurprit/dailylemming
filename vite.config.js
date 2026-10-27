import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages project sites are served at /dailylemming/, not /.
  base: process.env.DAILY_LEMMING_BASE || '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        lab: resolve(process.cwd(), 'lab.html'),
        playLix: resolve(process.cwd(), 'play-lix.html'),
        sprites: resolve(process.cwd(), 'sprites.html')
      }
    }
  }
});
