export const ICONS = {
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.1 1.1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.1-1.1"/>',
  check: '<path class="draw" d="M5.5 12.5l4 4L18.5 7.5"/>',
  error: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v4.5"/><path d="M12 16h.01"/>',
  warning: '<path d="M10.3 4.6 3 17.5a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M12 7.8h.01"/>',
  upload: '<path d="M12 15V4.5"/><path d="M7.5 9 12 4.5 16.5 9"/><path d="M4.5 15v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
  download: '<path d="M12 4.5V15"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4.5 15v2.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
  file: '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5"/><path d="M9 13h6"/><path d="M9 16.5h4"/>',
  archive: '<path d="M14 3.5H7.5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V8z"/><path d="M14 3.5V8h4.5"/><path d="M11 9.5h2"/><path d="M11 12.5h2"/><path d="M11 15.5h2"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.75"/><path d="m20.5 15.5-4.5-4.5-8.5 8.5"/>',
  send: '<path d="M20.5 3.5 10 14"/><path d="m20.5 3.5-6.5 17-4-6.5-6.5-4z"/>',
  folder: '<path d="M3.5 7.5a2 2 0 0 1 2-2h3.6l2 2h7.4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  copy: '<rect x="8.5" y="8.5" width="11" height="11" rx="2.5"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>',
  stack: '<path d="m12 4 8 4.5-8 4.5-8-4.5z"/><path d="m4 13 8 4.5 8-4.5"/>',
  bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 2"/><path d="M9.5 3h5"/>',
  user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5a7 7 0 0 1 14 0"/>',
  pause: '<path d="M9 6v12"/><path d="M15 6v12"/>',
  play: '<path d="M8.5 6v12l9.5-6z" fill="currentColor"/>',
  retry: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
  x: '<path d="m6.5 6.5 11 11"/><path d="m17.5 6.5-11 11"/>',
  open: '<path d="M7 17 17 7"/><path d="M9 7h8v8"/>',
  up: '<path d="M6.5 14.5 12 9l5.5 5.5"/>',
  down: '<path d="M6.5 9.5 12 15l5.5-5.5"/>',
} as const;

export type IconName = keyof typeof ICONS;

const OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';

/** A built-in icon by name, or a custom `<svg>` string passed through as is. Custom SVG must be trusted markup. */
export function iconHTML(icon: string | null | undefined): string {
  if (!icon) return '';
  if (Object.prototype.hasOwnProperty.call(ICONS, icon)) return `${OPEN}${ICONS[icon as IconName]}</svg>`;
  return /^\s*<svg[\s>]/i.test(icon) ? icon : '';
}

export const spinnerHTML = '<svg class="atoll-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5" opacity=".22"/><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5"/></svg>';

const RING = 2 * Math.PI * 10.5;
const offset = (f: number) => (RING * (1 - Math.min(1, Math.max(0, f)))).toFixed(2);

export function ringHTML(fraction: number, muted: boolean): string {
  return `<svg class="atoll-ring${muted ? ' is-muted' : ''}" viewBox="0 0 28 28" aria-hidden="true" focusable="false"><circle class="trk" cx="14" cy="14" r="10.5"/><circle class="val" cx="14" cy="14" r="10.5" style="stroke-dasharray:${RING.toFixed(2)};stroke-dashoffset:${offset(fraction)};opacity:${fraction > 0.004 ? 1 : 0}"/></svg>`;
}

export function setRing(svg: Element | null, fraction: number): void {
  const val = svg && (svg.querySelector('.val') as SVGElement | null);
  if (!val) return;
  val.style.strokeDashoffset = offset(fraction);
  val.style.opacity = fraction > 0.004 ? '1' : '0';
}
