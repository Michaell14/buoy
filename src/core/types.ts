import type { IconName } from './icons';

export type { IconName };

/** Surface style of the island. */
export type Theme = 'ink' | 'frost' | 'paper' | 'notch';
/** Which screen edge the island sits on. */
export type Position = 'top' | 'bottom';
/** What shows when nothing is happening. */
export type Resting = 'hidden' | 'pill';
/** Light or dark palette for the Frost and Paper themes. `system` follows the OS. */
export type ColorScheme = 'system' | 'light' | 'dark';
export type MessageType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading' | 'live';
export type Tone = 'accent' | 'success' | 'error' | 'warning' | 'info';
export type TaskStatus = 'queued' | 'running' | 'paused' | 'failed' | 'done';

/** A built-in icon name, a trusted `<svg>…</svg>` string, or `null` for none. */
export type IconInput = IconName | (string & {}) | null;

export interface MessageAction {
  label: string;
  onClick?: () => void;
  /** Draws the button as the main action. Only used in the expanded layout. */
  primary?: boolean;
}

export interface MessageOptions {
  /** Pass the id of a message that is showing or queued to update it in place. */
  id?: string;
  /** Second line. A message with a description opens on hover or tap. */
  description?: string;
  icon?: IconInput;
  /** Tints the icon. Typed messages (success, error…) pick their own tone. */
  tone?: Tone;
  /** One button on the compact pill. */
  action?: MessageAction;
  /** Up to two buttons in the expanded layout. */
  actions?: MessageAction[];
  /** Show the expanded layout straight away. */
  expanded?: boolean;
  /** Milliseconds before the message leaves. `Infinity` keeps it until dismissed. */
  duration?: number;
  /** Stay until dismissed. Newer messages show first, then this one comes back. Errors persist by default. */
  persist?: boolean;
  onDismiss?: () => void;
}

export interface PromiseOptions<T> {
  loading?: string;
  success?: string | ((value: T) => string);
  error?: string | ((error: unknown) => string);
  /** Adds a Retry button to the error. */
  retry?: () => void;
  /** How long the success state holds, in milliseconds. Defaults to 2000. */
  successDuration?: number;
}

/** What a tracked task's function receives. */
export interface TaskContext {
  /** Aborted when the task is cancelled. Pass it to fetch() or your uploader. */
  readonly signal: AbortSignal;
  /** 1 on the first run, 2 after the first retry, and so on. */
  readonly attempt: number;
  /** Report progress as a fraction between 0 and 1… */
  progress(fraction: number): void;
  /** …or as an amount done out of a total (bytes by default). */
  progress(loaded: number, total: number): void;
  /** Resolves straight away, or when the task is resumed if it was paused. Await it between chunks to support pausing. */
  checkpoint(): Promise<void>;
}

export interface TaskInfo {
  id: string;
  label: string;
  status: TaskStatus;
  loaded: number;
  total: number;
  /** 0 to 1. */
  progress: number;
  error?: string;
  attempt: number;
}

export interface TrackOptions {
  label?: string;
  /** Total amount of work, so progress shows before the first report. Bytes by default. */
  total?: number;
  icon?: IconInput;
  /** Set to false for work that cannot pause. Defaults to true. */
  pausable?: boolean;
  /** Line shown under a finished task, such as "Uploaded just now". */
  doneLabel?: string;
  /** Formats the amount line, e.g. `(done, total) => \`${done} of ${total} files\``. Bytes by default. */
  format?: (loaded: number, total: number) => string;
  /** Adds an Open button to the finished task in the tray. */
  onOpen?: (task: TaskInfo) => void;
}

export interface TaskHandle {
  readonly id: string;
  pause(): void;
  resume(): void;
  cancel(): void;
  retry(): void;
}

/** Text the island writes about tasks. */
export interface Labels {
  /** Singular noun for one task, such as "upload". Defaults to "task". */
  noun: string;
  /** Label while tasks run. Defaults to the task's label, or "3 tasks". */
  active: (tasks: TaskInfo[]) => string;
  /** Message when a single task finishes. */
  doneOne: (task: TaskInfo) => string;
  /** Message when several tasks finish. */
  doneMany: (count: number) => string;
}

