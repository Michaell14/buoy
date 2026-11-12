import { createElement, Fragment, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { ReactElement, ReactNode, ReactPortal } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { buoy as core } from './core/api';
import { mount } from './core/mount';
import { shared } from './core/shared';
import type { NewMessage } from './core/store';
import type {
  Buoy as CoreBuoy,
  BuoyOptions,
  DismissReason,
  Labels,
  LiveHandle,
  LiveView,
  MessageOptions,
  MessageType,
  MountHandle,
  MountOptions,
  TaskInfo,
} from './core/types';

/* ───── Messages with React content ───── */

/** Message options, with React content allowed in the description. */
export interface BuoyMessageOptions extends Omit<MessageOptions, 'description'> {
  description?: ReactNode;
}

/** `buoy()` from the React entry: the same API, and titles and descriptions can be React content. */
export type BuoyReact = Omit<CoreBuoy, 'success' | 'error' | 'warn' | 'info'> & {
  (title: ReactNode, options?: BuoyMessageOptions): string;
  success(title: ReactNode, options?: BuoyMessageOptions): string;
  error(title: ReactNode, options?: BuoyMessageOptions): string;
  warn(title: ReactNode, options?: BuoyMessageOptions): string;
  info(title: ReactNode, options?: BuoyMessageOptions): string;
};

/** The React content of each message that has some, by message id. */
const content = new Map<string, { title: ReactNode; description: ReactNode }>();
/** Draws React content into the island. The mounted <Buoy /> provides it. */
let host: ((el: HTMLElement, node: ReactNode) => void) | null = null;
let made = 0;

const asText = (node: ReactNode): string | null => (typeof node === 'string' || typeof node === 'number' ? String(node) : null);
const absent = (node: ReactNode) => node === undefined || node === null || node === false || node === '';

function show(type: MessageType | undefined, title: ReactNode, options: BuoyMessageOptions = {}): string {
  const { store } = shared();
  const text = asText(title);
  const description = absent(options.description) ? undefined : asText(options.description);
  // Plain text takes the usual path, which also works without React on the page.
  if (text !== null && (absent(options.description) || description !== null)) {
    if (options.id) content.delete(options.id);
    return store.push(text, { ...options, description: description ?? undefined, type } as NewMessage);
  }
  const id = options.id ?? `buoy-react-${++made}`;
  content.set(id, { title, description: options.description });
  const { onDismiss } = options;
  return store.push(text ?? '', {
    ...options,
    id,
    type,
    // The island needs to know there is a description, so it opens on hover or tap.
    description: absent(options.description) ? undefined : (description ?? ' '),
    fill: (slot, el) => {
      const node = content.get(id)?.[slot];
      if (host) host(el, node);
      else el.textContent = asText(node ?? null) ?? '';
    },
    onDismiss: (reason) => {
      content.delete(id);
      onDismiss?.(reason);
    },
  } as NewMessage);
}

/**
 * Shows messages, promises and background work in the island. From the React entry, a message's
 * title and description can be React content, such as `buoy(<>Saved <b>{name}</b></>)`, drawn by the
 * mounted `<Buoy />`. Everything else is the same as `buoy` from `buoy-ui/vanilla`.
 */
export const buoy: BuoyReact = Object.assign((title: ReactNode, options?: BuoyMessageOptions) => show(undefined, title, options), core, {
  success: (title: ReactNode, options?: BuoyMessageOptions) => show('success', title, options),
  error: (title: ReactNode, options?: BuoyMessageOptions) => show('error', title, options),
  warn: (title: ReactNode, options?: BuoyMessageOptions) => show('warning', title, options),
  info: (title: ReactNode, options?: BuoyMessageOptions) => show('info', title, options),
});

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
  PastMessage,
  Position,
  PromiseMessage,
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
export function Buoy(props: BuoyProps): ReactElement {
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
  const { theme, position, resting, richColors, expandOnHover, duration, concurrency, guard, haptics, colorScheme, offset, taskIcon, history } = options;

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
      history: history ?? d.history,
      labels: next as unknown as Labels,
    });
  }, [store, defaults, theme, position, resting, richColors, expandOnHover, duration, concurrency, guard, haptics, colorScheme, offset, taskIcon, history, wording]);

  // React content in messages: the island hands over an element, and this draws into it at once,
  // since the island measures the content as soon as it is drawn.
  const [portals, setPortals] = useState<Array<{ el: HTMLElement; node: ReactNode; key: number }>>([]);
  const latest = useRef(portals);
  latest.current = portals;
  useEffect(() => {
    let keys = 0;
    const draw = (el: HTMLElement, node: ReactNode) =>
      flushSync(() => setPortals((list) => [...list.filter((p) => p.el !== el && p.el.isConnected), { el, node, key: ++keys }]));
    host = draw;
    // Let go of content whose message has left the island.
    const stop = store.subscribe(() => {
      if (latest.current.some((p) => !p.el.isConnected)) setPortals((list) => list.filter((p) => p.el.isConnected));
    });
    return () => {
      stop();
      if (host === draw) host = null;
    };
  }, [store]);

  return createElement(Fragment, null, ...portals.map((p) => createPortal(p.node, p.el, String(p.key))));
}

