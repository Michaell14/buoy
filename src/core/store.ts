import { amount, clamp, frac, size, timeLeft } from './format';
import type {
  BuoyOptions,
  ColorScheme,
  DismissReason,
  Labels,
  LiveHandle,
  LiveOptions,
  LiveView,
  MessageAction,
  MessageOptions,
  MessageType,
  Position,
  PromiseMessage,
  PromiseOptions,
  Resting,
  TaskContext,
  TaskHandle,
  TaskInfo,
  TaskStatus,
  Theme,
  TrackOptions,
} from './types';

export interface Msg {
  id: string;
  type: MessageType;
  title: string;
  description: string;
  icon: string | null | undefined;
  tone: string;
  action: MessageAction | null;
  actions: MessageAction[] | null;
  expanded: boolean;
  persist: boolean;
  duration: number;
  remaining: number;
  timer: ReturnType<typeof setTimeout> | 0;
  deadline: number;
  shownAt: number;
  tapped: boolean;
  onDismiss: ((reason: DismissReason) => void) | null;
  /** Live activities: draws the content. */
  render: ((el: HTMLElement, view: LiveView) => void) | null;
  expandable: boolean;
  /** A live activity's details are open. */
  open: boolean;
  /** Bumped whenever a live activity needs drawing again. */
  rev: number;
}