export interface BuoyOptions {
  theme?: Theme;
  position?: Position;
  resting?: Resting;
  /** Tint the whole surface by message type. */
  richColors?: boolean;
  /** Open a message's details on hover. Defaults to true. */
  expandOnHover?: boolean;
  /** Default message duration in milliseconds. Defaults to 3000. */
  duration?: number;
  /** Tasks that run at the same time. Defaults to 2. */
  concurrency?: number;
  /** Ask before the tab closes while tasks are running. Defaults to true. */
  guard?: boolean;
  /** Short vibration on new messages where the device supports it. */
  haptics?: boolean;
  colorScheme?: ColorScheme;
  /** Distance from the screen edge in pixels. Defaults to 12. `null` restores the default. */
  offset?: number | null;
  /** Icon on the live pill while tasks run. Defaults to "upload". */
  taskIcon?: IconInput;
  labels?: Partial<Labels>;
}

/** What a live activity's render function is told about the island. */
export interface LiveView {
  /** True while the island is open on the activity's details. */
  readonly expanded: boolean;
}

export interface LiveOptions {
  /** What the activity is, for screen readers. Read out when it appears or is replaced. */
  label: string;
  /**
   * Fills the island with your own markup. Called when the activity appears, when it opens or
   * closes, and on every `refresh()`, always with the same element until the view changes, so you
   * can update text in place instead of rebuilding. Your markup can use the island's building
   * blocks (`buoy-row`, `buoy-ic`, `buoy-title`, `buoy-exp` and friends) to match every theme.
   */
  render: (el: HTMLElement, view: LiveView) => void;
  /** A tap opens the activity's details: `render` is called with `expanded: true`. Defaults to false. */
  expandable?: boolean;
  /** Pass the id of a live activity that is showing or queued to replace it. */
  id?: string;
  /** Leaves after this many milliseconds. Without it, the activity stays until you close it. */
  duration?: number;
  /** Called when the activity leaves, however that happens. */
  onClose?: () => void;
}

export interface LiveHandle {
  readonly id: string;
  /** Calls `render` again in place. Nothing moves or is announced, so it is safe to call every second. */
  refresh(): void;
  /** Opens or closes the details of an expandable activity. */
  expand(open?: boolean): void;
  close(): void;
}

export interface MountOptions extends BuoyOptions {
  /** Element to render into. Defaults to document.body. */
  container?: HTMLElement | null;
  /** Add the stylesheet automatically. Set to false if you import `buoy-ui/styles.css` yourself. */
  injectStyles?: boolean;
  /** Nonce for the injected <style> tag, for strict Content Security Policies. */
  nonce?: string;
}

export interface MountHandle {
  configure(options: BuoyOptions): void;
  destroy(): void;
}

export interface Buoy {
  /** Show a message. Returns its id. */
  (title: string, options?: MessageOptions): string;
  success(title: string, options?: MessageOptions): string;
  /** Errors stay until dismissed unless you pass a duration. */
  error(title: string, options?: MessageOptions): string;
  warn(title: string, options?: MessageOptions): string;
  info(title: string, options?: MessageOptions): string;
  /** Loading, then success or error, on the same message. Returns the promise you passed. */
  promise<T>(promise: Promise<T> | (() => Promise<T>), options?: PromiseOptions<T>): Promise<T>;
  /** Dismiss one message by id, or every message when called without one. */
  dismiss(id?: string): void;
  /** Run a piece of work and show its progress. */
  track(run: (task: TaskContext) => unknown, options?: TrackOptions): TaskHandle;
  /** Show something ongoing that you draw yourself, such as a timer, a call or a player. It stays until you close it. */
  live(options: LiveOptions): LiveHandle;
  /** A snapshot of all tasks. */
  tasks(): TaskInfo[];
  tray: { open(): void; close(): void; toggle(): void };
  /** Change options without React. With React, pass props to <Buoy /> instead. */
  configure(options: BuoyOptions): void;
}
