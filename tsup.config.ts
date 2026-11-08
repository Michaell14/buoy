import { defineConfig } from 'tsup';

const shared = { target: 'es2019', sourcemap: true } as const;

export default defineConfig([
  // React entry: <Atoll /> + atoll(). Marked as a client module for React Server Components.
  {
    ...shared,
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    external: ['react'],
    banner: { js: "'use client';" },
  },
  // Framework-free entry: atoll() + mount().
  {
    ...shared,
    entry: { vanilla: 'src/vanilla.ts' },
    format: ['esm', 'cjs'],
    dts: true,
  },
  // <script> tag build: window.Atoll = { atoll, mount, styles }.
  {
    entry: { atoll: 'src/iife.ts' },
    format: ['iife'],
    globalName: 'Atoll',
    target: 'es2019',
    minify: true,
  },
]);
