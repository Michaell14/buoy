import { useEffect, useRef, useSyncExternalStore } from 'react';
import { mount } from './core/mount';
import { shared } from './core/shared';
import type { BuoyOptions, Labels, MountHandle, MountOptions, TaskInfo } from './core/types';

export { buoy } from './core/api';
export type {
  Buoy as BuoyApi,
  BuoyOptions,
  ColorScheme,
  DismissReason,
  IconInput,
  IconName,
  Labels,
  LiveHandle,
  LiveOptions,
  LiveView,
  MessageAction,
  MessageOptions,
  MessageType,
  Position,
  PromiseOptions,
  Resting,
  TaskContext,
  TaskHandle,
  TaskInfo,
  TaskStatus,
  Theme,
  Tone,
  TrackOptions,
} from './core/types';

export type BuoyProps = Omit<MountOptions, keyof BuoyOptions> & BuoyOptions;

/**
 * Renders the island. Put it once near the root of your app, then call `buoy()` from anywhere.
 * It renders nothing in React's tree: the island lives in its own element at the end of <body>.
 */
export function Buoy(props: BuoyProps): null {
  const { container, injectStyles, nonce, labels, ...options } = props;
  const handle = useRef<MountHandle | null>(null);
  // Label functions are read through refs, so inline arrow functions don't reconfigure on every render.
  const latestLabels = useRef(labels);
  latestLabels.current = labels;
  // What does reconfigure: a label that is added or removed, or a piece of text that changes.
  const wording = Object.entries(labels ?? {})
    .map(([key, value]) => (typeof value === 'function' ? `${key}()` : value === undefined ? '' : `${key}=${value}`))
    .sort()
    .join('\n');

  useEffect(() => {
    const h = mount({ container, injectStyles, nonce });
    handle.current = h;
    return () => {
      handle.current = null;
      h.destroy();
    };
  }, [container, injectStyles, nonce]);

  const { store } = shared();
  const defaults = store.defaults;
  const { theme, position, resting, richColors, expandOnHover, duration, concurrency, guard, haptics, colorScheme, offset, taskIcon } = options;

  useEffect(() => {
    const d = defaults.options;
    // Start from the defaults, so a label that is no longer passed goes back to its own.
    const next = { ...defaults.labels } as Record<string, unknown>;
    type Given = Record<string, unknown> | undefined;
    for (const [key, value] of Object.entries((latestLabels.current as Given) ?? {})) {
      if (typeof value === 'function') {
        next[key] = (...args: unknown[]) => {
          const latest = (latestLabels.current as Given)?.[key];
          return (typeof latest === 'function' ? latest : value)(...args);
        };
      } else if (value !== undefined) {
        next[key] = value;
      }
    }
    // Missing props go back to their defaults, so removing a prop undoes it.
    store.configure({
      theme: theme ?? d.theme,
      position: position ?? d.position,
      resting: resting ?? d.resting,
      richColors: richColors ?? d.richColors,
      expandOnHover: expandOnHover ?? d.expandOnHover,
      duration: duration ?? d.duration,
      concurrency: concurrency ?? d.concurrency,
      guard: guard ?? d.guard,
      haptics: haptics ?? d.haptics,
      colorScheme: colorScheme ?? d.colorScheme,
      offset: offset ?? d.offset,
      taskIcon: taskIcon ?? d.taskIcon,
      labels: next as unknown as Labels,
    });
  }, [store, defaults, theme, position, resting, richColors, expandOnHover, duration, concurrency, guard, haptics, colorScheme, offset, taskIcon, wording]);

  return null;
}

const NO_TASKS: TaskInfo[] = [];

/** The current tasks, kept in sync. Use it to show progress somewhere else in your UI. */
export function useBuoyTasks(): TaskInfo[] {
  const { store } = shared();
  const cache = useRef<{ version: number; tasks: TaskInfo[] }>({ version: -1, tasks: NO_TASKS });
  return useSyncExternalStore(
    (onChange) => store.subscribe(() => onChange()),
    () => {
      if (cache.current.version !== store.state.version) cache.current = { version: store.state.version, tasks: store.tasks() };
      return cache.current.tasks;
    },
    () => NO_TASKS,
  );
}
