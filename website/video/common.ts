// Islands for the video pages. Each one is the real component with a store of its own, running a
// short scripted loop: messages, promises, uploads, or one of the site's live activities.
import { injectStyles } from '../../src/core/inject';
import { createIsland } from '../../src/core/island';
import { createStore, type Store } from '../../src/core/store';
import type { BuoyOptions, LiveHandle, MessageOptions, MessageType, TaskContext } from '../../src/core/types';
import {
  I,
  bars,
  build,
  clock,
  playSecond,
  playerActivity,
  recordTick,
  recorderActivity,
  ring,
  setText,
  skipTrack,
  timerActivity,
  type PlayerState,
  type RecorderState,
  type TimerState,
} from '../live';
import { use } from './shim';

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface Unit {
  store: Store;
  cell: HTMLElement;
  root: HTMLElement;
  shell: HTMLElement;
}
export type Program = (unit: Unit) => Promise<void> | void;

/** Puts an island in `cell`. `accent` recolors its progress and tinted icons. */
export function unit(cell: HTMLElement, options: BuoyOptions & { accent?: string } = {}): Unit {
  injectStyles(document);
  const { accent, ...config } = options;
  const store = createStore();
  store.configure({ resting: 'pill', guard: false, offset: 0, ...config });
  const island = createIsland(store, { container: cell });
  if (accent) {
    island.element.style.setProperty('--buoy-accent', accent);
    island.element.style.setProperty('--buoy-accent-strong', accent);
  }
  return { store, cell, root: island.element, shell: island.element.querySelector<HTMLElement>('.buoy-shell')! };
}

type Message = MessageOptions & { type?: MessageType };

/** One message after another on the same pill. */
export const messages =
  (list: Array<[title: string, options?: Message]>, hold = 2200, start = 0): Program =>
  async ({ store }) => {
    await wait(start);
    for (let i = 0; ; i++) {
      const [title, options] = list[i % list.length];
      store.push(title, { id: 'm', duration: Infinity, ...options });
      await wait(hold);
    }
  };

/** Loading, then its result, then the next one. */
export const promises =
  (list: Array<[loading: string, success: string, ms: number]>, start = 0): Program =>
  async ({ store }) => {
    await wait(start);
    for (let i = 0; ; i++) {
      const [loading, success, ms] = list[i % list.length];
      await store.promise(wait(ms), { id: 'p', loading, success, successDuration: Infinity });
      await wait(1700);
    }
  };

/** Pretend work that reports progress for `seconds`. */
const pretend = (amount: number, seconds: number) => async (task: TaskContext) => {
  const steps = Math.round(seconds * 10);
  let done = 0;
  task.progress(0, amount);
  for (let i = 1; i <= steps; i++) {
    await wait(100);
    await task.checkpoint();
    if (task.signal.aborted) return;
    done = Math.min(amount, Math.max(done, (amount * (i + (Math.random() - 0.5) * 0.9)) / steps));
    task.progress(i === steps ? amount : done, amount);
  }
};

const UPLOAD_LABELS = {
  noun: 'upload',
  active: (tasks: Array<{ label: string }>) => (tasks.length === 1 ? `Uploading ${tasks[0].label}` : `Uploading ${tasks.length} files`),
  doneOne: (task: { label: string }) => `Uploaded ${task.label}`,
  doneMany: (count: number) => `${count} uploads finished`,
};

/** Three uploads: the ring, then the tray, then the summary. */
const FILE_SETS: Array<Array<[label: string, bytes: number, seconds: number, icon: 'image' | 'file']>> = [
  [['beach-sunset.heic', 24e6, 5.2, 'image'], ['holiday-video.mov', 48e6, 7, 'file'], ['itinerary.pdf', 1.2e6, 1.8, 'file']],
  [['launch-deck.key', 36e6, 6.1, 'file'], ['hero-banner.png', 8.4e6, 4.4, 'image'], ['press-kit.zip', 62e6, 2.4, 'file']],
  [['team-photo.jpg', 5.6e6, 4.2, 'image'], ['interview.mp4', 88e6, 6.8, 'file'], ['notes.md', 0.4e6, 1.6, 'file']],
];

export const uploads =
  (start = 0, tray = true, set = 0, hold = 4700): Program =>
  async ({ store }) => {
    store.configure({ labels: UPLOAD_LABELS });
    await wait(start);
    for (;;) {
      const jobs = FILE_SETS[set % FILE_SETS.length].map(([label, bytes, seconds, icon]) =>
        store.track(pretend(bytes, seconds), { label, total: bytes, icon, doneLabel: 'Uploaded just now' }),
      );
      if (tray) {
        await wait(1500);
        store.openTray();
        await wait(hold);
        store.closeTray();
      }
      await Promise.all(jobs.map((job) => job.done));
      await wait(2400);
      store.dismiss();
      await wait(90);
    }
  };

