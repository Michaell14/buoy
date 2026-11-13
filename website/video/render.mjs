// Records the launch videos: walls of real islands, and one island going through every state.
// Each frame is drawn on a clock the recorder steps, so the motion is exact at 60 fps.
// Needs Playwright with Chromium, and ffmpeg on the PATH.
//   node website/video/render.mjs              all three
//   node website/video/render.mjs dark light   some of them
// The videos are written to website/video/out.
import { execFileSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, 'dist');
const out = join(here, 'out');
const FPS = 60;

/** Each video: its page, how long it runs, the page size in CSS pixels and the scale it is drawn at. */
const VIDEOS = {
  // Drifting columns on charcoal, with a blur-and-refocus beat near the start.
  dark: { page: 'wall.html?look=dark', seconds: 14, width: 1200, height: 900, scale: 1.2, warmup: 9000 },
  // The same wall on the site's light ground, laid back in perspective, ending on the wordmark.
  light: { page: 'wall.html?look=light&tilt=1&end=1', seconds: 14, width: 1200, height: 900, scale: 1.2, warmup: 9000 },
  // One large island through every state, with the call that made each one, ending on the install command.
  one: { page: 'hero.html', seconds: 24, width: 576, height: 432, scale: 2.5, warmup: 1000 },
};

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('This needs Playwright: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(VIDEOS);
for (const name of names) {
  if (!(name in VIDEOS)) {
    console.error(`No video called "${name}". Pick from: ${Object.keys(VIDEOS).join(', ')}`);
    process.exit(1);
  }
}

// website/live.ts drives the site's one island. Here every island has its own store, so its import
// of the package is swapped for a shim that sends each call to the island being set up.
await mkdir(dist, { recursive: true });
await build({
  entryPoints: { wall: join(here, 'wall.ts'), hero: join(here, 'hero.ts') },
  outdir: dist,
  bundle: true,
  format: 'iife',
  target: 'es2022',
  logLevel: 'warning',
  plugins: [
    {
      name: 'buoy-shim',
      setup(b) {
        b.onResolve({ filter: /^\.\.\/src\/vanilla$/ }, (args) =>
          args.importer.endsWith(join('website', 'live.ts')) ? { path: join(here, 'shim.ts') } : null,
        );
      },
    },
  ],
});
for (const page of ['wall.html', 'hero.html']) await copyFile(join(here, page), join(dist, page));
await copyFile(join(here, '..', 'styles.css'), join(dist, 'site.css'));
await mkdir(out, { recursive: true });

// The pages load Geist from Google Fonts; go through a proxy when the environment has one.
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ proxy });
try {
  for (const name of names) {
    const v = VIDEOS[name];
    const [file, search = ''] = v.page.split('?');
    const url = `${pathToFileURL(join(dist, file)).href}?${search ? `${search}&` : ''}seconds=${v.seconds}`;
    const frames = await mkdtemp(join(tmpdir(), 'buoy-video-'));
    try {
      const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, deviceScaleFactor: v.scale });
      page.on('pageerror', (e) => console.error(`${name}: ${e.message}`));
      // A fixed morning, so the clocks in the islands read the same on every run.
      await page.clock.install({ time: new Date('2026-01-15T09:41:00') });
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.clock.pauseAt(new Date('2026-01-15T09:42:00'));
      // Let every island get into its loop before the first frame. Animations are followed from
      // their start, so the first frame shows them where they should be.
      for (let t = 0; t < v.warmup; t += 50) {
        await page.evaluate(() => window.__tick(0));
        await page.clock.runFor(50);
      }
      const count = Math.round(v.seconds * FPS);
      for (let i = 0; i < count; i++) {
        await page.clock.runFor(1000 / FPS);
        await page.evaluate((ms) => window.__tick(ms), (i * 1000) / FPS);
        await page.screenshot({ path: join(frames, `${String(i).padStart(5, '0')}.png`) });
        if (i % 120 === 0) console.log(`${name}: frame ${i} of ${count}`);
      }
      await page.close();
      const file = join(out, `buoy-${name}.mp4`);
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, '%05d.png'),
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '17',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', file], { stdio: 'inherit' });
      console.log(`Wrote ${file}`);
    } finally {
      await rm(frames, { recursive: true, force: true });
    }
  }
} finally {
  await browser.close();
}
