import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

/**
 * GitHub Pages has no server-side routing: opening /justsplit/expenses directly
 * would 404 because no such file exists. Pages serves 404.html for any unknown
 * path, so shipping a copy of index.html under that name boots the app and lets
 * React Router read the URL as normal.
 */
function githubPagesSpaFallback() {
  return {
    name: 'github-pages-spa-fallback',
    apply: 'build' as const,
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist');
      const index = path.join(dist, 'index.html');
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.join(dist, '404.html'));
      }
    },
  };
}

// On GitHub Pages the app is served from /<repo-name>/, not the domain root.
// `npm run dev` and the tests keep the plain '/' base.
const base = process.env.GITHUB_PAGES === 'true' ? '/justsplit/' : '/';

export default defineConfig({
  base,
  plugins: [react(), githubPagesSpaFallback()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    rollupOptions: {
      // recover.html is a standalone page that reads whatever a phone still
      // holds from the deleted databases; it must not boot the app.
      input: {
        main: path.resolve(__dirname, 'index.html'),
        recover: path.resolve(__dirname, 'recover.html'),
      },
      output: {
        // Split the big, rarely-changing dependencies into their own chunks so
        // app edits do not invalidate them in the browser cache. Matched by
        // package rather than listed as entries: the list form also drags each
        // entry's small dependencies along, so a helper the Button uses pulled
        // all of Radix and the animation library into every first load.
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          if (/\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run\/router)\//.test(id)) return 'react';
          // Its own chunk so recover.html loads Supabase and nothing of the app.
          if (id.includes('/node_modules/@supabase/')) return 'supabase';
          if (/\/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion';
          // Radix and the rest are left to Rollup, which splits them by which
          // screens actually use them.
          return undefined;
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
  },
});