/** An upload that keeps going while messages come through: the island splits in two. */
const SPLITS: Array<[file: string, first: string, second: string]> = [
  ['holiday-video.mov', 'New comment from Sam', 'Link copied'],
  ['backup-2026.zip', 'Reply sent', 'Added to favorites'],
  ['podcast-ep12.wav', 'Priya joined', 'Draft saved'],
];

export const split =
  (start = 0, variant = 0): Program =>
  async ({ store }) => {
    const [file, first, second] = SPLITS[variant % SPLITS.length];
    store.configure({ labels: UPLOAD_LABELS });
    await wait(start);
    for (;;) {
      const job = store.track(pretend(48e6, 8.5), { label: file, total: 48e6, icon: 'file' });
      await wait(1500);
      store.push(first, { icon: 'send', duration: 2300 });
      await wait(3900);
      store.push(second, { icon: 'link', duration: 2100 });
      await job.done;
      await wait(2300);
      store.dismiss();
      await wait(90);
    }
  };

/** A promise whose success opens into a card with two buttons. */
const EXPORTS: Array<[loading: string, title: string, description: string, first: string, second: string]> = [
  ['Exporting…', 'Export ready', 'Q3-report.pdf · 4.2 MB', 'Open', 'Show in folder'],
  ['Rendering…', 'Video ready', 'launch-teaser.mp4 · 38 MB', 'Play', 'Share'],
  ['Building…', 'Deploy finished', 'buoy-ui.vercel.app · 42 s', 'Visit', 'View logs'],
];

export const exportCard =
  (start = 0, variant = 0): Program =>
  async ({ store }) => {
    await wait(start);
    for (;;) {
      const [loading, title, description, first, second] = EXPORTS[variant % EXPORTS.length];
      await store.promise(wait(1700), {
        id: 'e',
        loading,
        success: { title, description, icon: 'file', expanded: true, duration: Infinity, actions: [{ label: first, primary: true }, { label: second }] },
      });
      await wait(4100);
    }
  };

const BAG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 8.5h13l1 11h-15z"/><path d="M9 8.5a3 3 0 0 1 6 0"/></svg>';

/** A message with a button, then the card it opens. */
const CARTS = ['Canvas tote · $64.00', 'Trail runners · $258.00', 'Desk lamp · $118.00'];

export const cart =
  (start = 0, variant = 0): Program =>
  async ({ store }) => {
    await wait(start);
    for (;;) {
      store.push('Added to cart', { id: 'c', icon: BAG, action: { label: 'View' }, duration: Infinity });
      await wait(2300);
      store.push('2 in your cart', {
        id: 'c',
        description: CARTS[variant % CARTS.length],
        icon: BAG,
        tone: 'accent',
        expanded: true,
        duration: Infinity,
        actions: [{ label: 'Check out', primary: true }, { label: 'Keep shopping' }],
      });
      await wait(3600);
      store.push('Order placed', { id: 'c', type: 'success', duration: Infinity });
      await wait(2000);
    }
  };

/** An error that waits, then the retry that works. */
const RETRIES: Array<[error: string, loading: string, success: string]> = [
  ['Card declined', 'Processing payment…', 'Payment received'],
  ["Couldn't save", 'Saving…', 'Saved to drafts'],
  ['Connection dropped', 'Reconnecting…', 'Back online'],
];

export const retry =
  (start = 0, variant = 0): Program =>
  async ({ store }) => {
    const [error, loading, success] = RETRIES[variant % RETRIES.length];
    await wait(start);
    for (;;) {
      store.push(error, { id: 'r', type: 'error', action: { label: 'Retry' }, duration: Infinity });
      await wait(2600);
      await store.promise(wait(1500), { id: 'r', loading, success, successDuration: Infinity });
      await wait(2200);
    }
  };

/** Opens and closes an expandable live activity on a loop. */
async function breathe(live: LiveHandle, closed: number, open: number, start: number, between?: () => void) {
  await wait(start);
  for (;;) {
    live.expand(true);
    await wait(open / 2);
    between?.();
    await wait(open / 2);
    live.expand(false);
    await wait(closed);
  }
}

export const timer =
  (start = 0, variant = 0, closed = 2400, open = 5200): Program =>
  ({ store }) => {
    const total = [25, 50, 15][variant % 3] * 60;
    const gone = [143, 1262, 512][variant % 3];
    const s: TimerState = { total, left: total - gone, running: true, ends: new Date(Date.now() + (total - gone) * 1000) };
    const live = use(store, () => timerActivity(s));
    setInterval(() => {
      if (!s.running) return;
      s.left = s.left > 1 ? s.left - 1 : total;
      live.refresh();
    }, 1000);
    return breathe(live, closed, open, start);
  };

export const player =
  (start = 0, variant = 0, closed = 2600, open = 5600): Program =>
  ({ store }) => {
    const s: PlayerState = { i: variant % 3, at: [47, 122, 8][variant % 3], playing: true };
    const live = use(store, () => playerActivity(s));
    setInterval(() => {
      playSecond(s);
      live.refresh();
    }, 1000);
    return breathe(live, closed, open, start, () => {
      skipTrack(s, 1);
      live.refresh();
    });
  };

