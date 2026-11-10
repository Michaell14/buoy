// Live activities: something ongoing that the app draws itself. Each component here owns the state,
// and the island draws from it with the activities the homepage demos use (../live.ts).
import { buoy } from '../../src/vanilla';
import type { LiveHandle } from '../../src/vanilla';
import {
  TRACKS,
  clock,
  playSecond,
  playerActivity,
  recordTick,
  recordedSeconds,
  recorderActivity,
  skipTrack,
  timerActivity,
  type PlayerState,
  type RecorderState,
  type TimerState,
} from '../live';
import { $, ICON, view, type Example } from './kit';
import playerReact from './code/player.react.txt';
import playerVanilla from './code/player.vanilla.txt';
import recordReact from './code/record.react.txt';
import recordVanilla from './code/record.vanilla.txt';
import timerReact from './code/timer.react.txt';
import timerVanilla from './code/timer.vanilla.txt';

const player: Example = {
  id: 'player',
  group: 'Live activities',
  title: 'Play a track',
  api: 'buoy.live()',
  blurb: 'A live activity is yours to draw. The player below and the island read the same state, so either one can drive it.',
  hint: 'Press play, then tap the island. Its controls drive the same player.',
  notes: [
    ['You draw it', 'render() fills the island with your own markup. The island keeps the shape, the motion and the queue.'],
    ['Two sizes', 'With expandable, a tap opens the details and render() is told expanded: true.'],
    ['One state, two views', 'refresh() draws again in place, without moving or announcing anything.'],
  ],
  code: { react: playerReact, vanilla: playerVanilla },
  mount(root) {
    const s: PlayerState = { i: 0, at: 0, playing: false };
    let live: LiveHandle | null = null;

    const draw = () => {
      const track = TRACKS[s.i];
      $(root, '.x-art').dataset.i = String(s.i);
      $(root, '.x-track').textContent = track.title;
      $(root, '.x-artist').textContent = `${track.artist} · ${track.album}`;
      $(root, '.x-at').textContent = clock(s.at);
      $(root, '.x-left').textContent = `-${clock(track.length - s.at)}`;
      $(root, '.x-bar > i').style.width = `${((s.at / track.length) * 100).toFixed(1)}%`;
      const toggle = $(root, '[data-do="toggle"]');
      const label = s.playing ? 'Pause' : 'Play';
      if (toggle.getAttribute('aria-label') !== label) {
        toggle.setAttribute('aria-label', label);
        toggle.innerHTML = s.playing ? ICON.pause : ICON.play;
      }
      $<HTMLButtonElement>(root, '[data-do="stop"]').disabled = !live;
    };
    const sync = () => {
      draw();
      live?.refresh();
    };
    // The activity opens on the first play and stays, paused or not, until the player stops.
    const open = () => {
      live ??= playerActivity(s, {
        change: draw,
        close: () => {
          live = null;
          s.playing = false;
          draw();
        },
      });
    };

    view(
      root,
      `<div class="x-card">
        <div class="x-head">
          <span class="x-art" aria-hidden="true"></span>
          <div class="x-text"><strong class="x-track"></strong><span class="x-artist"></span></div>
        </div>
        <div class="x-scrub"><span class="x-num x-at"></span><div class="x-bar"><i></i></div><span class="x-num x-left"></span></div>
        <div class="x-transport">
          <button type="button" class="x-icon" data-do="prev" aria-label="Previous track">${ICON.prev}</button>
          <button type="button" class="x-icon is-main" data-do="toggle"></button>
          <button type="button" class="x-icon" data-do="next" aria-label="Next track">${ICON.next}</button>
          <button type="button" class="x-icon" data-do="stop" aria-label="Stop">${ICON.stop}</button>
        </div>
      </div>`,
      (action) => {
        if (action === 'toggle') {
          s.playing = !s.playing;
          if (s.playing) open();
        }
        if (action === 'next') skipTrack(s, 1);
        if (action === 'prev') skipTrack(s, -1);
        if (action === 'stop') {
          s.at = 0;
          live?.close();
        }
        sync();
      },
    );
    draw();
    const tick = window.setInterval(() => {
      if (!s.playing) return;
      playSecond(s);
      sync();
    }, 1000);
    return () => {
      clearInterval(tick);
      live?.close();
    };
  },
};

const PRESETS = [1, 5, 25];

