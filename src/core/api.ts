import { shared } from './shared';
import type { Buoy, BuoyOptions, LiveOptions, MessageOptions, PromiseOptions, TaskContext, TaskInfo, TrackOptions } from './types';

const store = () => shared().store;

function message(title: string, options?: MessageOptions): string {
  return store().push(title, options);
}

/**
 * Show messages, promises and background work in the island.
 * Calls made before an island is mounted wait and appear once it is.
 */
export const buoy: Buoy = Object.assign(message, {
  success: (title: string, options?: MessageOptions) => store().push(title, { ...options, type: 'success' }),
  error: (title: string, options?: MessageOptions) => store().push(title, { ...options, type: 'error' }),
  warn: (title: string, options?: MessageOptions) => store().push(title, { ...options, type: 'warning' }),
  info: (title: string, options?: MessageOptions) => store().push(title, { ...options, type: 'info' }),
  promise: <T>(promise: Promise<T> | (() => Promise<T>), options?: PromiseOptions<T>) => store().promise(promise, options),
  dismiss: (id?: string) => store().dismiss(id),
  track: <T>(run: (task: TaskContext) => T, options?: TrackOptions) => store().track(run, options),
  live: (options: LiveOptions) => store().live(options),
  tasks: () => store().tasks(),
  subscribe: (listener: (tasks: TaskInfo[]) => void) => store().onTasks(listener),
  tray: {
    open: () => store().openTray(),
    close: () => store().closeTray(),
    toggle: () => store().toggleTray(),
  },
  configure: (options: BuoyOptions) => store().configure(options),
});
