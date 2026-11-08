# Atoll

A morphing island for notifications, promises and background tasks.

Messages, loading states and upload progress share one surface at the top of the screen. It queues, it splits in two when a message arrives during an upload, and it opens into a tray when you need the details. Works with React, or with no framework at all.

- **One surface.** Each state is the same element changing shape, so nothing stacks and nothing jumps.
- **Promises on the same shape.** Loading turns into success or error in place.
- **Real progress.** Track uploads or any long job: a live ring, then a tray with pause, resume, retry and cancel.
- **Four looks.** Ink, Frost, Paper, and Notch, which hangs from the top edge of the viewport.
- **Small and dependency-free.** About 15 KB gzipped including styles. Styles inject themselves.
- **Accessible.** Real buttons, a polite live region, Esc to close, and `prefers-reduced-motion` support.

## Install

```bash
npm install atoll-ui
```

## Quick start (React)

Render `<Atoll />` once, near the root. Then call `atoll()` from anywhere: components, effects, plain functions.

```tsx
import { Atoll, atoll } from 'atoll-ui';

export default function App() {
  return (
    <>
      <Atoll />
      <button onClick={() => atoll('Link copied', { icon: 'link' })}>Copy link</button>
    </>
  );
}
```

`<Atoll />` renders nothing inside your component tree. The island lives in its own element at the end of `<body>`.

**Next.js (App Router):** put `<Atoll />` in your root `layout.tsx`. The package is marked `'use client'`, so you can import it from a Server Component file. Calling `atoll()` during server rendering is harmless: nothing shows until the island mounts in the browser.

## Messages

```ts
atoll('Link copied', { icon: 'link' });
atoll.success('Saved to drafts');
atoll.info('Update available');
atoll.warn("You're offline", { persist: true });
atoll.error("Couldn't save", { action: { label: 'Retry', onClick: save } });
```

One message shows at a time. While others wait, a `+N` badge counts them and each one gets a short turn. Errors and `persist: true` messages stay until they are dismissed, but they step aside for newer messages and come back afterwards.

Messages with a description or several buttons open on hover or tap. Pass `expanded: true` to open them straight away:

```ts
atoll('Export ready', {
  description: 'Q3-report.pdf · 4.2 MB',
  icon: 'file',
  tone: 'accent',
  expanded: true,
  actions: [
    { label: 'Open', primary: true, onClick: open },
    { label: 'Show in folder', onClick: reveal },
  ],
});
```

Every call returns an id. Pass it back to update the message in place, or to dismiss it:

```ts
const id = atoll('Syncing…', { duration: Infinity });
atoll.success('Synced', { id });
atoll.dismiss(id);
atoll.dismiss(); // everything
```

| Option | Type | What it does |
| --- | --- | --- |
| `description` | `string` | Second line |
| `icon` | built-in name, trusted `<svg>` string, or `null` | Leading icon |
| `tone` | `'accent' \| 'success' \| 'error' \| 'warning' \| 'info'` | Icon tint for untyped messages |
| `action` | `{ label, onClick }` | One button on the compact pill |
| `actions` | `{ label, onClick, primary? }[]` | Up to two buttons in the expanded layout |
| `expanded` | `boolean` | Open the expanded layout straight away |
| `duration` | `number` (ms) | Defaults to 3000, or 6000 with buttons. `Infinity` keeps it |
| `persist` | `boolean` | Stay until dismissed. Errors persist by default |
| `id` | `string` | Update an existing message |
| `onDismiss` | `() => void` | Called when it leaves |

Built-in icons: `link`, `check`, `error`, `warning`, `info`, `upload`, `download`, `file`, `archive`, `image`, `send`, `folder`, `copy`, `stack`, `bell`, `timer`, `user`, `pause`, `play`, `retry`, `x`, `open`.

## Promises

```ts
atoll.promise(save(), {
  loading: 'Saving…',
  success: 'Saved to drafts',
  error: (e) => (e instanceof Error ? e.message : "Couldn't save"),
  retry: save,
});
```

It returns the promise you passed, so you can still `await` it.

## Background tasks

Give `atoll.track()` a function that does the work and reports progress. The island shows a live ring. Tapping it opens the tray, where each task can pause, resume, retry or cancel.

```ts
const job = atoll.track(
  (task) =>
    upload(file, {
      onProgress: (e) => task.progress(e.loaded, e.total),
      signal: task.signal,
    }),
  { label: file.name, total: file.size, icon: 'image' },
);

job.pause();
job.resume();
job.cancel();
job.retry();
```

The function receives a task context:

