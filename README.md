# Buoy

[![npm](https://img.shields.io/npm/v/buoy-ui)](https://www.npmjs.com/package/buoy-ui) [![bundle size](https://img.shields.io/bundlephobia/minzip/buoy-ui)](https://bundlephobia.com/package/buoy-ui) [![license](https://img.shields.io/npm/l/buoy-ui)](https://github.com/Michaell14/buoy/blob/main/LICENSE) [![CI](https://github.com/Michaell14/buoy/actions/workflows/ci.yml/badge.svg)](https://github.com/Michaell14/buoy/actions/workflows/ci.yml)

A morphing island for notifications, promises and background tasks.

**Try it live at [buoy-ui.vercel.app](https://buoy-ui.vercel.app).** The [examples](https://buoy-ui.vercel.app/examples) show it in real components, such as a share button, a checkout, an uploader and a player, each with its code.

Messages, loading states and upload progress share one surface at the top of the screen. It queues, it splits in two when a message arrives during an upload, and it opens into a tray when you need the details. Works with React, or with no framework at all.

- **One surface.** Each state is the same element changing shape, so nothing stacks and nothing jumps.
- **Promises on the same shape.** Loading turns into success or error in place.
- **Real progress.** Track uploads or any long job: a live ring, then a tray with pause, resume, retry and cancel.
- **Four looks.** Ink, Frost, Paper, and Notch, which hangs from the top edge of the viewport.
- **Small and dependency-free.** About 16 KB gzipped including styles. Styles inject themselves.
- **Accessible.** Real buttons, a polite live region, Esc to close, and `prefers-reduced-motion` support.
- **Any language.** Every word the island writes is a label you can replace.

## Install

```bash
npm install buoy-ui
```

Or `pnpm add buoy-ui`, `yarn add buoy-ui` or `bun add buoy-ui`. In Deno, import from `npm:buoy-ui`.

With [shadcn/ui](https://ui.shadcn.com), this installs the package with your package manager and adds `components/ui/buoy.tsx`, which uses your app's font and follows its dark mode:

```bash
npx shadcn@latest add https://buoy-ui.vercel.app/r/buoy.json
```

## Quick start (React)

Render `<Buoy />` once, near the root. Then call `buoy()` from anywhere: components, effects, plain functions.

```tsx
import { Buoy, buoy } from 'buoy-ui';

export default function App() {
  return (
    <>
      <Buoy />
      <button onClick={() => buoy('Link copied', { icon: 'link' })}>Copy link</button>
    </>
  );
}
```

`<Buoy />` renders nothing inside your component tree. The island lives in its own element at the end of `<body>`.

**Next.js (App Router):** put `<Buoy />` in your root `layout.tsx`. The package is marked `'use client'`, so you can import it from a Server Component file. Calling `buoy()` during server rendering is harmless: nothing shows until the island mounts in the browser.

## Messages

```ts
buoy('Link copied', { icon: 'link' });
buoy.success('Saved to drafts');
buoy.info('Update available');
buoy.warn("You're offline", { persist: true });
buoy.error("Couldn't save", { action: { label: 'Retry', onClick: save } });
```

One message shows at a time. While others wait, a `+N` badge counts them and each one gets a short turn. Errors and `persist: true` messages stay until they are dismissed, but they step aside for newer messages and come back afterwards.

Messages with a description or several buttons open on hover or tap. Pass `expanded: true` to open them straight away:

```ts
buoy('Export ready', {
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
const id = buoy('Syncing…', { duration: Infinity });
buoy.success('Synced', { id });
buoy.dismiss(id);
buoy.dismiss(); // everything
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
| `onDismiss` | `(reason) => void` | Called when it leaves, with the reason |

`onDismiss` is told why the message left: `'timeout'` when its time ran out, `'action'` when one of its buttons was pressed, `'user'` for a tap, a swipe, the close button or Esc, and `'code'` when you called `buoy.dismiss()`. It runs before the button's own `onClick`. Updating a message by its id does not count as leaving. That makes an undo that only commits when it wasn't used short to write:

```ts
buoy('Conversation archived', {
  action: { label: 'Undo', onClick: restore },
  onDismiss: (reason) => {
    if (reason !== 'action') archiveOnServer();
  },
});
```

Built-in icons: `link`, `check`, `error`, `warning`, `info`, `upload`, `download`, `file`, `archive`, `image`, `send`, `folder`, `copy`, `stack`, `bell`, `timer`, `user`, `pause`, `play`, `retry`, `x`, `open`.

## Promises

```ts
buoy.promise(save(), {
  loading: 'Saving…',
  success: 'Saved to drafts',
  error: (e) => (e instanceof Error ? e.message : "Couldn't save"),
  retry: save,
});
```

It returns the promise you passed, so you can still `await` it. Pass `id` to show the promise in an existing message, or to give its message an id. If a newer message takes that id before the promise settles, the result is dropped.

## Background tasks

Give `buoy.track()` a function that does the work and reports progress. The island shows a live ring. Tapping it opens the tray, where each task can pause, resume, retry or cancel.

```ts
const job = buoy.track(
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
job.remove(); // off the island and out of the tray, whatever state it is in

const result = await job.done; // what the function returned, once it has finished
```

`job.done` waits until the task has really finished. A failed task can still be retried, so a failure leaves it waiting, and it resolves after a retry that works. It rejects with an `AbortError` if the task is canceled, or removed before it finished.

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
import { useBuoyTasks } from 'buoy-ui';

function UploadBadge() {
  const tasks = useBuoyTasks();
  const running = tasks.filter((t) => t.status === 'running').length;
  return running ? <span>{running} uploading</span> : null;
}
```

Without React, `buoy.subscribe()` calls you with the same list whenever a task is added, changes state, reports progress or is removed. It returns a function that stops it, and `buoy.tasks()` gives the list as it is now:

```ts
const stop = buoy.subscribe((tasks) => {
  badge.textContent = `${tasks.filter((t) => t.status === 'running').length} uploading`;
});
```

You can also open the tray yourself: `buoy.tray.open()`, `buoy.tray.close()`, `buoy.tray.toggle()`.

## Live activities

For something ongoing that you want to draw yourself, such as a timer, a call, a player or a recording, use `buoy.live()`. You supply the markup; the island still handles its size, motion, queue, the bubble for tasks, and screen reader announcements. A live activity stays until you close it, and steps aside for new messages before coming back.

```ts
let left = 25 * 60;
const timer = buoy.live({
  label: 'Focus timer',
  expandable: true, // a tap opens the details
  render(el, { expanded }) {
    const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    el.innerHTML = expanded
      ? `<div class="buoy-exp"><span class="buoy-exp-title">Focus</span><span class="buoy-exp-desc">${time} left</span></div>`
      : `<span class="buoy-row no-icon"><span class="buoy-title">Focus</span><span class="buoy-pct">${time}</span></span>`;
  },
});

const tick = setInterval(() => {
  left--;
  timer.refresh(); // draws again in place, without announcing
  if (!left) {
    clearInterval(tick);
    timer.close();
  }
}, 1000);
```

| Option | |
| --- | --- |
| `label` | What the activity is, for screen readers. Read out when it appears. |
| `render(el, { expanded })` | Fills the island. Called when it appears, when it opens or closes, and on every `refresh()`. |
| `expandable` | A tap opens the details, and `render` gets `expanded: true`. Esc or a click outside closes them. |
| `id` | Replaces the live activity with this id, and announces the new label. |
| `duration` | Leaves after this many milliseconds. Without it, the activity stays until `close()`. |
| `onClose(reason)` | Called when the activity leaves, with the same reasons as a message's `onDismiss`. |

The handle has `refresh()`, `expand(open?)` and `close()`. An expandable activity's compact view sits inside a button, so keep its markup non-interactive and put buttons in the expanded view.

To match every theme, reuse the island's own classes: `buoy-row`, `buoy-ic` (with `data-tone="accent|success|error|warn"`), `buoy-title`, `buoy-pct`, `buoy-act`, `buoy-ring`, `buoy-exp`, `buoy-exp-head`, `buoy-tile`, `buoy-exp-text`, `buoy-exp-title`, `buoy-exp-desc`, `buoy-x`, `buoy-bar`, `buoy-actions` and `buoy-btn` (with `is-primary` or `is-danger`). For anything else, these custom properties hold the current theme's colors: `--buoy-bg`, `--buoy-fg`, `--buoy-fg-2`, `--buoy-chip`, `--buoy-chip-2`, `--buoy-track`, `--buoy-tint`, `--buoy-success`, `--buoy-error` and `--buoy-warn`.

## Options

Pass these as props to `<Buoy />`, or to `mount()` and `buoy.configure()` without React.

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
| `labels` | `Partial<Labels>` | English | The island's own wording. See [Wording and other languages](#wording-and-other-languages) |
| `injectStyles` | `boolean` | `true` | Set to `false` if you import `buoy-ui/styles.css` yourself |
| `nonce` | `string` | | Nonce for the injected `<style>` under a strict CSP |
| `container` | `HTMLElement` | `document.body` | Where to render |

```tsx
<Buoy
  theme="frost"
  resting="pill"
  labels={{
    noun: 'upload',
    active: (tasks) => (tasks.length === 1 ? `Uploading ${tasks[0].label}` : `Uploading ${tasks.length} files`),
  }}
/>
```

## Wording and other languages

Everything the island writes itself is a label: its buttons, its task states, the tray, and what a screen reader hears. Pass the ones you want to change as `labels`. The rest keep their text.

```tsx
<Buoy
  labels={{
    noun: 'upload',
    retry: 'Try again',
    failures: (count) => (count === 1 ? 'An upload failed' : `${count} uploads failed`),
  }}
/>
```

To translate the island, pass them all. Sentences are functions, so plurals and word order can be right in any language:

```ts
const es: Partial<Labels> = {
  active: (tasks) => (tasks.length === 1 ? `Subiendo ${tasks[0].label}` : `Subiendo ${tasks.length} archivos`),
  failures: (count) => (count === 1 ? '1 subida falló' : `${count} subidas fallaron`),
  retry: 'Reintentar',
  activity: 'Actividad',
  // …
};

mount({ labels: es });
buoy.configure({ labels: null }); // every label back to its default
```

The [language example](https://buoy-ui.vercel.app/examples#language) has a complete Spanish set to copy.

| Label | Default | Where it shows |
| --- | --- | --- |
| `noun` | `'task'` | The default wording below: "2 tasks failed" |
| `active(tasks)` | The task's label, or "3 tasks" | The pill while tasks run |
| `doneOne(task)` | "photo.png finished" | Message when one task finishes |
| `doneMany(count)` | "3 tasks finished" | Message when several finish |
| `failures(count)` | "2 tasks failed" | The pill when tasks have failed |
| `summary(counts)` | "2 running · 1 queued" | Under the tray's title. `counts` has a number for each state |
| `guard(count)` | "Closing this tab stops 2 tasks." | The tray's warning while tasks run |
| `amount(loaded, total)` | "18.2 of 24 MB" | A task's amount line, unless the task has its own `format` |
| `size(total)` | "24 MB" | Beside a finished task |
| `timeLeft(seconds)` | "5 s left", "2 min left" | After the amount |
| `failedAt(error, amount)` | "Connection lost at 12 of 24 MB" | Under a failed task |
| `running`, `queued`, `paused`, `failed`, `done` | "Running", "Queued", … | Task states. `done` is also a promise's default success |
| `notStarted`, `finished` | "Waiting to start", "Finished" | Under a waiting task, and a finished one with no `doneLabel` |
| `activity`, `nothing`, `empty` | "Activity", "Nothing here yet", "Tasks you start show up here." | The tray's title, and an empty tray |
| `clearDone`, `pauseAll`, `resumeAll` | "Clear done", "Pause all", "Resume all" | Tray buttons |
| `retry`, `view`, `open`, `cancel`, `pause`, `resume`, `remove`, `close`, `dismiss` | "Retry", "View", … | Buttons. In the tray, a screen reader hears them with the task's name |
| `loading`, `error` | "Loading…", "Something went wrong" | A promise with no text of its own |
| `details(name)` | "Uploading 3 files. Show details" | Screen readers, on anything that opens |
| `waiting(count)` | "2 waiting" | Tooltip on the `+2` badge |
| `showActivity` | "Show activity" | Screen readers, on the resting pill |

## Theming

Set these custom properties anywhere above the island, `:root` included:

```css
:root {
  --buoy-accent: #2dd4bf;        /* progress on dark surfaces */
  --buoy-accent-strong: #0f766e; /* progress on light surfaces */
  --buoy-ink: #0b0b0c;           /* Ink and Notch fill */
  --buoy-font: 'Inter', system-ui, sans-serif;
  --buoy-offset: 12px;
  --buoy-z: 2147483000;
}
```

## Without React

```ts
import { buoy, mount } from 'buoy-ui/vanilla';

const island = mount({ theme: 'ink' });
buoy('Hello');
island.configure({ position: 'bottom' });
island.destroy();
```

In Vue, Svelte, Solid or any other framework, call `mount()` once when your app starts (for example in `onMount`), then `buoy()` from anywhere.

Or from a CDN:

```html
<script src="https://unpkg.com/buoy-ui/dist/buoy.global.js"></script>
<script>
  const { buoy, mount } = window.Buoy;
  mount();
  buoy('Hello');
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

## Development

Use Node 24 (`nvm use` reads `.nvmrc`). `npm test` runs the tests and `npm run site` serves the website at http://localhost:4173.

The website's link preview (`og.mp4` and `og.png`) is recorded from `website/og/preview.html`. After changing that page, run `node website/og/render.mjs`, which needs Playwright with Chromium and ffmpeg.

To release, bump `version` in `package.json` and push it to `main`. CI stages the new version on npm through trusted publishing, and a maintainer approves it in the Staged Packages tab on npmjs.com.

## License

MIT
