// A wall of islands in drifting columns. ?look=dark|light picks the ground, ?tilt=1 lays the wall
// back in perspective, ?end=1 closes on the wordmark. render.mjs drives it one frame at a time.
import type { Message } from './types';
import {
  call,
  cart,
  exportCard,
  messages,
  meter,
  offline,
  player,
  promises,
  recorder,
  retry,
  split,
  timer,
  undo,
  unit,
  uploads,
  type Program,
  type Unit,
} from './common';
import { seekAnimations } from './seek';

const query = new URLSearchParams(location.search);
const look = query.get('look') === 'light' ? 'light' : 'dark';
const tilt = query.get('tilt') === '1';
const end = query.get('end') === '1';
const seconds = Number(query.get('seconds') ?? 14);
document.documentElement.dataset.look = look;
document.documentElement.dataset.tilt = String(tilt);

const A: Message[] = [
  ['Link copied', { icon: 'link' }],
  ['Saved to drafts', { type: 'success' }],
  ["You're offline", { type: 'warning' }],
  ['Message sent', { icon: 'send' }],
  ['Update available', { type: 'info', action: { label: 'Reload' } }],
];
const B: Message[] = [
  ['Invite sent to kofi@example.com', { type: 'success' }],
  ['Copied to clipboard', { icon: 'copy' }],
  ["Couldn't save", { type: 'error', action: { label: 'Retry' } }],
  ['Added to Downloads', { icon: 'download' }],
  ['Reminder set for 9:00', { icon: 'bell' }],
];
const C: Message[] = [
  ['Conversation archived', { action: { label: 'Undo' } }],
  ['Profile saved', { type: 'success' }],
  ['Moved to Q3 launch', { icon: 'folder' }],
  ['2 conversations archived', { action: { label: 'Undo' } }],
  ['Enter an email address', { type: 'warning' }],
];
const D: Message[] = [
  ['Pinned to the top', { icon: 'link' }],
  ['Draft discarded', { action: { label: 'Undo' } }],
  ['Welcome back, Ana', { icon: 'user' }],
  ['Battery is low', { type: 'warning' }],
  ['Export set for 6:00', { icon: 'timer' }],
];
const E: Message[] = [
  ['Comment posted', { type: 'success' }],
  ['3 new replies', { icon: 'bell', action: { label: 'Show' } }],
  ['Renamed to final-v2', { icon: 'file' }],
  ["Couldn't load the feed", { type: 'error', action: { label: 'Retry' } }],
  ['Marked as read', { icon: 'check' }],
];
const P1: Array<[string, string, number]> = [
  ['Saving…', 'Saved to drafts', 1500],
  ['Publishing…', 'Published', 1900],
  ['Sending…', 'Sent to Priya', 1300],
];
const P2: Array<[string, string, number]> = [
  ['Processing payment…', 'Payment received', 1800],
  ['Syncing…', 'Synced', 1400],
  ['Inviting…', 'Invite sent', 1500],
];
const P3: Array<[string, string, number]> = [
  ['Summarizing…', 'Summary ready', 1700],
  ['Compressing…', 'Saved 4.2 MB', 1500],
  ['Deploying…', 'Live on production', 1900],
];

type Make = (start: number, variant: number) => Program;
const pool: Record<string, Make> = {
  uploads: (s, v) => uploads(s, true, v),
  ring: (s, v) => uploads(s, false, v),
  split: (s, v) => split(s, v),
  cart: (s, v) => cart(s, v),
  export: (s, v) => exportCard(s, v),
  retry: (s, v) => retry(s, v),
  timer: (s, v) => timer(s, v),
  player: (s, v) => player(s, v),
  recorder: (s, v) => recorder(s, v),
  call: (s, v) => call(s, v),
  undo: (s, v) => undo(s, v),
  offline: (s) => offline(s),
  mA: (s) => messages(A, 2300, s),
  mB: (s) => messages(B, 2600, s),
  mC: (s) => messages(C, 2400, s),
  mD: (s) => messages(D, 2500, s),
  mE: (s) => messages(E, 2200, s),
  p1: (s) => promises(P1, s),
  p2: (s) => promises(P2, s),
  p3: (s) => promises(P3, s),
};
// Each column has its own line-up, so no two neighbours show the same thing at the same height.
// A name can carry a variant: "timer:1" is the second timer.
const LINEUPS = [
  'split:0 timer:0 mA cart:0 p2 uploads:0 offline call:0 mC export:0 undo:0 player:0 mD retry:0',
  'mE cart:1 offline call:2 p3 recorder:0 mB export:1 p1 player:1 retry:1 undo:1 ring:1 timer:1',
  'uploads:2 p3 player:2 mD undo:2 p1 call:1 recorder:1 export:2 split:1 mE timer:2 mB cart:2',
  'recorder:2 mA ring:0 retry:2 p2 export:0 call:0 mC timer:0 uploads:1 player:0 offline cart:0 p1',
  'timer:1 undo:0 uploads:0 mB call:2 p3 export:1 split:2 player:1 mD retry:0 recorder:0 cart:1 mE',
  'export:2 offline player:2 mC split:0 cart:2 p1 timer:2 uploads:2 retry:1 mA call:1 undo:1 recorder:1',
];
const cellsFor = (k: number): Array<(start: number) => Program> =>
  LINEUPS[k % LINEUPS.length].split(' ').map((entry) => {
    const [name, variant = '0'] = entry.split(':');
    return (start: number) => pool[name](start, Number(variant));
  });

