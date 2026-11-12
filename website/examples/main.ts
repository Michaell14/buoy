// The examples page. Like the homepage, it runs the package source, so the island here is the code on main.
// One example shows at a time: its component and the island share the stage, and its code sits beside it.
import { shared } from '../../src/core/shared';
import { buoy, mount } from '../../src/vanilla';
import type { Theme } from '../../src/vanilla';
import { selectText, setCode } from '../code';
import { GROUPS, esc, type Example } from './kit';
import { LIVE } from './live';
import { MESSAGES } from './messages';
import { PROMISES } from './promises';
import { TASKS } from './tasks';
import { WORDING } from './wording';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const $$ = <T extends HTMLElement = HTMLElement>(selector: string) => Array.from(document.querySelectorAll<T>(selector));

function remember(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const THEMES: Theme[] = ['ink', 'frost', 'paper', 'notch'];
const savedTheme = remember('buoy-example-theme') as Theme | null;
let theme: Theme = savedTheme && THEMES.includes(savedTheme) ? savedTheme : 'ink';

// The island lives inside the stage rather than at the top of the window (see .ex-stage in examples.css).
mount({
  container: $('#ex-stage'),
  theme,
  // The empty pill shows where the island lives before an example has said anything.
  resting: 'pill',
  // Recent messages, in the tray that a tap on the resting pill opens.
  history: 5,
  offset: 16,
  colorScheme: 'light',
  // The work here is pretend, so leaving the page never asks for confirmation.
  guard: false,
});

/* ───── Examples ───── */

const EXAMPLES: Example[] = [...MESSAGES, ...PROMISES, ...TASKS, ...LIVE, ...WORDING];
const byId = new Map(EXAMPLES.map((example) => [example.id, example]));

const rail = $('#ex-rail');
rail.innerHTML = GROUPS.map(
  (group) =>
    `<div class="ex-group"><p class="ex-group-name">${group}</p>` +
    EXAMPLES.filter((example) => example.group === group)
      .map((example) => `<a class="ex-link" href="#${example.id}">${esc(example.title)}</a>`)
      .join('') +
    '</div>',
).join('');
const links = $$<HTMLAnchorElement>('.ex-link');

type Lang = 'react' | 'vanilla';
let lang: Lang = remember('buoy-example-code') === 'vanilla' ? 'vanilla' : 'react';
let current: Example | null = null;
let stop = () => {};

const code = $('#ex-code');
const showCode = () => {
  if (current) setCode(code, current.code[lang].trimEnd());
};

function show(example: Example) {
  if (example === current) return;
  // Leave the island as the last example found it: nothing running, nothing waiting.
  stop();
  buoy.tray.close();
  buoy.dismiss();
  // Each example words the island its own way, so every one starts from the defaults.
  buoy.configure({ labels: null, taskIcon: 'upload' });
  shared().store.state.history = [];

  current = example;
  const root = document.createElement('div');
  root.className = 'ex-component';
  $('#ex-slot').replaceChildren(root);
  stop = example.mount(root);

  $('#ex-kind').textContent = `${example.group} · ${example.api}`;
  $('#ex-title').textContent = example.title;
  $('#ex-blurb').textContent = example.blurb;
  $('#ex-hint').textContent = example.hint;
  $('#ex-notes').innerHTML = example.notes.map(([title, text]) => `<div><h2>${esc(title)}</h2><p>${esc(text)}</p></div>`).join('');
  showCode();
  $('#ex-code-panel').scrollTo(0, 0);
  document.title = `${example.title} · Buoy examples`;
  for (const link of links) {
    const on = link.hash === `#${example.id}`;
    if (on) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
    // On narrow screens the rail is a row to swipe through: keep the chosen one in view.
    if (on && rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: link.offsetLeft - rail.offsetLeft - 20 });
  }
}

const fromHash = () => byId.get(location.hash.slice(1)) ?? EXAMPLES[0];
window.addEventListener('hashchange', () => show(fromHash()));
show(fromHash());

/* ───── Code ───── */

const tabs = $$<HTMLButtonElement>('[data-lang]');
function selectTab(tab: HTMLButtonElement, focus: boolean) {
  lang = tab.dataset.lang as Lang;
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  $('#ex-code-panel').setAttribute('aria-labelledby', tab.id);
  showCode();
  remember('buoy-example-code', lang);
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
selectTab(tabs.find((tab) => tab.dataset.lang === lang)!, false);

// The island belongs to the example, so copying answers on the button itself.
const copyButton = $('#ex-copy');
let copied = 0;
function said(text: string) {
  copyButton.textContent = text;
  clearTimeout(copied);
  copied = window.setTimeout(() => {
    copyButton.textContent = 'Copy';
  }, 1800);
}
copyButton.addEventListener('click', () => {
  if (!current) return;
  let done: Promise<void>;
  try {
    done = navigator.clipboard.writeText(current.code[lang].trimEnd());
  } catch (error) {
    done = Promise.reject(error);
  }
  done.then(
    () => said('Copied'),
    () => {
      selectText(code);
      said('Selected');
    },
  );
});

/* ───── Themes ───── */

const themeButtons = $$<HTMLButtonElement>('[data-theme-name]');
function setTheme(next: Theme, save: boolean) {
  theme = next;
  buoy.configure({ theme });
  themeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.themeName === theme)));
  if (save) remember('buoy-example-theme', theme);
}
themeButtons.forEach((button) => button.addEventListener('click', () => setTheme(button.dataset.themeName as Theme, true)));
setTheme(theme, false);
