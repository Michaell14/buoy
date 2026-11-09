// The website's script. It imports the package source rather than a published build,
// so the island on the site is always the code on main.
import { buoy, mount } from '../src/vanilla';
import type { TaskContext, Theme } from '../src/vanilla';

mount({
  resting: 'pill',
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

function copy(text: string, element: HTMLElement) {
  let done: Promise<void>;
  try {
    done = navigator.clipboard.writeText(text);
  } catch (error) {
    done = Promise.reject(error);
  }
  done.then(
    () => buoy('Copied to clipboard', { icon: 'copy' }),
    () => {
      selectText(element);
      buoy.warn("Couldn't copy here", { description: 'The text is selected, so you can copy it yourself.', expanded: true });
    },
  );
}

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
    DEMOS[name].run();
    showCall(name);
  }),
);
showCall('message');

$('#install').addEventListener('click', () => copy('npm i buoy-ui', $('#install-text')));

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
    buoy(`Switched to ${NAMES[theme]}`, { icon: 'check' });
  }),
);
setCode(themeCall, '<Buoy theme="ink" />');