const timer: Example = {
  id: 'timer',
  group: 'Live activities',
  title: 'Run a focus timer',
  api: 'buoy.live() with refresh()',
  blurb: 'Anything that ticks can sit on the island. The countdown draws again every second without the island moving.',
  hint: 'Pick 1 min to watch it finish. Tap the island for pause and end.',
  notes: [
    ['Safe every second', 'refresh() draws again in place. Nothing moves and nothing is read out.'],
    ['Ends itself', 'When the time runs out the activity closes and an ordinary message takes its place.'],
    ['Fits every theme', 'Markup built from the island classes follows the theme. Try the switcher above.'],
  ],
  code: { react: timerReact, vanilla: timerVanilla },
  mount(root) {
    const s: TimerState = { total: 25 * 60, left: 25 * 60, running: false, ends: new Date() };
    let live: LiveHandle | null = null;

    const draw = () => {
      $(root, '.x-clock').textContent = clock(s.left);
      $(root, '[data-do="toggle"]').textContent = s.running ? 'Pause' : live ? 'Resume' : 'Start';
      $<HTMLButtonElement>(root, '[data-do="reset"]').disabled = !live;
      root.querySelectorAll<HTMLButtonElement>('[data-minutes]').forEach((preset) => preset.setAttribute('aria-pressed', String(Number(preset.dataset.minutes) * 60 === s.total)));
    };
    const sync = () => {
      draw();
      live?.refresh();
    };
    // Closing the activity, from here or from the island, puts the clock back to the start.
    const open = () => {
      live ??= timerActivity(s, {
        change: draw,
        close: () => {
          live = null;
          s.running = false;
          s.left = s.total;
          draw();
        },
      });
    };

    view(
      root,
      `<div class="x-card">
        <div class="x-text"><strong>Focus</strong><span>One thing, until the bell</span></div>
        <div class="x-clock" role="timer"></div>
        <div class="seg x-presets" role="group" aria-label="Length">
          ${PRESETS.map((minutes) => `<button type="button" data-do="preset" data-minutes="${minutes}">${minutes} min</button>`).join('')}
        </div>
        <div class="x-row">
          <button type="button" class="x-btn is-grow" data-do="toggle"></button>
          <button type="button" class="x-btn is-quiet" data-do="reset">Reset</button>
        </div>
      </div>`,
      (action, target) => {
        if (action === 'toggle') {
          s.running = !s.running;
          if (s.running) {
            s.ends = new Date(Date.now() + s.left * 1000);
            open();
          }
        }
        if (action === 'reset') live?.close();
        if (action === 'preset') {
          // A new length starts over, so the activity's "of 25:00" never goes stale.
          live?.close();
          s.total = s.left = Number(target.dataset.minutes) * 60;
        }
        sync();
      },
    );
    draw();
    const tick = window.setInterval(() => {
      if (!s.running) return;
      s.left--;
      if (s.left > 0) return sync();
      live?.close();
      buoy.success('Focus session done');
    }, 1000);
    return () => {
      clearInterval(tick);
      live?.close();
    };
  },
};

const record: Example = {
  id: 'record',
  group: 'Live activities',
  title: 'Record a voice memo',
  api: 'buoy.live() with onClose',
  blurb: 'An activity stays until you close it. This one can be stopped from the card or from the island, and saves the memo either way.',
  hint: 'Start a recording, then tap the island and stop it from there.',
  notes: [
    ['Stays until closed', 'A live activity has no timer of its own. It leaves when you call close().'],
    ['Told when it leaves', 'onClose runs however the activity ends, which is where the memo gets saved.'],
    ['Buttons go in the details', 'The compact view sits inside a button, so its markup stays plain. Controls belong in the expanded view.'],
  ],
  code: { react: recordReact, vanilla: recordVanilla },
  mount(root) {
    const s: RecorderState = { ticks: 0, paused: false, levels: [], saved: false };
    const memos: number[] = [];
    let live: LiveHandle | null = null;

    const draw = () => {
      const on = !!live;
      $(root, '.x-rec-idle').hidden = on;
      $(root, '.x-rec-live').hidden = !on;
      $(root, '.x-clock').textContent = clock(recordedSeconds(s));
      $(root, '.x-rec-dot').classList.toggle('is-on', on && !s.paused);
      $(root, '[data-do="pause"]').textContent = s.paused ? 'Resume' : 'Pause';
      const list = $(root, '.x-memos');
      const html = memos.map((seconds, i) => `<li><span>Voice memo ${i + 1}</span><span class="x-num">${clock(seconds)}</span></li>`).join('');
      if (list.innerHTML !== html) list.innerHTML = html;
      list.hidden = !memos.length;
    };
    const sync = () => {
      draw();
      live?.refresh();
    };
    const start = () => {
      Object.assign(s, { ticks: 0, paused: false, levels: [], saved: false });
      live = recorderActivity(s, {
        change: draw,
        // Stopping saves, from the card or from the island. Leaving the example throws the take away.
        close: () => {
          live = null;
          if (s.saved) {
            memos.push(recordedSeconds(s));
            buoy.success('Voice memo saved', { description: clock(recordedSeconds(s)) });
          }
          draw();
        },
      });
    };

    view(
      root,
      `<div class="x-card">
        <div class="x-text"><strong>Voice memos</strong><span>Nothing is recorded. The levels are pretend.</span></div>
        <button type="button" class="x-btn is-wide x-rec-idle" data-do="record"><span class="x-rec-dot is-on" aria-hidden="true"></span>Record</button>
        <div class="x-rec-live" hidden>
          <div class="x-rec-read"><span class="x-rec-dot" aria-hidden="true"></span><span class="x-clock is-small" role="timer"></span></div>
          <div class="x-row">
            <button type="button" class="x-btn is-quiet is-grow" data-do="pause"></button>
            <button type="button" class="x-btn is-grow" data-do="stop">Stop</button>
          </div>
        </div>
        <ul class="x-memos" hidden></ul>
      </div>`,
      (action) => {
        if (action === 'record' && !live) start();
        if (action === 'pause') s.paused = !s.paused;
        if (action === 'stop') {
          s.saved = true;
          live?.close();
        }
        sync();
      },
    );
    draw();
    const tick = window.setInterval(() => {
      if (!live || s.paused) return;
      recordTick(s);
      sync();
    }, 200);
    return () => {
      clearInterval(tick);
      s.saved = false;
      live?.close();
    };
  },
};

export const LIVE = [player, timer, record];
