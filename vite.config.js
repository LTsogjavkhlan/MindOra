import { defineConfig } from 'vite';
import { resolve } from 'path';
import { tmpdir } from 'os';
import 'dotenv/config';

const apiPort = process.env.PORT || 3001;

export default defineConfig({
  cacheDir: resolve(tmpdir(), 'mindora-vite-cache'),
  server: {
    proxy: {
      '/api': `http://localhost:${apiPort}`,
    },
  },
  build: {
    // Hashed bundles go under /static so the server can cache them forever,
    // separate from the unhashed files copied as-is from public/ (assets/, js/).
    assetsDir: 'static',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        surgalt: resolve(__dirname, 'surgalt.html'),
        zuwluguu: resolve(__dirname, 'zuwluguu.html'),
        td: resolve(__dirname, 'TD.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
