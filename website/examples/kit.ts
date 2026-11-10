// What every example on the page is made of, and the small helpers their components share.
import { I } from '../live';

export const GROUPS = ['Messages', 'Promises', 'Tasks', 'Live activities'] as const;
export type Group = (typeof GROUPS)[number];

export interface Example {
  /** Also the page's hash, as in examples.html#upload. */
  id: string;
  group: Group;
  title: string;
  /** The call the example is about, shown above the title. */
  api: string;
  blurb: string;
  /** A line under the component: what to try. */
  hint: string;
  notes: ReadonlyArray<readonly [title: string, text: string]>;
  code: { react: string; vanilla: string };
  /** Builds the component in `root`. Returns a function that stops everything it started. */
  mount(root: HTMLElement): () => void;
}

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (text: string) => text.replace(/[&<>"']/g, (c) => ESC[c]);

export const $ = <T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string) => root.querySelector<T>(selector)!;

/** Fills `root`, and sends clicks on its `[data-do]` elements to `on`. */
export function view(root: HTMLElement, html: string, on: (action: string, target: HTMLElement) => void = () => {}): void {
  root.innerHTML = html;
  root.addEventListener('click', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-do]');
    if (target && root.contains(target)) on(target.dataset.do!, target);
  });
}

const svg = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const ICON = {
  ...I,
  file: svg('<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5"/>'),
  image: svg('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.75"/><path d="m20.5 15.5-4.5-4.5-8.5 8.5"/>'),
  upload: svg('<path d="M12 15V4.5"/><path d="M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>'),
  box: svg('<rect x="3.5" y="4.5" width="17" height="4.5" rx="1.5"/><path d="M5 9v8.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9"/><path d="M10 13h4"/>'),
  card: svg('<rect x="3.5" y="6" width="17" height="12" rx="2.5"/><path d="M3.5 10h17"/>'),
  check: svg('<path d="M5.5 12.5l4 4L18.5 7.5"/>'),
  minus: svg('<path d="M6.5 12h11"/>'),
  plus: svg('<path d="M12 6.5v11"/><path d="M6.5 12h11"/>'),
  retry: svg('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>'),
  resume: svg('<path d="M8.5 6v12l9.5-6z" fill="currentColor"/>'),
};

/** A shopping bag. The cart example passes it to the island as a custom icon. */
export const BAG = svg('<path d="M5.5 8.5h13l1 11h-15z"/><path d="M9 8.5a3 3 0 0 1 6 0"/>');
