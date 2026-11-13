// Type-checks the React samples on the examples page (examples/code/*.react.txt) against the package
// source, so a sample that drifts from the API fails the site build. Each sample is copied into
// examples/.check as a .tsx file, next to app.d.ts, the pretend app the samples call into.
//   node website/examples/check-samples.mjs
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, '.check');
await rm(dir, { recursive: true, force: true });
await mkdir(dir);
const samples = (await readdir(join(here, 'code'))).filter((file) => file.endsWith('.react.txt'));
for (const file of samples) await copyFile(join(here, 'code', file), join(dir, file.replace('.react.txt', '.tsx')));
await copyFile(join(here, 'app.d.ts'), join(dir, 'app.d.ts'));
await writeFile(
  join(dir, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'Bundler',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        // The samples import the package by name, as an app would.
        paths: { 'buoy-ui': ['../../../src/index.ts'] },
      },
      include: ['*.tsx', 'app.d.ts'],
    },
    null,
    2,
  ),
);
try {
  execFileSync(join(here, '..', '..', 'node_modules', '.bin', 'tsc'), ['-p', dir], { stdio: 'inherit' });
  console.log(`${samples.length} React samples type-check.`);
} catch {
  console.error('A React sample on the examples page does not type-check. The file names above are its copy in examples/.check: fix examples/code/<name>.react.txt.');
  process.exitCode = 1;
}
