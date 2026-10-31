import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyGamesJsonPlugin() {
  return {
    name: 'copy-games-json',
    writeBundle(options) {
      const outDir = options.dir || path.resolve(__dirname, 'dist');
      const srcJson = path.resolve(__dirname, 'games.json');
      const destJson = path.resolve(outDir, 'games.json');
      if (fs.existsSync(srcJson)) {
        fs.copyFileSync(srcJson, destJson);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [copyGamesJsonPlugin()],
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
