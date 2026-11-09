// The website's script. It imports the package source rather than a published build,
// so the island on the site is always the code on main.
import { buoy, mount } from '../src/vanilla';
import type { TaskContext, Theme } from '../src/vanilla';
import { LIVE_CALLS, onLiveChange, toggleLive, type LiveName } from './live';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const $$ = <T extends HTMLElement = HTMLElement>(selector: string) => Array.from(document.querySelectorAll<T>(selector));

// The island starts over the dark hero, and takes the dark-page styling while the hero is under it.
const sea = $('.sea');
const seaScheme = (): 'dark' | 'light' => (sea.getBoundingClientRect().bottom > 36 ? 'dark' : 'light');
let scheme = seaScheme();

mount({
  // The island tucks away when it has nothing to show, rather than sitting there as an empty pill.
  resting: 'hidden',
  offset: 16,
  colorScheme: scheme,
  // The uploads here are pretend, so leaving the page never asks for confirmation.
  guard: false,
  labels: {
    noun: 'upload',
    active: (list) => (list.length === 1 ? `Uploading ${list[0].label}` : `Uploading ${list.length} files`),
    doneOne: (task) => `Uploaded ${task.label}`,
    doneMany: (count) => `${count} uploads finished`,
  },
});

function followScheme() {
  const next = seaScheme();
  if (next === scheme) return;
  scheme = next;
  buoy.configure({ colorScheme: next });
}
window.addEventListener('scroll', followScheme, { passive: true });
window.addEventListener('resize', followScheme);