// Small pills for the columns that the edges of the frame cut through.
const S1: Message[] = [['Saved', { type: 'success' }], ['Sent', { icon: 'send' }], ['Copied', { icon: 'copy' }], ['Synced', { type: 'success' }]];
const S2: Message[] = [['Offline', { type: 'warning' }], ['Online', { type: 'success' }], ['Paused', { icon: 'pause' }], ['Pinned', { icon: 'link' }]];
const small: Array<(start: number) => Program> = [
  (s) => messages(S1, 2100, s),
  () => meter(6),
  (s) => promises([['Saving…', 'Saved', 1400], ['Sending…', 'Sent', 1200]], s),
  (s) => messages(S2, 2500, s),
  () => meter(4),
  (s) => messages([['Muted', { icon: 'bell' }], ['Shared', { icon: 'user' }], ['Queued', { icon: 'stack' }]], 2300, s),
];

// Mostly the brand's teal, with a few other accents so the wall reads as many apps.
const ACCENTS = look === 'dark' ? [undefined, undefined, '#A78BFA', undefined, '#FBBF24', undefined, '#F472B6', '#60A5FA'] : [undefined];

const wall = document.querySelector<HTMLElement>('.wall')!;
const units: Unit[] = [];
interface Column {
  el: HTMLElement;
  /** Pixels a second. Negative drifts up. */
  speed: number;
  y: number;
}
const columns: Column[] = [];

function column(x: number, speed: number, cells: Array<(start: number) => Program>, isSmall: boolean, seed: number) {
  const el = document.createElement('div');
  el.className = `col${isSmall ? ' is-small' : ''}`;
  el.style.left = `${x}px`;
  wall.append(el);
  cells.forEach((make, i) => {
    const cell = document.createElement('div');
    cell.className = 'cell';
    el.append(cell);
    const u = unit(cell, { colorScheme: look, accent: ACCENTS[(seed * 3 + i * 5) % ACCENTS.length], richColors: (seed + i) % 2 === 0 });
    units.push(u);
    void make(((seed * 1300 + i * 900) % 4200) + 100)(u);
  });
  columns.push({ el, speed, y: 0 });
}

const PITCH = 350;
const count = tilt ? 6 : 3;
const speeds = [-26, 21, -30, 24, -22, 27];
for (let i = 0; i < count; i++) {
  column((i - (count - 1) / 2) * PITCH, speeds[i], cellsFor(i), false, i + 1);
}
if (!tilt) {
  const edge = (count / 2) * PITCH + 85;
  const many = (offset: number) => Array.from({ length: 26 }, (_, i) => small[(i + offset) % small.length]);
  column(-edge, 16, many(0), true, 7);
  column(edge, -18, many(3), true, 9);
}

const title = document.querySelector<HTMLElement>('.title')!;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => v * v * (3 - 2 * v);

/** Sets everything that follows the video's own clock. `ms` is the time since its first frame. */
function tick(ms: number) {
  // Each cell is as tall as its island right now, so a column makes room as one opens.
  for (const u of units) {
    const h = parseFloat(u.shell.style.height) || 44;
    u.cell.style.height = `${Math.max(30, h).toFixed(2)}px`;
  }
  for (const c of columns) {
    // A column that drifts down starts with its end at the bottom of the frame.
    const base = c.speed > 0 ? -(c.el.offsetHeight - innerHeight - 60) : -60;
    c.el.style.transform = `translate3d(0, ${(base + (c.speed * ms) / 1000).toFixed(2)}px, 0)`;
  }

  // The beat near the start: the wall drops out of focus, then comes back from the middle outward.
  const out = ease(clamp((ms - 320) / 300));
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;
  const reach = Math.hypot(cx, cy);
  // And the close: the wall falls back behind the wordmark.
  const closing = end ? ease(clamp((ms - (seconds * 1000 - 3200)) / 700)) : 0;
  for (const u of units) {
    const box = u.cell.getBoundingClientRect();
    if (box.bottom < -80 || box.top > innerHeight + 80) {
      u.cell.style.filter = '';
      u.cell.style.opacity = '';
      continue;
    }
    const far = Math.hypot(box.left + box.width / 2 - cx, box.top + box.height / 2 - cy) / reach;
    const back = ease(clamp((ms - 640 - far * 760) / 480));
    const blurred = Math.max(out * (1 - back), closing);
    u.cell.style.filter = blurred > 0.004 ? `blur(${(blurred * 13).toFixed(2)}px)` : '';
    u.cell.style.opacity = blurred > 0.004 ? (1 - Math.max(out * (1 - back) * 0.86, closing * 0.9)).toFixed(3) : '';
  }
  if (end) {
    const shown = ease(clamp((ms - (seconds * 1000 - 2800)) / 600));
    title.style.opacity = shown.toFixed(3);
    title.style.transform = `translateY(${((1 - shown) * 14).toFixed(2)}px)`;
  }
  seekAnimations();
}

declare global {
  interface Window {
    __tick: (ms: number) => void;
  }
}
window.__tick = tick;
