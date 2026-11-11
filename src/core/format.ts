import type { Task } from './store';
import type { Labels } from './types';

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

/** "5 s left", then "2 min left". */
export const timeLeft = (seconds: number): string => (seconds < 60 ? `${seconds} s left` : `${Math.round(seconds / 60)} min left`);

export function eta(t: Task, labels: Labels): string {
  if (!(t.rate > 0) || !(t.total > 0)) return '';
  return labels.timeLeft(Math.max(1, Math.round((t.total - t.loaded) / t.rate)));
}

/** Right-hand label on a tray row. */
export function stateText(t: Task, labels: Labels): string {
  switch (t.status) {
    case 'running': return `${Math.round(frac(t) * 100)}%`;
    case 'queued': return labels.queued;
    case 'paused': return labels.paused;
    case 'failed': return labels.failed;
    default: return t.total > 0 && !t.format ? labels.size(t.total) : labels.done;
  }
}

/** Second line on a tray row. */
export function metaText(t: Task, labels: Labels): string {
  const amt = t.total > 0 ? (t.format ? t.format(t.loaded, t.total) : labels.amount(t.loaded, t.total)) : `${Math.round(frac(t) * 100)}%`;
  switch (t.status) {
    case 'running': {
      const left = eta(t, labels);
      return left ? `${amt} · ${left}` : amt;
    }
    case 'queued': return labels.notStarted;
    case 'paused': return amt;
    case 'failed': return t.total > 0 ? labels.failedAt(t.error, amt) : t.error;
    default: return t.doneLabel || labels.finished;
  }
}