/* ───── Code ───── */

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TOKENS =
  /(\/\/[^\n]*|&lt;!--[\s\S]*?--&gt;)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|(&lt;\/?)([A-Za-z][\w.-]*)|\b(const|let|import|from|export|default|function|return|await|async|new)\b|([A-Za-z_$][\w$]*)(?=\()/g;

function highlight(source: string): string {
  return escape(source).replace(TOKENS, (match, comment, string, open, tag, keyword, call) => {
    if (comment) return `<span class="t-c">${comment}</span>`;
    if (string) return `<span class="t-s">${string}</span>`;
    if (open) return `${open}<span class="t-g">${tag}</span>`;
    if (keyword) return `<span class="t-k">${keyword}</span>`;
    if (call) return `<span class="t-f">${call}</span>`;
    return match;
  });
}
const setCode = (element: HTMLElement, source: string) => {
  element.innerHTML = highlight(source);
};

function selectText(element: HTMLElement) {
  try {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  } catch {
    // Selecting is only the fallback for a refused copy.
  }
}

/** Copies text and says so on the island. */
function copy(text: string, element: HTMLElement) {
  let done: Promise<void>;
  try {
    done = navigator.clipboard.writeText(text);
  } catch (error) {
    done = Promise.reject(error);
  }
  done.then(
    () => note((id) => buoy.success('Copied to clipboard', { id, duration: 2000 }), 1800),
    () => {
      selectText(element);
      note((id) => buoy.warn("Couldn't copy here", { id, description: 'The text is selected, so you can copy it yourself.', expanded: true }), 2800);
    },
  );
}

/* ───── Welcome ───── */

// The island greets visitors, then holds the install command until the first demo replaces it for good.
const WELCOME = 'welcome';
// The hero's package-manager picker. The choice is remembered for the next visit.
const COMMANDS: Record<string, string> = {
  npm: 'npm i buoy-ui',
  pnpm: 'pnpm add buoy-ui',
  yarn: 'yarn add buoy-ui',
  bun: 'bun add buoy-ui',
  shadcn: 'npx shadcn@latest add https://buoy-ui.vercel.app/r/buoy.json',
};
const NOTES: Record<string, string> = {
  shadcn: 'Adds components/ui/buoy.tsx, matched to your theme.',
};
function remember(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
let manager = remember('buoy-pm') ?? 'npm';
if (!(manager in COMMANDS)) manager = 'npm';
const installCommand = () => COMMANDS[manager];
const LOGO =
  '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="11" fill="none" transform="rotate(-60 16 16)" style="stroke: var(--a-accent); stroke-width: 4.5; stroke-linecap: round; stroke-dasharray: 54 70"/><rect x="9" y="12.5" width="14" height="7" rx="3.5" fill="currentColor"/></svg>';
const PROMPT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5.5 7.5l4.5 4.5-4.5 4.5"/><path d="M12.5 17h6"/></svg>';

let welcoming = true;
let welcomeTimer = 0;
let installShown = false;

function showInstall() {
  if (!welcoming) return;
  installShown = true;
  buoy(installCommand(), { id: WELCOME, icon: PROMPT, persist: true, action: { label: 'Copy', onClick: copyFromIsland } });
}

function copyFromIsland() {
  copy(installCommand(), $('#install-text'));
}

/**
 * Shows a short message. While the welcome is up, the message takes its place and hands it back
 * after `ms`, so the install command never waits in the queue behind it.
 */
function note(show: (id?: string) => void, ms: number) {
  if (!welcoming) {
    show();
    return;
  }
  clearTimeout(welcomeTimer);
  show(WELCOME);
  welcomeTimer = window.setTimeout(showInstall, ms);
}

function endWelcome() {
  if (!welcoming) return;
  welcoming = false;
  clearTimeout(welcomeTimer);
  buoy.dismiss(WELCOME);
}

buoy('Welcome to Buoy', { id: WELCOME, icon: LOGO, persist: true });
welcomeTimer = window.setTimeout(showInstall, 2000);

/* ───── Demos ───── */

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const save = (ms: number) => wait(ms);

function pretendUpload(megabytes: number, speed: number) {
  return async (task: TaskContext) => {
    const total = megabytes * 1e6;
    let loaded = 0;
    task.progress(0, total);
    while (loaded < total) {
      await wait(100);
      await task.checkpoint();
      if (task.signal.aborted) throw new DOMException('Canceled', 'AbortError');
      loaded = Math.min(total, loaded + speed * 1e5 * (0.55 + Math.random() * 0.9));
      task.progress(loaded, total);
    }
  };
}

function upload(name: string, megabytes: number, speed: number) {
  return buoy.track(pretendUpload(megabytes, speed), {
    label: name,
    total: megabytes * 1e6,
    icon: /\.(heic|png|jpe?g|webp)$/i.test(name) ? 'image' : 'file',
    doneLabel: 'Uploaded just now',
    onOpen: (task) => buoy(`Opened ${task.label}`, { icon: 'open' }),
  });
}

const busy = () => buoy.tasks().some((t) => t.status === 'running' || t.status === 'queued' || t.status === 'paused');

const DEMOS: Record<string, { call: string; run: () => void }> = {
  message: {
    call: "buoy('Link copied', { icon: 'link' });",
    run: () => buoy('Link copied', { icon: 'link' }),
  },
  promise: {
    call: "buoy.promise(save(), { loading: 'Saving…', success: 'Saved to drafts' });",
    run: () => void buoy.promise(save(1400), { loading: 'Saving…', success: 'Saved to drafts', error: "Couldn't save" }),
  },
  expanded: {
    call: "buoy('Export ready', { description, actions, expanded: true });",
    run: () =>
      buoy('Export ready', {
        description: 'Q3-report.pdf · 4.2 MB',
        icon: 'file',
        tone: 'accent',
        expanded: true,
        actions: [
          { label: 'Open', primary: true, onClick: () => buoy('Opened Q3-report.pdf', { icon: 'open' }) },
          { label: 'Show in folder', onClick: () => buoy('Showing Q3-report.pdf in Downloads', { icon: 'folder' }) },
        ],
      }),
  },
  error: {
    call: "buoy.error(\"Couldn't save\", { action: { label: 'Retry', onClick: retry } });",
    run: () =>
      buoy.error("Couldn't save", {
        action: { label: 'Retry', onClick: () => void buoy.promise(save(1100), { loading: 'Saving…', success: 'Saved to drafts' }) },
      }),
  },
  upload: {
    call: 'buoy.track((task) => upload(file, task), { label: file.name });',
    run: () => upload('beach-sunset.heic', 24, 3.4),
  },
  two: {
    call: "buoy('Message sent', { icon: 'send' }); // while an upload runs",
    run: () => {
      if (busy()) {
        buoy('Message sent', { icon: 'send' });
        return;
      }
      upload('holiday-video.mov', 48, 5.5);
      setTimeout(() => buoy('Message sent', { icon: 'send' }), 700);
    },
  },
};

const call = $('#call');
const chips = $$<HTMLButtonElement>('[data-demo]');
function showCall(name: string) {
  setCode(call, DEMOS[name].call);
  chips.forEach((chip) => chip.classList.toggle('is-current', chip.dataset.demo === name));
}
chips.forEach((chip) =>
  chip.addEventListener('click', () => {
    const name = chip.dataset.demo!;
    endWelcome();
    DEMOS[name].run();
    showCall(name);
  }),
);
showCall('message');

/* ───── Live activities ───── */

const liveCall = $('#live-call');
const liveChips = $$<HTMLButtonElement>('[data-live]');
onLiveChange((name, on) => {
  const chip = liveChips.find((c) => c.dataset.live === name);
  if (chip && chip.hasAttribute('aria-pressed')) chip.setAttribute('aria-pressed', String(on));
});
liveChips.forEach((chip) =>
  chip.addEventListener('click', () => {
    const name = chip.dataset.live as LiveName;
    endWelcome();
    toggleLive(name);
    setCode(liveCall, LIVE_CALLS[name]);
  }),
);
setCode(liveCall, LIVE_CALLS.timer);

$('#install').addEventListener('click', () => copy(installCommand(), $('#install-text')));

/* ───── Install picker ───── */

const managerButtons = $$<HTMLButtonElement>('[data-pm]');
function pickManager(next: string, save: boolean) {
  manager = next;
  const command = installCommand();
  $('#install-text').textContent = command;
  $('#install').setAttribute('aria-label', `Copy ${command}`);
  $('#install').title = command;
  $('#install-note').textContent = NOTES[next] ?? '';
  managerButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pm === next)));
  if (save) remember('buoy-pm', next);
  // While the island is holding the install command, it shows the one you picked.
  if (welcoming && installShown) showInstall();
}
managerButtons.forEach((b) => b.addEventListener('click', () => pickManager(b.dataset.pm!, true)));
pickManager(manager, false);