| Member | What it does |
| --- | --- |
| `task.progress(fraction)` or `task.progress(loaded, total)` | Report progress. Amounts are shown as bytes unless you pass `format` |
| `task.signal` | An `AbortSignal` that fires on cancel |
| `task.checkpoint()` | Resolves now, or when a paused task is resumed. Await it between chunks to support pausing |
| `task.attempt` | 1 on the first run, 2 after the first retry |

If the function throws or rejects, the task is marked failed with the error's message and can be retried. Two tasks run at a time by default (`concurrency`).

| Option | Type | What it does |
| --- | --- | --- |
| `label` | `string` | Name in the island and tray |
| `total` | `number` | Size of the work, so progress shows before the first report |
| `icon` | icon | Tile icon in the tray |
| `pausable` | `boolean` | Set to `false` for work that can't pause |
| `doneLabel` | `string` | Line under a finished task, like "Uploaded just now" |
| `format` | `(loaded, total) => string` | Amount line, e.g. `` (n, t) => `${n} of ${t} files` `` |
| `onOpen` | `(task) => void` | Adds an Open button to the finished task |

Show progress elsewhere in your React UI with the hook:

```tsx
import { useAtollTasks } from 'atoll-ui';

function UploadBadge() {
  const tasks = useAtollTasks();
  const running = tasks.filter((t) => t.status === 'running').length;
  return running ? <span>{running} uploading</span> : null;
}
```

You can also open the tray yourself: `atoll.tray.open()`, `atoll.tray.close()`, `atoll.tray.toggle()`.

## Options

Pass these as props to `<Atoll />`, or to `mount()` and `atoll.configure()` without React.

| Prop | Type | Default | What it does |
| --- | --- | --- | --- |
| `theme` | `'ink' \| 'frost' \| 'paper' \| 'notch'` | `'ink'` | Surface style |
| `position` | `'top' \| 'bottom'` | `'top'` | Which edge the island sits on |
| `resting` | `'hidden' \| 'pill'` | `'hidden'` | What shows when nothing is happening |
| `richColors` | `boolean` | `false` | Tint the surface by message type |
| `colorScheme` | `'system' \| 'light' \| 'dark'` | `'system'` | Palette for Frost and Paper |
| `expandOnHover` | `boolean` | `true` | Open a message's details on hover |
| `duration` | `number` | `3000` | Default message duration in ms |
| `concurrency` | `number` | `2` | Tasks that run at the same time |
| `guard` | `boolean` | `true` | Ask before the tab closes while tasks run |
| `haptics` | `boolean` | `false` | Short vibration where the device supports it |
| `offset` | `number` | `12` | Distance from the screen edge in px |
| `taskIcon` | icon | `'upload'` | Icon on the live pill |
| `labels` | `{ noun, active, doneOne, doneMany }` | | Wording for tasks |
| `injectStyles` | `boolean` | `true` | Set to `false` if you import `atoll-ui/styles.css` yourself |
| `nonce` | `string` | | Nonce for the injected `<style>` under a strict CSP |
| `container` | `HTMLElement` | `document.body` | Where to render |

```tsx
<Atoll
  theme="frost"
  resting="pill"
  labels={{
    noun: 'upload',
    active: (tasks) => (tasks.length === 1 ? `Uploading ${tasks[0].label}` : `Uploading ${tasks.length} files`),
  }}
/>
```

## Theming

Set these custom properties anywhere above the island, `:root` included:

```css
:root {
  --atoll-accent: #2dd4bf;        /* progress on dark surfaces */
  --atoll-accent-strong: #0f766e; /* progress on light surfaces */
  --atoll-ink: #0b0b0c;           /* Ink and Notch fill */
  --atoll-font: 'Inter', system-ui, sans-serif;
  --atoll-offset: 12px;
  --atoll-z: 2147483000;
}
```

## Without React

```ts
import { atoll, mount } from 'atoll-ui/vanilla';

const island = mount({ theme: 'ink' });
atoll('Hello');
island.configure({ position: 'bottom' });
island.destroy();
```

Or from a CDN:

```html
<script src="https://unpkg.com/atoll-ui/dist/atoll.global.js"></script>
<script>
  const { atoll, mount } = window.Atoll;
  mount();
  atoll('Hello');
</script>
```

## Keyboard and screen readers

- New messages are announced through a polite live region.
- Every control is a real `<button>` with a visible focus ring.
- Esc closes the tray, and dismisses a message while it is focused or hovered.
- Swipe the island toward its edge to dismiss. Hovering pauses the timer, and so does a hidden tab.
- With `prefers-reduced-motion`, sizes change instantly and content only fades.

## Browser support

Current Chrome, Edge, Firefox and Safari. The gooey split between the pill and the bubble uses an SVG filter and falls back to a plain slide where that isn't supported. Frost needs `backdrop-filter`.

## License

MIT
