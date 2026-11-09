// The website's script. It imports the package source rather than a published build,
// so the island on the site is always the code on main.
import { buoy, mount } from '../src/vanilla';
import type { TaskContext, Theme } from '../src/vanilla';
import { LIVE_CALLS, onLiveChange, toggleLive, type LiveName } from './live';

mount({
  // The island tucks away when it has nothing to show, rather than sitting there as an empty pill.
  resting: 'hidden',
  offset: 16,
  colorScheme: 'light',
  // The uploads here are pretend, so leaving the page never asks for confirmation.
  guard: false,
  labels: {
    noun: 'upload',
    active: (list) => (list.length === 1 ? `Uploading ${list[0].label}` : `Uploading ${list.length} files`),
    doneOne: (task) => `Uploaded ${task.label}`,
    doneMany: (count) => `${count} uploads finished`,
  },
});

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const $$ = <T extends HTMLElement = HTMLElement>(selector: string) => Array.from(document.querySelectorAll<T>(selector));

/* ───── Code ───── */

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TOKENS =
  /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|(&lt;\/?)([A-Za-z][\w.-]*)|\b(const|let|import|from|export|default|function|return|await|async|new)\b|([A-Za-z_$][\w$]*)(?=\()/g;

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
const INSTALL = 'npm i buoy-ui';
const LOGO =
  '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="11" fill="none" transform="rotate(-60 16 16)" style="stroke: var(--a-accent); stroke-width: 4.5; stroke-linecap: round; stroke-dasharray: 54 70"/><rect x="9" y="12.5" width="14" height="7" rx="3.5" fill="currentColor"/></svg>';
const PROMPT =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5.5 7.5l4.5 4.5-4.5 4.5"/><path d="M12.5 17h6"/></svg>';

let welcoming = true;
let welcomeTimer = 0;

function showInstall() {
  if (!welcoming) return;
  buoy(INSTALL, { id: WELCOME, icon: PROMPT, persist: true, action: { label: 'Copy', onClick: copyFromIsland } });
}

function copyFromIsland() {
  copy(INSTALL, $('#install-text'));
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

$('#install').addEventListener('click', () => copy(INSTALL, $('#install-text')));

/* ───── Setup tabs ───── */

const SETUP: Record<string, string> = {
  react: `import { Buoy, buoy } from 'buoy-ui';

export default function App() {
  return <Buoy />;
}

buoy('Link copied', { icon: 'link' });`,
  vanilla: `import { buoy, mount } from 'buoy-ui/vanilla';

mount();

buoy('Link copied', { icon: 'link' });`,
  shadcn: `// npx shadcn@latest add https://buoy-ui.vercel.app/r/buoy.json
import { Buoy, buoy } from '@/components/ui/buoy';

export default function App() {
  return <Buoy />;
}

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
setCode(usageCode, SETUP.react);
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
