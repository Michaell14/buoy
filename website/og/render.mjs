// Records preview.html into the link preview: og.mp4, the 6 second loop for og:video, and og.png,
// a still of the expanded card for og:image. Needs Playwright with Chromium, and ffmpeg on the PATH.
//   node website/og/render.mjs
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const FPS = 60;
const LOOP_MS = 6000;
/** The moment shown wherever the video doesn't play: the expanded card. */
const STILL_MS = 5500;

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('This needs Playwright: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const frames = await mkdtemp(join(tmpdir(), 'buoy-og-'));
// The page loads Geist from Google Fonts; go through a proxy when the environment has one.
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ proxy });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(pathToFileURL(join(here, 'preview.html')).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Every animation is paused and moved to the same moment, so each frame is exact.
  const seek = (ms) =>
    page.evaluate((t) => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = t;
      }
    }, ms);
  await seek(STILL_MS);
  await page.screenshot({ path: join(here, 'og.png') });
  const count = Math.round((LOOP_MS / 1000) * FPS);
  for (let i = 0; i < count; i++) {
    await seek((i * 1000) / FPS);
    await page.screenshot({ path: join(frames, `${String(i).padStart(4, '0')}.png`) });
  }
} finally {
  await browser.close();
}

execFileSync(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, '%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-tune', 'animation', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', '-an', join(here, 'og.mp4')],
  { stdio: 'inherit' },
);
await rm(frames, { recursive: true, force: true });
console.log('Wrote website/og/og.png and website/og/og.mp4');