const NO_TASKS: TaskInfo[] = [];

/** The current tasks, kept in sync. Use it to show progress somewhere else in your UI. */
export function useBuoyTasks(): TaskInfo[] {
  const { store } = shared();
  // The list is the same object until a task changes, so a new message alone does not render again.
  return useSyncExternalStore(
    (onChange) => store.subscribe(() => onChange()),
    store.snapshot,
    () => NO_TASKS,
  );
}

/** What a live activity's children are told: whether its details are open, and how to open, close or end it. */
export interface BuoyLiveView extends LiveView {
  /** Opens or closes the details of an expandable activity. */
  expand(open?: boolean): void;
  /** Takes the activity off the island. `onClose` hears about it. */
  close(): void;
}

export interface BuoyLiveProps {
  /** What the activity is, for screen readers. Read out when it appears, and again when it changes. */
  label: string;
  /** A tap opens the details: `children` is called with `expanded: true`. Esc or a click outside closes them. */
  expandable?: boolean;
  /** Leaves after this many milliseconds. Without it, the activity stays for as long as the component is rendered. */
  duration?: number;
  /** Called when the activity leaves while the component is still rendered, with the reason. Stop rendering it then. */
  onClose?: (reason: DismissReason) => void;
  /** What to draw: React content, or a function of the view when the compact and expanded layouts differ. */
  children: ReactNode | ((view: BuoyLiveView) => ReactNode);
}

/**
 * A live activity as a component. Its children are on the island for as long as it is rendered, and
 * they are ordinary React content: state and props update them, with no `render` or `refresh()`.
 * Like `buoy.live()`, the compact view of an expandable activity sits inside a button, so keep
 * controls for the expanded view.
 */
export function BuoyLive(props: BuoyLiveProps): ReactPortal | null {
  const { label, expandable = false, duration, children } = props;
  const id = useId();
  // Where the island wants the content right now. It hands over a new element whenever the view changes.
  const [target, setTarget] = useState<{ el: HTMLElement; expanded: boolean } | null>(null);
  const live = useRef<LiveHandle | null>(null);
  const onClose = useRef(props.onClose);
  onClose.current = props.onClose;
  // What the activity was last shown with, and how to show it again when that changes.
  const wanted = `${label}\n${expandable}\n${duration}`;
  const shown = useRef('');
  const show = useRef<(() => LiveHandle) | null>(null);
  const latest = useRef({ label, expandable, duration, wanted });
  latest.current = { label, expandable, duration, wanted };

  useEffect(() => {
    let unmounting = false;
    show.current = () => {
      const { wanted: key, ...options } = latest.current;
      shown.current = key;
      return shared().store.live({
        id,
        ...options,
        // The island measures the content as soon as this returns, so React has to draw it now.
        render: (el, view) =>
          flushSync(() => setTarget((now) => (now && now.el === el && now.expanded === view.expanded ? now : { el, expanded: view.expanded }))),
        onClose: (reason) => {
          live.current = null;
          setTarget(null);
          if (!unmounting) onClose.current?.(reason);
        },
      });
    };
    live.current = show.current();
    return () => {
      unmounting = true;
      show.current = null;
      live.current?.close();
    };
  }, [id]);

  // A new label or option goes to the same activity in place, which keeps its details open.
  useEffect(() => {
    if (live.current && show.current && shown.current !== wanted) live.current = show.current();
  }, [wanted]);

  // The island sizes itself to the content, so tell it whenever the content may have changed: after
  // each render here, and when something inside it resizes on its own.
  const el = target && target.el;
  useEffect(() => {
    live.current?.refresh();
  });
  useEffect(() => {
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => live.current?.refresh());
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);

  if (!target) return null;
  const view: BuoyLiveView = {
    expanded: target.expanded,
    expand: (open = true) => live.current?.expand(open),
    close: () => live.current?.close(),
  };
  return createPortal(typeof children === 'function' ? children(view) : children, target.el);
}
