// Builds the website into website/dist. `--serve` rebuilds on change and serves it locally.
import { context, build } from 'esbuild';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'dist');
const serve = process.argv.includes('--serve');
const { version } = JSON.parse(await readFile(join(here, '..', 'package.json'), 'utf8'));
const STATIC = ['index.html', 'styles.css', 'favicon.svg', 'registry/buoy.tsx'];

// A shadcn registry item, so `npx shadcn add https://buoy-ui.vercel.app/r/buoy.json` installs
// buoy-ui with the project's package manager and adds components/ui/buoy.tsx.
async function writeRegistry() {
  const item = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'buoy',
    type: 'registry:ui',
    title: 'Buoy',
    description: 'A morphing island for notifications, promises, background tasks and live activities.',
    dependencies: [`buoy-ui@^${version}`],
    files: [{ path: 'registry/buoy.tsx', type: 'registry:ui', content: await readFile(join(here, 'registry', 'buoy.tsx'), 'utf8') }],
    docs: 'Render <Buoy /> once near the root, then call buoy() from anywhere. Docs: https://buoy-ui.vercel.app',
  };
  await mkdir(join(out, 'r'), { recursive: true });
  await writeFile(join(out, 'r', 'buoy.json'), `${JSON.stringify(item, null, 2)}\n`);
}

async function copyStatic() {
  const html = await readFile(join(here, 'index.html'), 'utf8');
  await writeFile(join(out, 'index.html'), html.replaceAll('{{version}}', version));
  await copyFile(join(here, 'styles.css'), join(out, 'styles.css'));
  await copyFile(join(here, 'favicon.svg'), join(out, 'favicon.svg'));
  await writeRegistry();
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await copyStatic();

const options = {
  entryPoints: [join(here, 'main.ts')],
  outfile: join(out, 'main.js'),
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: !serve,
  sourcemap: serve,
  logLevel: 'info',
};

if (serve) {
  const ctx = await context(options);
  await ctx.watch();
  for (const file of STATIC) watch(join(here, file), () => copyStatic().catch(console.error));
  const { port } = await ctx.serve({ servedir: out, port: 4173 });
  console.log(`Site running at http://localhost:${port}`);
} else {
  await build(options);
}
