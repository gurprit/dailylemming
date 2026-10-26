import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages project sites are served at /dailylemming/, not at /.
  base: process.env.DAILY_LEMMING_BASE || '/'
});
