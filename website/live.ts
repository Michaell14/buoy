// The "Live activities" demos: six things that keep going, each drawn with buoy.live().
// The markup reuses the island's own classes (buoy-row, buoy-exp, buoy-btn…), so every theme fits.
import { buoy } from '../src/vanilla';
import type { LiveHandle } from '../src/vanilla';

const svg = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const I = {
  timer: svg('<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 2"/><path d="M9.5 3h5"/>'),
  phone: svg('<path d="M6.5 4h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 6a2 2 0 0 1 2-2z"/>'),
  mic: svg('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5v3"/>'),
  micOff: svg('<path d="M3.5 3.5l17 17"/><path d="M9 9v2.5a3 3 0 0 0 5 2.2"/><path d="M15 9.5V6.5a3 3 0 0 0-5.7-1.3"/><path d="M5.5 11a6.5 6.5 0 0 0 11 4.6"/><path d="M12 17.5v3"/>'),
  video: svg('<rect x="3.5" y="6.5" width="12" height="11" rx="2.5"/><path d="M15.5 10.5l5-3v9l-5-3z"/>'),
  videoOff: svg('<path d="M3.5 3.5l17 17"/><path d="M15.5 12.5v-3.5a2.5 2.5 0 0 0-2.5-2.5H9"/><path d="M5 6.7A2.5 2.5 0 0 0 3.5 9v6A2.5 2.5 0 0 0 6 17.5h7a2.5 2.5 0 0 0 2-1"/><path d="M15.5 10.5l5-3v9"/>'),
  trash: svg('<path d="M4.5 7h15"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 12.5h9l1-12.5"/>'),
  wifiOff: svg('<path d="M3.5 3.5l17 17"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 4.6-2.6"/><path d="M19 12.5a10 10 0 0 0-3.2-2.1"/><path d="M12 20h.01"/>'),
  wifi: svg('<path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M12 20h.01"/>'),
  x: svg('<path d="M6.5 6.5l11 11"/><path d="M17.5 6.5l-11 11"/>'),
  pause: svg('<path d="M9 6v12"/><path d="M15 6v12"/>'),
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
  prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6l-9 6 9 6z" fill="currentColor"/><path d="M6 6v12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l9 6-9 6z" fill="currentColor"/><path d="M18 6v12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>',
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;
const RING = 2 * Math.PI * 10.5;
const ring = (fraction: number, extra = '') =>
  `<svg class="buoy-ring ${extra}" viewBox="0 0 28 28" aria-hidden="true"><circle class="trk" cx="14" cy="14" r="10.5"/>` +
  `<circle class="val" cx="14" cy="14" r="10.5" style="stroke-dasharray:${RING.toFixed(2)};stroke-dashoffset:${(RING * (1 - fraction)).toFixed(2)}"/></svg>`;
const setRing = (el: HTMLElement, fraction: number) => {
  const val = el.querySelector<SVGElement>('.buoy-ring .val');
  if (val) val.style.strokeDashoffset = (RING * (1 - fraction)).toFixed(2);
};
const bars = (n: number, extra = '') => `<span class="lv-bars ${extra}" aria-hidden="true">${'<i></i>'.repeat(n)}</span>`;

/** Builds a view's markup once, then later calls only update it, so focus and animations survive a refresh. */
function build(el: HTMLElement, key: string, html: () => string, onClick?: (action: string) => void): void {
  if (el.dataset.view === key) return;
  el.dataset.view = key;
  el.innerHTML = html();
  el.onclick = onClick
    ? (event) => {
        const button = (event.target as Element).closest<HTMLElement>('[data-do]');
        if (button && el.contains(button)) onClick(button.dataset.do!);
      }
    : null;
}
const setText = (el: HTMLElement, selector: string, value: string) => {
  const node = el.querySelector(selector);
  if (node && node.textContent !== value) node.textContent = value;
};

const timeOfDay = (date: Date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const CLOSE = `<button type="button" class="buoy-x" data-do="collapse" aria-label="Close">${I.x}</button>`;
const head = (lead: string, title: string, trail = CLOSE) =>
  `<div class="buoy-exp-head">${lead}<div class="buoy-exp-text"><span class="buoy-exp-title">${title}</span><span class="buoy-exp-desc lv-desc"></span></div>${trail}</div>`;

type Name = 'timer' | 'music' | 'call' | 'undo' | 'offline' | 'record';
const running = new Map<Name, LiveHandle>();
let onChange: (name: Name, on: boolean) => void = () => {};
const started = (name: Name, live: LiveHandle) => {
  running.set(name, live);
  onChange(name, true);
};
const stopped = (name: Name) => {
  running.delete(name);
  onChange(name, false);
};

/* ───── Focus timer ───── */

function focusTimer() {
  const total = 25 * 60;
  const s = { left: total, running: true, ends: new Date(Date.now() + total * 1000), tick: 0 };
  const live = buoy.live({
    label: 'Focus timer, 25 minutes',
    expandable: true,
    onClose: () => {
      clearInterval(s.tick);
      stopped('timer');
    },
    render(el, { expanded }) {
      const done = 1 - s.left / total;
      if (!expanded) {
        build(el, 'c', () =>
          `<span class="buoy-row end-ring"><span class="buoy-ic" data-tone="accent">${I.timer}</span><span class="buoy-title">Focus</span>` +
          `<span class="buoy-pct lv-time"></span>${ring(done)}</span>`);
        setText(el, '.lv-time', clock(s.left));
        setRing(el, done);
        return;
      }
      build(el, 'x', () =>
        `<div class="buoy-exp">${head(`<span class="buoy-tile" data-tone="accent">${I.timer}</span>`, 'Focus')}` +
        `<div class="lv-readout"><span class="lv-big"></span><span class="buoy-exp-desc">of 25:00</span></div>` +
        `<div class="buoy-bar lv-line"><i></i></div>` +
        `<div class="buoy-actions"><button type="button" class="buoy-btn is-primary" data-do="pause"></button><button type="button" class="buoy-btn" data-do="end">End</button></div></div>`,
        (action) => {
          if (action === 'collapse') live.expand(false);
          if (action === 'end') live.close();
          if (action === 'pause') {
            s.running = !s.running;
            if (s.running) s.ends = new Date(Date.now() + s.left * 1000);
            live.refresh();
          }
        });
      setText(el, '.lv-desc', s.running ? `Ends at ${timeOfDay(s.ends)}` : 'Paused');
      setText(el, '.lv-big', clock(s.left));
      setText(el, '[data-do="pause"]', s.running ? 'Pause' : 'Resume');
      el.querySelector<HTMLElement>('.lv-line > i')!.style.width = `${(done * 100).toFixed(1)}%`;
    },
  });
  s.tick = window.setInterval(() => {
    if (!s.running) return;
    s.left--;
    if (s.left > 0) return live.refresh();
    live.close();
    buoy.success('Focus session done');
  }, 1000);
  started('timer', live);
}

/* ───── Now playing ───── */

const TRACKS = [
  { title: 'Nightswim', artist: 'Low Tide', album: 'Lagoon Sessions', length: 220 },
  { title: 'Tidewater', artist: 'Low Tide', album: 'Lagoon Sessions', length: 198 },
  { title: 'Salt Lines', artist: 'Low Tide', album: 'Lagoon Sessions', length: 241 },
];

function nowPlaying() {
  const s = { i: 0, at: 0, playing: true, tick: 0 };
  const track = () => TRACKS[s.i];
  const live = buoy.live({
    label: `Now playing: ${TRACKS[0].title} by ${TRACKS[0].artist}`,
    expandable: true,
    onClose: () => {
      clearInterval(s.tick);
      stopped('music');
    },
    render(el, { expanded }) {
      const t = track();
      if (!expanded) {
        build(el, 'c', () => `<span class="buoy-row lv-media"><span class="lv-art" aria-hidden="true"></span><span class="buoy-title lv-name"></span>${bars(5)}</span>`);
      } else {
        build(el, 'x', () =>
          `<div class="buoy-exp">${head('<span class="lv-art is-large" aria-hidden="true"></span>', '<span class="lv-name"></span>', bars(5))}` +
          `<div class="lv-scrub"><span class="lv-at"></span><div class="buoy-bar lv-line"><i></i></div><span class="lv-left"></span></div>` +
          `<div class="lv-transport"><button type="button" class="lv-ctl" data-do="prev" aria-label="Previous track">${I.prev}</button>` +
          `<button type="button" class="buoy-btn is-primary lv-play" data-do="toggle"></button>` +
          `<button type="button" class="lv-ctl" data-do="next" aria-label="Next track">${I.next}</button></div></div>`,
          (action) => {
            if (action === 'toggle') s.playing = !s.playing;
            if (action === 'next') s.i = (s.i + 1) % TRACKS.length;
            if (action === 'prev') s.i = s.at > 3 ? s.i : (s.i + TRACKS.length - 1) % TRACKS.length;
            if (action !== 'toggle') s.at = 0;
            live.refresh();
          });
        setText(el, '.lv-desc', `${t.artist} · ${t.album}`);
        setText(el, '.lv-at', clock(s.at));
        setText(el, '.lv-left', `-${clock(t.length - s.at)}`);
        el.querySelector<HTMLElement>('.lv-line > i')!.style.width = `${((s.at / t.length) * 100).toFixed(1)}%`;
        const toggle = el.querySelector<HTMLElement>('[data-do="toggle"]')!;
        const label = s.playing ? 'Pause' : 'Play';
        if (toggle.getAttribute('aria-label') !== label) {
          toggle.setAttribute('aria-label', label);
          toggle.innerHTML = s.playing ? I.pause : I.play;
        }
      }
      setText(el, '.lv-name', t.title);
      el.querySelectorAll<HTMLElement>('.lv-art').forEach((art) => (art.dataset.i = String(s.i)));
      el.querySelectorAll('.lv-bars').forEach((b) => b.classList.toggle('is-on', s.playing));
    },
  });
  s.tick = window.setInterval(() => {
    if (!s.playing) return;
    s.at++;
    if (s.at >= track().length) {
      s.i = (s.i + 1) % TRACKS.length;
      s.at = 0;
    }
    live.refresh();
  }, 1000);
  started('music', live);
}

/* ───── Call ───── */

function call() {
  const s = { secs: 0, muted: false, camera: true, tick: 0, left: false };
  const live = buoy.live({
    label: 'Call in progress: Design review',
    expandable: true,
    onClose: () => {
      clearInterval(s.tick);
      stopped('call');
      if (s.left) buoy('Left Design review', { icon: I.phone });
    },
    render(el, { expanded }) {
      if (!expanded) {
        build(el, 'c', () =>
          `<span class="buoy-row"><span class="buoy-ic" data-tone="success">${I.phone}</span><span class="buoy-title">Design review</span>` +
          '<span class="lv-dot" aria-hidden="true"></span><span class="buoy-pct lv-time"></span></span>');
        setText(el, '.lv-time', clock(s.secs));
        return;
      }
      const faces = '<span class="lv-faces" aria-hidden="true"><span>M</span><span>K</span><span>+2</span></span>';
      build(el, 'x', () =>
        `<div class="buoy-exp">${head(faces, 'Design review', '')}` +
        '<div class="buoy-actions"><button type="button" class="buoy-btn lv-with-icon" data-do="mute"></button>' +
        '<button type="button" class="buoy-btn lv-with-icon" data-do="camera"></button>' +
        '<button type="button" class="buoy-btn is-danger" data-do="leave">Leave</button></div></div>',
        (action) => {
          if (action === 'collapse') live.expand(false);
          if (action === 'mute') s.muted = !s.muted;
          if (action === 'camera') s.camera = !s.camera;
          if (action === 'leave') {
            s.left = true;
            return live.close();
          }
          live.refresh();
        });
      setText(el, '.lv-desc', `Maya, Ken and 2 others · ${clock(s.secs)}`);
      const mute = el.querySelector<HTMLElement>('[data-do="mute"]')!;
      if (mute.getAttribute('aria-pressed') !== String(s.muted)) {
        mute.setAttribute('aria-pressed', String(s.muted));
        mute.innerHTML = `${s.muted ? I.micOff : I.mic}<span>${s.muted ? 'Unmute' : 'Mute'}</span>`;
      }
      const camera = el.querySelector<HTMLElement>('[data-do="camera"]')!;
      if (camera.getAttribute('aria-pressed') !== String(!s.camera)) {
        camera.setAttribute('aria-pressed', String(!s.camera));
        camera.innerHTML = `${s.camera ? I.video : I.videoOff}<span>${s.camera ? 'Camera' : 'Camera off'}</span>`;
      }
    },
  });
  s.tick = window.setInterval(() => {
    s.secs++;
    live.refresh();
  }, 1000);
  started('call', live);
}

/* ───── Undo ───── */

function undo() {
  const windowMs = 5000;
  const since = Date.now();
  const live = buoy.live({
    label: '3 files deleted. You can undo this for 5 seconds.',
    duration: windowMs,
    onClose: () => stopped('undo'),
    render(el) {
      build(el, 'c', () =>
        `<div class="buoy-row end-action lv-undo"><span class="buoy-ic">${I.trash}</span><span class="buoy-title">3 files deleted</span>` +
        `<button type="button" class="buoy-act" data-do="undo"><span>Undo</span></button>${ring(1, 'lv-countdown')}</div>`,
        () => {
          live.close();
          buoy.success('Restored 3 files');
        });
      // If the activity stepped aside for a message and came back, the ring picks up where the timer is.
      const val = el.querySelector<SVGElement>('.lv-countdown .val');
      if (val) {
        val.style.animationDuration = `${windowMs}ms`;
        val.style.animationDelay = `-${Math.min(windowMs, Date.now() - since)}ms`;
      }
    },
  });
  started('undo', live);
}

/* ───── Offline, then back online ───── */

function offline() {
  let back = 0;
  const lost = buoy.live({
    label: "You're offline. Changes are saved on this device.",
    onClose: () => {
      clearTimeout(back);
      stopped('offline');
    },
    render(el) {
      build(el, 'c', () =>
        `<div class="buoy-row"><span class="buoy-ic" data-tone="warn">${I.wifiOff}</span><span class="buoy-title">You're offline</span>` +
        '<span class="lv-note">Saving on this device</span></div>');
    },
  });
  started('offline', lost);
  back = window.setTimeout(() => {
    lost.close();
    buoy.live({
      label: 'Back online. 3 changes synced.',
      duration: 2600,
      render(el) {
        build(el, 'c', () =>
          `<div class="buoy-row"><span class="buoy-ic" data-tone="success">${I.wifi}</span><span class="buoy-title">Back online</span>` +
          '<span class="lv-note">3 changes synced</span></div>');
      },
    });
  }, 3200);
}

/* ───── Recording ───── */

function recording() {
  const s = { ticks: 0, paused: false, levels: [] as number[], tick: 0, saved: false };
  const secs = () => Math.floor(s.ticks / 5);
  const live = buoy.live({
    label: 'Recording a voice memo',
    expandable: true,
    onClose: () => {
      clearInterval(s.tick);
      stopped('record');
      if (s.saved) buoy.success('Voice memo saved', { description: clock(secs()) });
    },
    render(el, { expanded }) {
      if (!expanded) {
        build(el, 'c', () => `<span class="buoy-row no-icon lv-rec"><span class="lv-dot is-rec" aria-hidden="true"></span>${bars(7, 'is-plain')}<span class="buoy-pct lv-time"></span></span>`);
        setText(el, '.lv-time', clock(secs()));
        el.querySelectorAll('.lv-dot, .lv-bars').forEach((n) => n.classList.toggle('is-on', !s.paused));
        return;
      }
      build(el, 'x', () =>
        `<div class="buoy-exp">${head(`<span class="buoy-tile" data-tone="error">${I.mic}</span>`, 'Voice memo')}` +
        `<div class="lv-wave" aria-hidden="true">${'<i></i>'.repeat(32)}</div>` +
        `<div class="buoy-actions"><button type="button" class="buoy-btn" data-do="pause"></button>` +
        `<button type="button" class="buoy-btn is-primary lv-with-icon" data-do="stop">${I.stop}<span>Stop</span></button></div></div>`,
        (action) => {
          if (action === 'collapse') live.expand(false);
          if (action === 'pause') {
            s.paused = !s.paused;
            live.refresh();
          }
          if (action === 'stop') {
            s.saved = true;
            live.close();
          }
        });
      setText(el, '.lv-desc', `${s.paused ? 'Paused' : 'Recording'} · ${clock(secs())}`);
      setText(el, '[data-do="pause"]', s.paused ? 'Resume' : 'Pause');
      const wave = el.querySelectorAll<HTMLElement>('.lv-wave i');
      const recent = s.levels.slice(-wave.length);
      wave.forEach((bar, i) => {
        const level = recent[i - (wave.length - recent.length)];
        bar.style.height = `${level === undefined ? 4 : 4 + level * 20}px`;
        bar.classList.toggle('is-quiet', level === undefined);
      });
    },
  });
  s.tick = window.setInterval(() => {
    if (s.paused) return;
    s.ticks++;
    s.levels.push(Math.min(1, Math.abs(Math.sin(s.ticks * 0.7)) * 0.6 + Math.random() * 0.4));
    if (s.levels.length > 64) s.levels.splice(0, s.levels.length - 64);
    live.refresh();
  }, 200);
  started('record', live);
}

/* ───── Wiring ───── */

const START: Record<Name, () => void> = { timer: focusTimer, music: nowPlaying, call, undo, offline, record: recording };
/** Demos that keep going until you stop them; pressing their button again ends them. */
const TOGGLES = new Set<Name>(['timer', 'music', 'call', 'record']);

export const LIVE_CALLS: Record<Name, string> = {
  timer: "const timer = buoy.live({ label: 'Focus timer', expandable: true, render });\nsetInterval(() => timer.refresh(), 1000);",
  music: "const player = buoy.live({ label: 'Now playing', expandable: true, render });",
  call: "const call = buoy.live({ label: 'Design review', expandable: true, render });",
  undo: "buoy.live({ label: '3 files deleted', duration: 5000, render });",
  offline: "const offline = buoy.live({ label: \"You're offline\", render });",
  record: "const memo = buoy.live({ label: 'Recording', expandable: true, render });",
};

/** Starts a demo, or stops it if it is one that keeps going and is already running. */
export function toggleLive(name: Name): void {
  const live = running.get(name);
  if (live && TOGGLES.has(name)) return live.close();
  if (live) live.close();
  START[name]();
}

export function onLiveChange(listener: (name: Name, on: boolean) => void): void {
  onChange = listener;
}

export type LiveName = Name;
