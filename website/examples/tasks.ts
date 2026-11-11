// Tasks: long work with real progress, a tray to control it, and room for messages beside it.
import { buoy } from '../../src/vanilla';
import type { TaskContext, TaskHandle, TaskInfo } from '../../src/vanilla';
import { $, ICON, esc, view, wait, type Example } from './kit';
import importReact from './code/import.react.txt';
import importVanilla from './code/import.vanilla.txt';
import uploadReact from './code/upload.react.txt';
import uploadVanilla from './code/upload.vanilla.txt';

const canceled = () => new DOMException('Canceled', 'AbortError');

const megabytes = (bytes: number) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(bytes >= 1e7 ? 0 : 1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`);

/** Pretends to send a file: a few seconds of progress, however big it is. Pauses and cancels like a real one. */
function pretendUpload(bytes: number) {
  return async (task: TaskContext) => {
    const steps = 55 + Math.random() * 45;
    let sent = 0;
    task.progress(0, bytes);
    while (sent < bytes) {
      await wait(100);
      await task.checkpoint();
      if (task.signal.aborted) throw canceled();
      sent = Math.min(bytes, sent + (bytes / steps) * (0.5 + Math.random()));
      task.progress(sent, bytes);
    }
  };
}

const SAMPLES: ReadonlyArray<readonly [name: string, bytes: number]> = [
  ['beach-sunset.heic', 24e6],
  ['holiday-video.mov', 48e6],
  ['itinerary.pdf', 1.2e6],
];
const isImage = (name: string) => /\.(heic|png|jpe?g|webp|gif|avif)$/i.test(name);

const upload: Example = {
  id: 'upload',
  group: 'Tasks',
  title: 'Upload files',
  api: 'buoy.track()',
  blurb: 'Each file becomes a tracked task. The island shows one live ring for all of them, and a tap opens the tray to pause, resume, retry or cancel.',
  hint: 'Two files run at a time. Tap the island to open the tray.',
  notes: [
    ['One ring for everything', 'Progress across every file drives a single ring on the island.'],
    ['Messages still get through', 'A message during an upload splits the island. The work shrinks into a bubble.'],
    ['Control from the tray', 'Tap the island to pause, resume, retry or cancel each file.'],
  ],
  code: { react: uploadReact, vanilla: uploadVanilla },
  mount(root) {
    const mine = new Map<string, TaskHandle>();
    let shown = '';

    buoy.configure({
      taskIcon: 'upload',
      labels: {
        noun: 'upload',
        active: (tasks) => (tasks.length === 1 ? `Uploading ${tasks[0].label}` : `Uploading ${tasks.length} files`),
        doneOne: (task) => `Uploaded ${task.label}`,
        doneMany: (count) => `${count} uploads finished`,
      },
    });

    function add(files: ReadonlyArray<readonly [name: string, bytes: number]>) {
      if (!files.length) return;
      for (const [name, bytes] of files) {
        const handle = buoy.track(pretendUpload(Math.max(1, bytes)), {
          label: name,
          total: Math.max(1, bytes),
          icon: isImage(name) ? 'image' : 'file',
          doneLabel: 'Uploaded just now',
        });
        mine.set(handle.id, handle);
      }
      // A message while work runs: the island splits, and the uploads carry on in the bubble.
      buoy(files.length === 1 ? 'Added 1 file' : `Added ${files.length} files`, { id: 'upload-added', icon: 'stack', duration: 2200 });
      draw(buoy.tasks());
    }

    const BUTTON: Partial<Record<TaskInfo['status'], readonly [action: string, label: string, icon: string]>> = {
      running: ['pause', 'Pause', ICON.pause],
      paused: ['resume', 'Resume', ICON.resume],
      queued: ['cancel', 'Cancel', ICON.x],
      failed: ['retry', 'Retry', ICON.retry],
    };
    const state = (task: TaskInfo) =>
      ({ running: `${Math.round(task.progress * 100)}%`, queued: 'Queued', paused: 'Paused', failed: 'Failed', done: megabytes(task.total) })[task.status];

    function draw(all: TaskInfo[]) {
      const tasks = all.filter((task) => mine.has(task.id));
      // Tasks that were canceled, or cleared from the tray, are gone from the island's list.
      for (const id of Array.from(mine.keys())) if (!tasks.some((task) => task.id === id)) mine.delete(id);
      const list = $(root, '.x-files');
      const structure = tasks.map((task) => task.id + task.status).join();
      if (structure !== shown) {
        shown = structure;
        const focused = document.activeElement instanceof HTMLElement && list.contains(document.activeElement) ? document.activeElement.dataset.id : undefined;
        list.innerHTML = tasks
          .map((task) => {
            const button = BUTTON[task.status];
            return (
              `<li class="x-file" data-status="${task.status}"><span class="x-tile is-small">${task.status === 'done' ? ICON.check : isImage(task.label) ? ICON.image : ICON.file}</span>` +
              `<div class="x-file-main"><div class="x-file-top"><span class="x-file-name">${esc(task.label)}</span><span class="x-num" data-state></span></div>` +
              `<div class="x-bar"><i></i></div></div>` +
              (button
                ? `<button type="button" class="x-icon" data-do="${button[0]}" data-id="${task.id}" aria-label="${button[1]} ${esc(task.label)}">${button[2]}</button>`
                : '<span class="x-icon-gap" aria-hidden="true"></span>') +
              '</li>'
            );
          })
          .join('');
        list.hidden = !tasks.length;
        if (focused) list.querySelector<HTMLElement>(`[data-id="${focused}"]`)?.focus();
      }
      tasks.forEach((task, i) => {
        const row = list.children[i];
        row.querySelector('[data-state]')!.textContent = state(task);
        row.querySelector<HTMLElement>('.x-bar > i')!.style.width = `${(task.progress * 100).toFixed(1)}%`;
      });
    }

    view(
      root,
      `<div class="x-card">
        <label class="x-drop">
          <input type="file" multiple class="x-sr" id="x-upload-files">
          ${ICON.upload}
          <span><strong>Drop files here</strong> or choose them</span>
          <span class="x-drop-note">Nothing is sent anywhere. The uploads are pretend.</span>
        </label>
        <ul class="x-files" hidden></ul>
        <button type="button" class="x-btn is-quiet is-wide" data-do="samples">Add three sample files</button>
      </div>`,
      (action, target) => {
        const handle = mine.get(target.dataset.id ?? '');
        if (action === 'samples') add(SAMPLES);
        if (action === 'pause') handle?.pause();
        if (action === 'resume') handle?.resume();
        if (action === 'cancel') handle?.cancel();
        if (action === 'retry') handle?.retry();
      },
    );

    const drop = $(root, '.x-drop');
    const input = $<HTMLInputElement>(root, 'input');
    const take = (files: FileList | null | undefined) => add(Array.from(files ?? [], (file) => [file.name, file.size] as const));
    input.addEventListener('change', () => {
      take(input.files);
      input.value = '';
    });
    drop.addEventListener('dragover', (event) => {
      event.preventDefault();
      drop.classList.add('is-over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
    drop.addEventListener('drop', (event) => {
      event.preventDefault();
      drop.classList.remove('is-over');
      take(event.dataTransfer?.files);
    });

    // The list below mirrors the island's own: every change to a task draws it again.
    const unsubscribe = buoy.subscribe(draw);
    return () => {
      unsubscribe();
      for (const handle of mine.values()) handle.remove();
    };
  },
};

const rows = new Intl.NumberFormat('en-US');

const importCsv: Example = {
  id: 'import',
  group: 'Tasks',
  title: 'Import a CSV',
  api: 'buoy.track() with retry',
  blurb: 'Progress does not have to be bytes. This import counts rows, fails halfway on its first run, and picks up again on a retry.',
  hint: 'The first run stops halfway on purpose. Retry from the island or the button.',
  notes: [
    ['Your units', 'format turns the amount line into rows, files or anything else you count.'],
    ['Failing is a state', 'Throw and the task is marked failed with your message. A retry runs it again, with task.attempt at 2.'],
    ['Await the result', 'The handle has a done promise. It resolves with what the work returned, however many tries that took.'],
  ],
  code: { react: importReact, vanilla: importVanilla },
  mount(root) {
    const total = 2480;
    let job: TaskHandle<{ added: number; updated: number }> | null = null;
    let result: { added: number; updated: number } | null = null;

    buoy.configure({
      taskIcon: 'download',
      labels: {
        noun: 'import',
        active: () => 'Importing contacts',
        doneOne: () => `Imported ${rows.format(total)} contacts`,
        doneMany: (count) => `${count} imports finished`,
      },
    });

    view(
      root,
      `<div class="x-card">
        <div class="x-head">
          <span class="x-tile">${ICON.file}</span>
          <div class="x-text"><strong>contacts.csv</strong><span>${rows.format(total)} rows · 6 columns</span></div>
        </div>
        <label class="x-check"><input type="checkbox" checked><span>Drop the connection on the first run</span></label>
        <button type="button" class="x-btn is-wide" data-do="go"></button>
        <p class="x-foot" aria-live="polite"></p>
      </div>`,
      () => {
        const task = current();
        if (task?.status === 'failed') job?.retry();
        else if (!task || task.status === 'done') start();
        draw();
      },
    );
    const flaky = $<HTMLInputElement>(root, 'input');
    const button = $<HTMLButtonElement>(root, 'button');
    const current = () => buoy.tasks().find((task) => task.id === job?.id);

    function start() {
      result = null;
      job = buoy.track(
        async (task) => {
          let done = 0;
          while (done < total) {
            await wait(110);
            await task.checkpoint();
            if (task.signal.aborted) throw canceled();
            done = Math.min(total, done + 40 + Math.round(Math.random() * 50));
            if (flaky.checked && task.attempt === 1 && done > total * 0.55) throw new Error('Connection dropped');
            task.progress(done, total);
          }
          return { added: total - 38, updated: 38 };
        },
        {
          label: 'contacts.csv',
          total,
          icon: 'user',
          format: (done, all) => `${rows.format(Math.round(done))} of ${rows.format(all)} rows`,
          doneLabel: 'Imported just now',
        },
      );
      // The handle's promise carries on once the import has finished, however many runs it took.
      job.done.then(
        (summary) => {
          result = summary;
          draw();
        },
        () => {},
      );
    }

    function draw() {
      const task = current();
      const active = task?.status === 'running' || task?.status === 'queued' || task?.status === 'paused';
      button.disabled = active;
      button.textContent = active ? 'Importing…' : task?.status === 'failed' ? 'Try again' : task?.status === 'done' ? 'Import again' : 'Import contacts';
      const count = task ? `${rows.format(Math.round(task.loaded))} of ${rows.format(total)} rows` : '';
      const line =
        task?.status === 'failed'
          ? `Stopped at ${count}: ${task.error ?? 'failed'}.`
          : task?.status === 'done'
            ? result
              ? `${rows.format(result.added)} added and ${rows.format(result.updated)} updated.`
              : `${rows.format(total)} contacts imported.`
            : task?.status === 'paused'
              ? `Paused at ${count}.`
              : active
                ? `${count}${task.attempt > 1 ? ' · second run' : ''}`
                : 'Ready when you are.';
      const foot = $(root, '.x-foot');
      if (foot.textContent !== line) foot.textContent = line;
    }

    draw();
    const unsubscribe = buoy.subscribe(draw);
    return () => {
      unsubscribe();
      job?.remove();
    };
  },
};

export const TASKS = [upload, importCsv];
