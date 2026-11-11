import { defineConfig } from 'tsup';

const shared = { target: 'es2019', sourcemap: true } as const;

export default defineConfig([
  // React entry: <Buoy /> + buoy(). Marked as a client module for React Server Components.
  {
    ...shared,
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    external: ['react', 'react-dom'],
    banner: { js: "'use client';" },
  },
  // Framework-free entry: buoy() + mount().
  {
    ...shared,
    entry: { vanilla: 'src/vanilla.ts' },
    format: ['esm', 'cjs'],
    dts: true,
  },
  // <script> tag build: window.Buoy = { buoy, mount, styles }.
  {
    entry: { buoy: 'src/iife.ts' },
    format: ['iife'],
    globalName: 'Buoy',
    target: 'es2019',
    minify: true,
  },
]);
