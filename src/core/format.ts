import type { Task } from './store';

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

type Progressing = Pick<Task, 'status' | 'total' | 'loaded' | 'fraction'>;
export const frac = (t: Progressing): number =>
  t.status === 'done' ? 1 : t.total > 0 ? clamp(t.loaded / t.total, 0, 1) : t.fraction;

const UNITS: ReadonlyArray<readonly [number, string]> = [[1e9, 'GB'], [1e6, 'MB'], [1e3, 'KB']];
function unitFor(total: number): readonly [number, string] {
  for (const unit of UNITS) if (total >= unit[0]) return unit;
  return [1, 'B'];
}
const num = (v: number): string => (v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));

/** "18.2 of 24 MB", sized by the total. */
export function amount(loaded: number, total: number): string {
  const [d, u] = unitFor(total);
  return `${num(loaded / d)} of ${num(total / d)} ${u}`;
}

export function size(total: number): string {
  const [d, u] = unitFor(total);
  return `${num(total / d)} ${u}`;
}

export function eta(t: Task): string {
  if (!(t.rate > 0) || !(t.total > 0)) return '';
  const s = Math.max(1, Math.round((t.total - t.loaded) / t.rate));
  return s < 60 ? `${s} s left` : `${Math.round(s / 60)} min left`;
}

/** Right-hand label on a tray row. */
export function stateText(t: Task): string {
  switch (t.status) {
    case 'running': return `${Math.round(frac(t) * 100)}%`;
    case 'queued': return 'Queued';
    case 'paused': return 'Paused';
    case 'failed': return 'Failed';
    default: return t.total > 0 && !t.format ? size(t.total) : 'Done';
  }
}

/** Second line on a tray row. */
export function metaText(t: Task): string {
  const amt = t.total > 0 ? (t.format ? t.format(t.loaded, t.total) : amount(t.loaded, t.total)) : `${Math.round(frac(t) * 100)}%`;
  switch (t.status) {
    case 'running': {
      const left = eta(t);
      return left ? `${amt} · ${left}` : amt;
    }
    case 'queued': return 'Waiting to start';
    case 'paused': return amt;
    case 'failed': return t.total > 0 ? `${t.error} at ${amt}` : t.error;
    default: return t.doneLabel || 'Finished';
  }
}
