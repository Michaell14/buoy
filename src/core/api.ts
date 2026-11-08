import { shared } from './shared';
import type { Atoll, AtollOptions, MessageOptions, PromiseOptions, TaskContext, TrackOptions } from './types';

const store = () => shared().store;

function message(title: string, options?: MessageOptions): string {
  return store().push(title, options);
}

/**
 * Show messages, promises and background work in the island.
 * Calls made before an island is mounted wait and appear once it is.
 */
export const atoll: Atoll = Object.assign(message, {
  success: (title: string, options?: MessageOptions) => store().push(title, { ...options, type: 'success' }),
  error: (title: string, options?: MessageOptions) => store().push(title, { ...options, type: 'error' }),
  warn: (title: string, options?: MessageOptions) => store().push(title, { ...options, type: 'warning' }),
  info: (title: string, options?: MessageOptions) => store().push(title, { ...options, type: 'info' }),
  promise: <T>(promise: Promise<T> | (() => Promise<T>), options?: PromiseOptions<T>) => store().promise(promise, options),
  dismiss: (id?: string) => store().dismiss(id),
  track: (run: (task: TaskContext) => unknown, options?: TrackOptions) => store().track(run, options),
  tasks: () => store().tasks(),
  tray: {
    open: () => store().openTray(),
    close: () => store().closeTray(),
    toggle: () => store().toggleTray(),
  },
  configure: (options: AtollOptions) => store().configure(options),
});
