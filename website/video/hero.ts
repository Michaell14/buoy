// One island, large, going through every state in turn, with the call that made each one under it.
// It ends on the install command and the wordmark. render.mjs drives it one frame at a time.
import { highlight } from '../code';
import { timerActivity, type TimerState } from '../live';
import { unit, wait } from './common';
import { seekAnimations } from './seek';
import { use } from './shim';

const u = unit(document.querySelector<HTMLElement>('.cell')!, { colorScheme: 'light', resting: 'pill' });
const { store } = u;
store.configure({
  labels: {
    noun: 'upload',
    active: (tasks) => (tasks.length === 1 ? `Uploading ${tasks[0].label}` : `Uploading ${tasks.length} files`),
    doneOne: (task) => `Uploaded ${task.label}`,
    doneMany: (count) => `${count} uploads finished`,
  },
});

const label = document.querySelector<HTMLElement>('.label')!;
const code = document.querySelector<HTMLElement>('.code')!;
const ripples = document.querySelector<HTMLElement>('.ripples')!;

/** Says what the island is doing now. The line swaps with a short fade. */
function caption(name: string, source: string) {
  for (const [el, html] of [[label, name], [code, highlight(source)]] as const) {
    const next = document.createElement('span');
    next.innerHTML = html;
    const old = el.firstElementChild;
    if (old) {
      old.classList.add('is-leaving');
      setTimeout(() => old.remove(), 260);
    }
    el.append(next);
  }
}
function ripple() {
  const ring = document.createElement('b');
  ripples.append(ring);
  setTimeout(() => ring.remove(), 3300);
}
// A ring goes out whenever the island shows something new, as on the homepage.
store.subscribe((event) => {
  if (event === 'show') ripple();
});

const work = (seconds: number, bytes: number) => async (task: { progress(a: number, b: number): void }) => {
  const steps = Math.round(seconds * 10);
  task.progress(0, bytes);
  for (let i = 1; i <= steps; i++) {
    await wait(100);
    task.progress((bytes * Math.min(steps, i + Math.sin(i) * 0.4)) / steps, bytes);
  }
};

const PROMPT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 7.5l4.5 4.5-4.5 4.5"/><path d="M12.5 17h6"/></svg>';

async function run() {
  await wait(500);
  caption('A message', "buoy('Link copied', { icon: 'link' });");
  store.push('Link copied', { id: 'a', icon: 'link', duration: Infinity });

  await wait(1900);
  caption('A promise', "buoy.promise(save(), { loading: 'Saving…', success: 'Saved to drafts' });");
  void store.promise(wait(1300), { id: 'a', loading: 'Saving…', success: 'Saved to drafts', successDuration: 1800 });

  await wait(3000);
  caption('Background work', 'buoy.track((task) => upload(file, task), { label: file.name });');
  store.track(work(6.6, 24e6), { label: 'beach-sunset.heic', total: 24e6, icon: 'image', doneLabel: 'Uploaded just now' });
  store.track(work(7.7, 48e6), { label: 'holiday-video.mov', total: 48e6, icon: 'file', doneLabel: 'Uploaded just now' });
  store.track(work(0.9, 1.2e6), { label: 'itinerary.pdf', total: 1.2e6, icon: 'file', doneLabel: 'Uploaded just now' });

  await wait(1700);
  caption('Two at once', "buoy('Message sent', { icon: 'send' }); // the uploads carry on");
  store.push('Message sent', { icon: 'send', duration: 2000 });

  await wait(2500);
  caption('A tap opens the tray', '// pause, resume, retry or cancel each one');
  store.openTray();
  ripple();

  await wait(2800);
  store.closeTray();
  caption('And it says when it is done', "<Buoy labels={{ noun: 'upload' }} />");

  await wait(3000);
  store.dismiss();
  caption('A card, when there is more to say', "buoy('Export ready', { description, actions, expanded: true });");
  store.push('Export ready', {
    id: 'b',
    description: 'Q3-report.pdf · 4.2 MB',
    icon: 'file',
    tone: 'accent',
    expanded: true,
    duration: Infinity,
    actions: [{ label: 'Open', primary: true }, { label: 'Show in folder' }],
  });

  await wait(2700);
  store.dismiss('b');
  caption('Live activities', "buoy.live({ label: 'Focus timer', expandable: true, render });");
  const total = 25 * 60;
  const s: TimerState = { total, left: total - 11, running: true, ends: new Date(Date.now() + (total - 11) * 1000) };
  const timer = use(store, () => timerActivity(s));
  const ticking = setInterval(() => {
    s.left--;
    timer.refresh();
  }, 1000);
  await wait(1100);
  timer.expand(true);
  ripple();
  await wait(2700);
  timer.expand(false);

  await wait(1000);
  clearInterval(ticking);
  timer.close();
  // The close: the island holds the install command, and the wordmark comes up under it.
  document.documentElement.dataset.end = 'true';
  store.push('npm i buoy-ui', { icon: PROMPT, persist: true, action: { label: 'Copy' } });
}

let begun = false;
declare global {
  interface Window {
    __tick: (ms: number) => void;
  }
}
window.__tick = () => {
  if (!begun) {
    begun = true;
    void run();
  }
  seekAnimations();
};