export interface Task {
  id: string;
  label: string;
  icon: string;
  run: (task: TaskContext) => unknown;
  pausable: boolean;
  onOpen: ((task: TaskInfo) => void) | null;
  doneLabel: string;
  format: ((loaded: number, total: number) => string) | null;
  status: TaskStatus | 'canceled';
  loaded: number;
  total: number;
  fraction: number;
  rate: number;
  lastT: number;
  lastL: number;
  attempt: number;
  started: boolean;
  paused: boolean;
  resumers: Array<() => void>;
  ctrl: AbortController | null;
  batch: number;
  error: string;
  /** Settle the handle's `done` promise. Calling either after the first one does nothing. */
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

export interface ResolvedOptions {
  theme: Theme;
  position: Position;
  resting: Resting;
  richColors: boolean;
  expandOnHover: boolean;
  duration: number;
  concurrency: number;
  guard: boolean;
  haptics: boolean;
  colorScheme: ColorScheme;
  offset: number | null;
  taskIcon: string;
  labels: Labels;
}

export type StoreEvent = 'change' | 'progress' | 'config' | 'show';
export type StoreListener = (event: StoreEvent, message?: Msg) => void;
type NewMessage = MessageOptions & { type?: MessageType; render?: Msg['render']; expandable?: boolean };

/** How long a message stays when others are waiting behind it. */
const HURRY_MS = 1500;
/** A message is readable after this long; anything waiting can take its place after that. */
const MIN_VISIBLE_MS = 900;
/** Shortest gap before a waiting message morphs in. */
const SWAP_MS = 200;
/** Minimum time for a message that carries buttons. */
const ACTION_MS = 6000;
const SUCCESS_MS = 2000;
const SUMMARY_MS = 4000;
/** The order task states are listed in. */
const STATES: TaskStatus[] = ['running', 'queued', 'paused', 'failed', 'done'];

export const DEFAULT_OPTIONS: Omit<ResolvedOptions, 'labels'> = {
  theme: 'ink',
  position: 'top',
  resting: 'hidden',
  richColors: false,
  expandOnHover: true,
  duration: 3000,
  concurrency: 2,
  guard: true,
  haptics: false,
  colorScheme: 'system',
  offset: null,
  taskIcon: 'upload',
};

export type Store = ReturnType<typeof createStore>;

export function createStore() {
  // The English wording. Each line reads the current labels, so changing `noun` or a state's name carries through.
  const nouns = (count: number) => `${count} ${cfg.labels.noun}${count === 1 ? '' : 's'}`;
  const defaultLabels: Labels = {
    noun: 'task',
    active: (tasks) => (tasks.length === 1 ? tasks[0].label : `${tasks.length} ${cfg.labels.noun}s`),
    doneOne: (task) => `${task.label} finished`,
    doneMany: (count) => `${count} ${cfg.labels.noun}s finished`,
    failures: (count) => `${nouns(count)} failed`,
    summary: (counts) => STATES.filter((k) => counts[k]).map((k) => `${counts[k]} ${cfg.labels[k].toLowerCase()}`).join(' · '),
    guard: (count) => `Closing this tab stops ${nouns(count)}.`,
    amount,
    size,
    timeLeft,
    failedAt: (error, at) => `${error} at ${at}`,
    details: (name) => `${name}. Show details`,
    waiting: (count) => `${count} waiting`,
    running: 'Running',
    queued: 'Queued',
    paused: 'Paused',
    failed: 'Failed',
    done: 'Done',
    notStarted: 'Waiting to start',
    finished: 'Finished',
    activity: 'Activity',
    nothing: 'Nothing here yet',
    empty: 'Tasks you start show up here.',
    clearDone: 'Clear done',
    pauseAll: 'Pause all',
    resumeAll: 'Resume all',
    showActivity: 'Show activity',
    retry: 'Retry',
    view: 'View',
    open: 'Open',
    cancel: 'Cancel',
    pause: 'Pause',
    resume: 'Resume',
    remove: 'Remove',
    close: 'Close',
    dismiss: 'Dismiss',
    loading: 'Loading…',
    error: 'Something went wrong',
  };
  const cfg: ResolvedOptions = { ...DEFAULT_OPTIONS, labels: { ...defaultLabels } };
  const state = {
    current: null as Msg | null,
    queue: [] as Msg[],
    tasks: [] as Task[],
    trayOpen: false,
    attentionDismissed: false,
    batch: 0,
    batchAnnounced: false,
    /** Increments when the labels change, so views that are open pick up the new wording. */
    wording: 0,
    /** Increments on every change. Handy for snapshot caching. */
    version: 0,
  };
  const listeners = new Set<StoreListener>();
  // Timers stay paused until an island is attached, so nothing expires unseen.
  const pauses = new Set<string>(['detached']);
  let seq = 0;
  const uid = (prefix: string) => `buoy-${prefix}${++seq}`;
  const now = () => Date.now();

  function emit(event: StoreEvent = 'change', message?: Msg) {
    state.version++;
    listeners.forEach((listener) => listener(event, message));
  }
  function subscribe(listener: StoreListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function report(error: unknown) {
    if (typeof console !== 'undefined') console.error(error);
  }
  /** Everything about the tasks that someone outside can see, as one string to compare. */
  const print = () => state.tasks.map((t) => [t.id, t.status, t.loaded, t.fraction, t.total, t.attempt, t.error].join()).join('|');
  /** Tells `listener` about the tasks whenever they change, and not when only a message did. */
  function onTasks(listener: (tasks: TaskInfo[]) => void): () => void {
    let last = print();
    return subscribe(() => {
      const next = print();
      if (next === last) return;
      last = next;
      safe(() => listener(state.tasks.map(info)));
    });
  }
  /** The tasks as a list that stays the same object until one of them changes, for React to compare. */
  let snap: { print: string; tasks: TaskInfo[] } = { print: '', tasks: [] };
  function snapshot(): TaskInfo[] {
    const now = print();
    if (now !== snap.print) snap = { print: now, tasks: state.tasks.map(info) };
    return snap.tasks;
  }
  function buzz() {
    if (!cfg.haptics || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try { navigator.vibrate(8); } catch { /* not supported */ }
  }

  /* ───── Options ───── */

  function configure(options: BuoyOptions = {}) {
    const { labels, ...rest } = options;
    const target = cfg as unknown as Record<string, unknown>;
    let changed = false;
    for (const [key, value] of Object.entries(rest)) {
      if (value === undefined || target[key] === value) continue;
      target[key] = value;
      changed = true;
    }
    const l = cfg.labels as unknown as Record<string, unknown>;
    // `null` goes back to the defaults; anything else changes only the labels it names.
    for (const [key, value] of Object.entries(labels === null ? defaultLabels : labels ?? {})) {
      if (value === undefined || l[key] === value) continue;
      l[key] = value;
      changed = true;
      state.wording++;
    }
    if (!changed) return;
    if (rest.concurrency !== undefined) pump();
    emit('config');
  }

  /* ───── Message timers ───── */

  const isPaused = () => pauses.size > 0 || state.trayOpen;
  function startTimer(m: Msg) {
    if (m.timer || !Number.isFinite(m.remaining) || isPaused() || m !== state.current) return;
    m.deadline = now() + m.remaining;
    m.timer = setTimeout(() => {
      m.timer = 0;
      dismiss(m.id, 'timeout');
    }, m.remaining);
  }
  function pauseTimer(m: Msg) {
    if (!m.timer) return;
    clearTimeout(m.timer);
    m.timer = 0;
    m.remaining = Math.max(0, m.deadline - now());
  }
  function syncTimers() {
    const m = state.current;
    if (!m) return;
    if (isPaused()) pauseTimer(m);
    else startTimer(m);
  }
  /** Pause or resume message timers for a reason, e.g. "hover" or "hidden". */
  function setPaused(reason: string, on: boolean) {
    if (on === pauses.has(reason)) return;
    if (on) pauses.add(reason);
    else pauses.delete(reason);
    syncTimers();
  }

  /* ───── Messages ───── */

  function make(title: string, o: NewMessage): Msg {
    const type = o.type ?? 'default';
    const persist = o.persist ?? type === 'error';
    const hasButtons = !!(o.action || (o.actions && o.actions.length));
    const duration = o.duration ?? (persist ? Infinity : hasButtons ? Math.max(cfg.duration, ACTION_MS) : cfg.duration);
    return {
      id: o.id ?? uid('m'),
      type,
      title: String(title),
      description: o.description ?? '',
      icon: o.icon,
      tone: o.tone ?? '',
      action: o.action ?? null,
      actions: o.actions && o.actions.length ? o.actions.slice(0, 2) : null,
      expanded: !!o.expanded,
      persist,
      duration,
      remaining: duration,
      timer: 0,
      deadline: 0,
      shownAt: 0,
      tapped: false,
      onDismiss: o.onDismiss ?? null,
      render: o.render ?? null,
      expandable: !!o.expandable,
      open: false,
      rev: 0,
    };
  }
  function find(id: string): Msg | null {
    if (state.current && state.current.id === id) return state.current;
    return state.queue.find((m) => m.id === id) ?? null;
  }
  function arm(m: Msg) {
    m.remaining = m.duration;
    if (state.queue.length && Number.isFinite(m.remaining)) m.remaining = Math.min(m.remaining, HURRY_MS);
    m.timer = 0;
    m.shownAt = now();
    m.open = false;
    startTimer(m);
    emit('show', m);
    buzz();
  }
  /** Something is waiting: let the visible message finish being read, then hand over. */
  function hurry(m: Msg) {
    if (!Number.isFinite(m.remaining)) return;
    const target = Math.max(SWAP_MS, MIN_VISIBLE_MS - (now() - m.shownAt));
    const left = m.timer ? m.deadline - now() : m.remaining;
    if (left <= target) return;
    pauseTimer(m);
    m.remaining = target;
    startTimer(m);
  }
  function push(title: string, o: NewMessage = {}): string {
    if (o.id) {
      const existing = find(o.id);
      if (existing) {
        update(existing, title, o);
        return existing.id;
      }
    }
    const m = make(title, o);
    const cur = state.current;
    if (!cur) {
      state.current = m;
      arm(m);
    } else if (cur.persist && cur.type !== 'loading') {
      // A sticky message steps aside for the newcomer and comes back after it.
      pauseTimer(cur);
      state.queue.push(cur);
      state.current = m;
      arm(m);
    } else {
      state.queue.push(m);
      hurry(cur);
    }
    emit();
    return m.id;
  }
  function update(m: Msg, title: string, o: NewMessage) {
    const fresh = make(title, { ...o, id: m.id });
    fresh.rev = m.rev + 1;
    pauseTimer(m);
    Object.assign(m, fresh);
    if (m === state.current) arm(m);
    emit();
  }
  function dismiss(id?: string, reason: DismissReason = 'code') {
    const cur = state.current;
    const tell = (m: Msg) => {
      const heard = m.onDismiss;
      if (heard) safe(() => heard(reason));
    };
    if (id === undefined) {
      // No id: clear everything. Every message that leaves hears about it, shown or waiting.
      const gone = [cur, ...state.queue].filter((m): m is Msg => !!m);
      for (const m of gone) pauseTimer(m);
      state.queue = [];
      state.current = null;
      gone.forEach(tell);
      emit();
      return;
    }
    if (cur && cur.id === id) {
      pauseTimer(cur);
      state.current = null;
      tell(cur);
      const next = state.queue.shift();
      if (next) {
        state.current = next;
        arm(next);
      }
    } else {
      // Waiting in the queue, such as a live activity that stepped aside for a message.
      const i = state.queue.findIndex((m) => m.id === id);
      if (i < 0) return;
      const [gone] = state.queue.splice(i, 1);
      pauseTimer(gone);
      tell(gone);
    }
    emit();
  }
  function safe(fn: () => void) {
    try { fn(); } catch (error) { report(error); }
  }
  /* ───── Live activities ───── */

  function live(o: LiveOptions): LiveHandle {
    const timed = o.duration !== undefined && Number.isFinite(o.duration);
    const before = o.id ? find(o.id) : null;
    const wasOpen = !!(before && before.render && before.open);
    const id = push(o.label, {
      id: o.id,
      type: 'live',
      persist: !timed,
      duration: timed ? o.duration : Infinity,
      onDismiss: o.onClose,
      render: o.render,
      expandable: o.expandable,
    });
    // Replacing an activity whose details were open keeps them open, so a new label doesn't close them.
    if (wasOpen) setOpen(id, true);
    return { id, refresh: () => refresh(id), expand: (open = true) => setOpen(id, open), close: () => dismiss(id) };
  }
  /** Asks the island to draw a live activity again, without announcing it. */
  function refresh(id: string) {
    const m = find(id);
    if (!m || !m.render) return;
    m.rev++;
    emit();
  }
  function setOpen(id: string, open: boolean) {
    const m = find(id);
    if (!m || !m.expandable || m.open === open) return;
    m.open = open;
    m.rev++;
    emit();
  }

  function tap(id: string) {
    const m = find(id);
    if (!m || m.tapped) return;
    m.tapped = true;
    emit();
  }
  /** A promise state as a title and the rest of its message. */
  function parts(state: string | PromiseMessage): [string, MessageOptions] {
    if (typeof state === 'string') return [state, {}];
    const { title, ...rest } = state;
    return [title, rest];
  }
  function promise<T>(input: Promise<T> | (() => Promise<T>), o: PromiseOptions<T> = {}): Promise<T> {
    const [loading, shown] = parts(o.loading ?? cfg.labels.loading);
    const id = push(loading, { ...shown, id: o.id, type: 'loading', duration: Infinity, persist: false });
    // The result goes to this exact message. If another message with the same id has taken it over by
    // then, the result is stale and is dropped; if the message was dismissed, the result shows on its own.
    const mine = find(id);
    const rev = mine ? mine.rev : -1;
    let p: Promise<T>;
    try {
      p = Promise.resolve(typeof input === 'function' ? input() : input);
    } catch (error) {
      p = Promise.reject(error);
    }
    const settle = (title: string, opts: NewMessage) => {
      const m = find(id);
      if (!m) push(title, opts);
      else if (m === mine && m.rev === rev) update(m, title, opts);
    };
    p.then(
      (value) => {
        const [title, rest] = parts(typeof o.success === 'function' ? o.success(value) : o.success ?? cfg.labels.done);
        // A plain success is brief. One with buttons, or one that stays, keeps a message's usual time.
        const lasting = rest.persist || rest.action || (rest.actions && rest.actions.length);
        settle(title, { ...rest, type: 'success', duration: rest.duration ?? o.successDuration ?? (lasting ? undefined : SUCCESS_MS) });
      },
      (error) => {
        const [title, rest] = parts(typeof o.error === 'function' ? o.error(error) : o.error ?? cfg.labels.error);
        const retry = o.retry ? { label: cfg.labels.retry, onClick: o.retry } : undefined;
        settle(title, { ...rest, type: 'error', action: rest.action ?? retry });
      },
    );
    return p;
  }

  /* ───── Tasks ───── */

  const isActive = (t: Task) => t.status === 'running' || t.status === 'queued' || t.status === 'paused';
  const active = () => state.tasks.filter(isActive);
  const failed = () => state.tasks.filter((t) => t.status === 'failed');
  const byId = (id: string) => state.tasks.find((t) => t.id === id) ?? null;

  function info(t: Task): TaskInfo {
    return {
      id: t.id,
      label: t.label,
      status: t.status === 'canceled' ? 'failed' : t.status,
      loaded: t.loaded,
      total: t.total,
      progress: frac(t),
      error: t.error || undefined,
      attempt: t.attempt,
    };
  }
  function newBatch(clearDone: boolean) {
    state.batch++;
    state.batchAnnounced = false;
    state.attentionDismissed = false;
    if (clearDone) state.tasks = state.tasks.filter((t) => t.status !== 'done');
  }
  function track<T>(run: (task: TaskContext) => T, o: TrackOptions = {}): TaskHandle<Awaited<T>> {
    if (typeof run !== 'function') throw new TypeError('buoy.track() needs a function that does the work.');
    if (!active().length) newBatch(true);
    let resolve!: (value: unknown) => void;
    let reject!: (error: unknown) => void;
    const done = new Promise<unknown>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    // Canceling a task nobody is awaiting is not an error worth a console warning.
    done.catch(() => {});
    const t: Task = {
      id: uid('t'),
      label: String(o.label ?? 'Task'),
      icon: o.icon ?? 'file',
      run,
      pausable: o.pausable !== false,
      onOpen: o.onOpen ?? null,
      doneLabel: o.doneLabel ?? '',
      format: o.format ?? null,
      status: 'queued',
      loaded: 0,
      total: o.total ?? 0,
      fraction: 0,
      rate: 0,
      lastT: 0,
      lastL: 0,
      attempt: 0,
      started: false,
      paused: false,
      resumers: [],
      ctrl: null,
      batch: state.batch,
      error: '',
      resolve,
      reject,
    };
    state.tasks.push(t);
    pump();
    emit();
    return {
      id: t.id,
      done: done as Promise<Awaited<T>>,
      pause: () => pauseTask(t),
      resume: () => resumeTask(t),
      cancel: () => cancelTask(t),
      retry: () => retryTask(t),
      remove: () => (isActive(t) ? cancelTask(t) : removeTask(t)),
    };
  }
  /** What `done` rejects with when a task ends without finishing. */
  function aborted(): Error {
    const error = new Error('The task was canceled');
    error.name = 'AbortError';
    return error;
  }
  function measureRate(t: Task) {
    const at = now();
    const dt = (at - t.lastT) / 1000;
    if (dt < 0.05) return;
    const inst = (t.loaded - t.lastL) / dt;
    t.rate = t.rate ? t.rate * 0.75 + inst * 0.25 : inst;
    t.lastT = at;
    t.lastL = t.loaded;
  }
  function flush(t: Task) {
    const resumers = t.resumers;
    t.resumers = [];
    resumers.forEach((resume) => resume());
  }
  function startTask(t: Task) {
    t.status = 'running';
    t.started = true;
    t.paused = false;
    t.attempt += 1;
    t.error = '';
    t.ctrl = new AbortController();
    t.lastT = now();
    t.lastL = t.loaded;
    t.rate = 0;
    const attempt = t.attempt;
    const context: TaskContext = {
      signal: t.ctrl.signal,
      attempt,
      progress: (a: number, b?: number) => {
        if (t.attempt !== attempt || t.status === 'canceled') return;
        if (typeof b === 'number') {
          t.total = Math.max(0, b);
          t.loaded = clamp(a, 0, t.total || a);
        } else {
          t.fraction = clamp(a, 0, 1);
          if (t.total) t.loaded = t.fraction * t.total;
        }
        measureRate(t);
        emit('progress');
      },
      checkpoint: () => (t.paused ? new Promise<void>((resolve) => t.resumers.push(resolve)) : Promise.resolve()),
    };
    Promise.resolve()
      .then(() => t.run(context))
      .then(
        (value) => {
          if (t.attempt !== attempt || t.status === 'canceled') return;
          t.status = 'done';
          if (t.total) t.loaded = t.total;
          t.fraction = 1;
          t.resolve(value);
          checkDone();
        },
        (error: unknown) => {
          if (t.attempt !== attempt || t.status === 'canceled') return;
          t.status = 'failed';
          t.error = error instanceof Error && error.message ? error.message : typeof error === 'string' ? error : cfg.labels.failed;
          checkDone();
        },
      );
  }
  /** Start queued tasks while there are free slots. */
  function pump() {
    let running = state.tasks.filter((t) => t.status === 'running').length;
    for (const t of state.tasks) {
      if (running >= cfg.concurrency) break;
      if (t.status !== 'queued') continue;
      running++;
      if (t.started) {
        // A resumed task waiting at its checkpoint.
        t.status = 'running';
        t.paused = false;
        t.lastT = now();
        t.lastL = t.loaded;
        t.rate = 0;
        flush(t);
      } else {
        startTask(t);
      }
    }
  }
  function pauseTask(t: Task) {
    if (t.status !== 'running' || !t.pausable) return;
    t.status = 'paused';
    t.paused = true;
    t.rate = 0;
    pump();
    emit();
  }
  function resumeTask(t: Task) {
    if (t.status !== 'paused') return;
    t.status = 'queued';
    pump();
    emit();
  }
  function cancelTask(t: Task) {
    if (!isActive(t)) return;
    t.status = 'canceled';
    t.paused = false;
    if (t.ctrl) t.ctrl.abort();
    flush(t);
    state.tasks = state.tasks.filter((x) => x !== t);
    t.reject(aborted());
    checkDone();
  }
  function retryTask(t: Task) {
    if (t.status !== 'failed') return;
    if (!active().length) newBatch(false);
    Object.assign(t, { status: 'queued', loaded: 0, fraction: 0, rate: 0, started: false, error: '', batch: state.batch });
    state.attentionDismissed = false;
    pump();
    emit();
  }
  function removeTask(t: Task) {
    if (isActive(t)) return;
    state.tasks = state.tasks.filter((x) => x !== t);
    // A failed task that is taken away will never finish. One that is done has settled already.
    t.reject(aborted());
    emit();
  }
  function clearDone() {
    state.tasks = state.tasks.filter((t) => t.status !== 'done');
    emit();
  }
  function checkDone() {
    pump();
    if (!active().length) {
      const bad = failed();
      const done = state.tasks.filter((t) => t.status === 'done' && t.batch === state.batch);
      if (bad.length) {
        state.attentionDismissed = false;
        buzz();
      } else if (done.length && !state.trayOpen && !state.batchAnnounced) {
        state.batchAnnounced = true;
        const title = done.length === 1 ? cfg.labels.doneOne(info(done[0])) : cfg.labels.doneMany(done.length);
        push(title, { type: 'success', duration: SUMMARY_MS, action: { label: cfg.labels.view, onClick: openTray } });
      }
    }
    emit();
  }
  /** Overall progress of the current batch, 0 to 1. */
  function aggregate(): number {
    let total = 0;
    let loaded = 0;
    let sum = 0;
    let unknown = 0;
    for (const t of state.tasks) {
      if (t.batch !== state.batch) continue;
      if (t.total > 0) {
        total += t.total;
        loaded += frac(t) * t.total;
      } else {
        sum += frac(t);
        unknown++;
      }
    }
    if (!total && !unknown) return 0;
    if (!unknown) return clamp(loaded / total, 0, 1);
    return clamp(total ? (loaded / total + sum) / (1 + unknown) : sum / unknown, 0, 1);
  }
  function summary() {
    const counts: Record<TaskStatus, number> = { running: 0, queued: 0, paused: 0, failed: 0, done: 0 };
    for (const t of state.tasks) if (t.status !== 'canceled') counts[t.status]++;
    return { counts, text: cfg.labels.summary(counts) };
  }

  /* ───── Tray ───── */

  function openTray() {
    if (state.trayOpen) return;
    state.trayOpen = true;
    syncTimers();
    emit();
  }
  function closeTray() {
    if (!state.trayOpen) return;
    state.trayOpen = false;
    syncTimers();
    emit();
  }
  function dismissAttention() {
    if (state.attentionDismissed) return;
    state.attentionDismissed = true;
    emit();
  }

  const withTask = (fn: (t: Task) => void) => (id: string) => {
    const t = byId(id);
    if (t) fn(t);
  };

  return {
    cfg,
    state,
    defaults: { options: DEFAULT_OPTIONS, labels: defaultLabels },
    subscribe,
    onTasks,
    snapshot,
    configure,
    setPaused,
    push,
    dismiss,
    tap,
    live,
    refresh,
    setOpen,
    promise,
    find,
    track,
    tasks: () => state.tasks.map(info),
    info,
    active,
    failed,
    aggregate,
    summary,
    pauseTask: withTask(pauseTask),
    resumeTask: withTask(resumeTask),
    cancelTask: withTask(cancelTask),
    retryTask: withTask(retryTask),
    removeTask: withTask(removeTask),
    retryFailed: () => failed().forEach(retryTask),
    pauseAll: () => state.tasks.filter((t) => t.status === 'running').forEach(pauseTask),
    resumeAll: () => state.tasks.filter((t) => t.status === 'paused').forEach(resumeTask),
    clearDone,
    openTray,
    closeTray,
    toggleTray: () => (state.trayOpen ? closeTray() : openTray()),
    dismissAttention,
  };
}