/* ───── Setup tabs ───── */

const SETUP: Record<string, string> = {
  react: `import { Buoy, buoy } from 'buoy-ui';

export default function App() {
  return <Buoy />;
}

buoy('Link copied', { icon: 'link' });`,
  next: `// app/layout.tsx
import { Buoy } from 'buoy-ui';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Buoy />
      </body>
    </html>
  );
}

// Then call buoy() from any client component.`,
  vue: `// main.ts
import { createApp } from 'vue';
import { buoy, mount } from 'buoy-ui/vanilla';
import App from './App.vue';

createApp(App).mount('#app');
mount();

buoy('Link copied', { icon: 'link' });`,
  svelte: `<!-- App.svelte -->
<script>
  import { onMount } from 'svelte';
  import { buoy, mount } from 'buoy-ui/vanilla';

  onMount(() => {
    const island = mount();
    return () => island.destroy();
  });
</script>

<button onclick={() => buoy('Link copied', { icon: 'link' })}>Copy link</button>`,
  solid: `// App.tsx
import { onCleanup, onMount } from 'solid-js';
import { buoy, mount } from 'buoy-ui/vanilla';

export default function App() {
  onMount(() => {
    const island = mount();
    onCleanup(() => island.destroy());
  });
  return <button onClick={() => buoy('Link copied', { icon: 'link' })}>Copy link</button>;
}`,
  vanilla: `import { buoy, mount } from 'buoy-ui/vanilla';

mount();

buoy('Link copied', { icon: 'link' });`,
  script: `<script src="https://unpkg.com/buoy-ui/dist/buoy.global.js"></script>
<script>
  const { buoy, mount } = window.Buoy;
  mount();
  buoy('Link copied', { icon: 'link' });
</script>`,
};

const tabs = $$<HTMLButtonElement>('[role="tab"]');
const panel = $('#usage-panel');
const usageCode = $('#usage-code');
let setup = 'react';

function selectTab(tab: HTMLButtonElement, focus: boolean) {
  setup = tab.dataset.tab!;
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', tab.id);
  setCode(usageCode, SETUP[setup]);
  remember('buoy-framework', setup);
  if (focus) tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab, false));
  tab.addEventListener('keydown', (event) => {
    const n = tabs.length;
    const keys: Record<string, number> = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    selectTab(tabs[keys[event.key]], true);
  });
});
const savedTab = tabs.find((t) => t.dataset.tab === remember('buoy-framework'));
if (savedTab) selectTab(savedTab, false);
else setCode(usageCode, SETUP.react);
$('#usage-copy').addEventListener('click', () => copy(SETUP[setup], usageCode));

/* ───── Themes ───── */

const NAMES: Record<Theme, string> = { ink: 'Ink', frost: 'Frost', paper: 'Paper', notch: 'Notch' };
const themeButtons = $$<HTMLButtonElement>('[data-theme-name]');
const themeCall = $('#theme-call');
themeButtons.forEach((button) =>
  button.addEventListener('click', () => {
    const theme = button.dataset.themeName as Theme;
    buoy.configure({ theme });
    themeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    setCode(themeCall, `<Buoy theme="${theme}" />`);
    note((id) => buoy(`Switched to ${NAMES[theme]}`, { id, icon: 'check' }), 2000);
  }),
);
setCode(themeCall, '<Buoy theme="ink" />');