export const recorder =
  (start = 0, variant = 0, closed = 2200, open = 4600): Program =>
  ({ store }) => {
    const s: RecorderState = { ticks: [85, 410, 1730][variant % 3], paused: false, levels: [], saved: false };
    const live = use(store, () => recorderActivity(s));
    setInterval(() => {
      recordTick(s);
      live.refresh();
    }, 200);
    return breathe(live, closed, open, start);
  };

/** A call, drawn the way the homepage demo draws it. */
const CALLS: Array<[title: string, people: string, faces: string, seconds: number]> = [
  ['Design review', 'Maya, Ken and 2 others', '<span>M</span><span>K</span><span>+2</span>', 12 * 60 + 8],
  ['Standup', 'Priya, Sam and 4 others', '<span>P</span><span>S</span><span>+4</span>', 3 * 60 + 41],
  ['Lena Fischer', 'Mobile', '<span>L</span>', 27 * 60 + 15],
];

export const call =
  (start = 0, variant = 0, closed = 2800, open = 4400): Program =>
  ({ store }) => {
    const [title, people, faces] = CALLS[variant % CALLS.length];
    let seconds = CALLS[variant % CALLS.length][3];
    const live = store.live({
      label: 'Call in progress: Design review',
      expandable: true,
      render(el, { expanded }) {
        if (!expanded) {
          build(el, 'c', () =>
            `<span class="buoy-row"><span class="buoy-ic" data-tone="success">${I.phone}</span><span class="buoy-title">${title}</span>` +
            '<span class="lv-dot" aria-hidden="true"></span><span class="buoy-pct lv-time"></span></span>');
          setText(el, '.lv-time', clock(seconds));
          return;
        }
        build(el, 'x', () =>
          `<div class="buoy-exp"><div class="buoy-exp-head"><span class="lv-faces" aria-hidden="true">${faces}</span>` +
          `<div class="buoy-exp-text"><span class="buoy-exp-title">${title}</span><span class="buoy-exp-desc lv-desc"></span></div></div>` +
          `<div class="buoy-actions"><button type="button" class="buoy-btn lv-with-icon">${I.mic}<span>Mute</span></button>` +
          `<button type="button" class="buoy-btn lv-with-icon">${I.video}<span>Camera</span></button>` +
          '<button type="button" class="buoy-btn is-danger">Leave</button></div></div>');
        setText(el, '.lv-desc', `${people} · ${clock(seconds)}`);
      },
    });
    setInterval(() => {
      seconds++;
      live.refresh();
    }, 1000);
    return breathe(live, closed, open, start);
  };

/** A delete that can be undone while its ring runs down. */
const UNDOS: Array<[gone: string, back: string]> = [
  ['3 files deleted', 'Restored 3 files'],
  ['Message deleted', 'Message restored'],
  ['Photo removed', 'Photo put back'],
];

export const undo =
  (start = 0, variant = 0): Program =>
  async ({ store }) => {
    const [gone, back] = UNDOS[variant % UNDOS.length];
    await wait(start);
    for (;;) {
      const since = performance.now();
      const live = store.live({
        label: gone,
        render(el) {
          build(el, 'c', () =>
            `<div class="buoy-row end-action lv-undo"><span class="buoy-ic">${I.trash}</span><span class="buoy-title">${gone}</span>` +
            `<button type="button" class="buoy-act"><span>Undo</span></button>${ring(1, 'lv-countdown')}</div>`);
          const value = el.querySelector<SVGElement>('.lv-countdown .val');
          if (value) {
            value.style.animationDuration = '5000ms';
            value.style.animationDelay = `-${Math.min(5000, performance.now() - since)}ms`;
          }
        },
      });
      await wait(3700);
      live.close();
      store.push(back, { type: 'success', duration: Infinity, id: 'u' });
      await wait(2000);
      store.dismiss('u');
    }
  };

/** Offline, then back. */
export const offline =
  (start = 0): Program =>
  async ({ store }) => {
    const show = (icon: string, tone: string, title: string, note: string) =>
      store.live({
        id: 'net',
        label: `${title}. ${note}`,
        render(el) {
          build(el, title, () => `<div class="buoy-row"><span class="buoy-ic" data-tone="${tone}">${icon}</span><span class="buoy-title">${title}</span><span class="lv-note">${note}</span></div>`);
        },
      });
    await wait(start);
    for (;;) {
      show(I.wifiOff, 'warn', "You're offline", 'Saving on this device');
      await wait(3400);
      show(I.wifi, 'success', 'Back online', '3 changes synced');
      await wait(2600);
    }
  };

/** A level meter, for a small pill at the edge of a wall. */
export const meter =
  (count = 7): Program =>
  ({ store }) => {
    store.live({
      label: 'Listening',
      render(el) {
        build(el, 'c', () => `<span class="buoy-row no-icon lv-rec" style="padding-right:18px"><span class="lv-dot" aria-hidden="true"></span>${bars(count)}</span>`);
        el.querySelectorAll('.lv-bars').forEach((b) => b.classList.add('is-on'));
      },
    });
  };
