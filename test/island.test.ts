import { describe, expect, it } from 'vitest';
import { createIsland } from '../src/core/island';
import { createStore } from '../src/core/store';
import type { TaskContext } from '../src/core/types';

const settle = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

describe('island', () => {
  it('mounts, shows a message, announces it and cleans up', async () => {
    const store = createStore();
    const island = createIsland(store);
    expect(document.querySelectorAll('.buoy')).toHaveLength(1);
    store.push('Link copied', { icon: 'link' });
    await settle();
    expect(island.element.querySelector('.buoy-shell')?.textContent).toContain('Link copied');
    expect(island.element.querySelector('.buoy-sr')?.textContent).toBe('Link copied');
    island.destroy();
    expect(document.querySelector('.buoy')).toBeNull();
    expect(document.querySelector('[data-buoy-goo]')).toBeNull();
  });

  it('reflects options as attributes', async () => {
    const store = createStore();
    const island = createIsland(store);
    store.configure({ theme: 'notch', position: 'bottom', richColors: true, colorScheme: 'dark', offset: 20 });
    await settle();
    const el = island.element;
    expect(el.dataset.buoyTheme).toBe('notch');
    expect(el.dataset.position).toBe('bottom');
    expect(el.dataset.rich).toBe('true');
    expect(el.dataset.scheme).toBe('dark');
    expect(el.style.getPropertyValue('--buoy-offset')).toBe('20px');
    island.destroy();
  });

  it('escapes message text', async () => {
    const store = createStore();
    const island = createIsland(store);
    store.push('<img src=x onerror=alert(1)>');
    await settle();
    expect(island.element.querySelector('img')).toBeNull();
    expect(island.element.querySelector('.buoy-title')?.textContent).toBe('<img src=x onerror=alert(1)>');
    island.destroy();
  });

  it('runs an action and dismisses the message', async () => {
    const store = createStore();
    const island = createIsland(store);
    let clicked = 0;
    store.push("Couldn't save", { type: 'error', action: { label: 'Retry', onClick: () => clicked++ } });
    await settle();
    island.element.querySelector<HTMLButtonElement>('[data-act="action"]')!.click();
    expect(clicked).toBe(1);
    expect(store.state.current).toBeNull();
    island.destroy();
  });

  it('tells onDismiss that a button was pressed, before the button runs, or that the person dismissed it', async () => {
    const store = createStore();
    const island = createIsland(store);
    const order: string[] = [];
    store.push('Conversation archived', {
      action: { label: 'Undo', onClick: () => order.push('undo') },
      onDismiss: (reason) => order.push(reason),
    });
    await settle();
    island.element.querySelector<HTMLButtonElement>('[data-act="action"]')!.click();
    expect(order).toEqual(['action', 'undo']);

    store.push('Link copied', { onDismiss: (reason) => order.push(reason) });
    await settle();
    island.element.querySelector<HTMLElement>('.buoy-title')!.click();
    expect(order).toEqual(['action', 'undo', 'user']);
    island.destroy();
  });

  it('draws a live activity, refreshes it in place and leaves other redraws alone', async () => {
    const store = createStore();
    const island = createIsland(store);
    let n = 0;
    const live = store.live({ label: 'Focus timer', render: (el) => { n++; el.textContent = `tick ${n}`; } });
    await settle();
    const shell = island.element.querySelector('.buoy-shell')!;
    const sr = island.element.querySelector('.buoy-sr')!;
    expect(shell.textContent).toBe('tick 1');
    expect(sr.textContent).toBe('Focus timer');
    sr.textContent = '';
    live.refresh();
    await settle();
    expect(shell.textContent).toBe('tick 2');
    expect(sr.textContent).toBe('');
    store.configure({ theme: 'paper' });
    await settle();
    expect(n).toBe(2);
    live.close();
    await settle();
    expect(store.state.current).toBeNull();
    island.destroy();
  });

  it('opens an expandable live activity on tap and closes it with Escape or a click outside', async () => {
    const store = createStore();
    const island = createIsland(store);
    const views: boolean[] = [];
    store.live({
      label: 'Call',
      expandable: true,
      render: (el, { expanded }) => {
        views.push(expanded);
        el.innerHTML = expanded ? '<button type="button" class="leave">Leave</button>' : '<span>Call 0:12</span>';
      },
    });
    await settle();
    const open = () => island.element.querySelector<HTMLButtonElement>('[data-act="live-open"]')!;
    expect(open().getAttribute('aria-label')).toBe('Call. Show details');
    open().click();
    await settle();
    expect(island.element.querySelector('.leave')).not.toBeNull();
    island.element.querySelector<HTMLElement>('[data-fk="live-x"]')!.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await settle();
    expect(store.state.current?.open).toBe(false);
    expect(store.state.current?.type).toBe('live');
    open().click();
    await settle();
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    await settle();
    expect(store.state.current?.open).toBe(false);
    expect(views).toEqual([false, true, false, true, false]);
    island.destroy();
  });

  it('leaves clicks inside a live activity to its own buttons', async () => {
    const store = createStore();
    const island = createIsland(store);
    let undone = 0;
    store.live({
      label: '3 files deleted',
      render: (el) => {
        el.innerHTML = '<span class="text">3 files deleted</span><button type="button" class="undo">Undo</button>';
        el.querySelector('.undo')!.addEventListener('click', () => undone++);
      },
    });
    await settle();
    island.element.querySelector<HTMLElement>('.text')!.click();
    expect(store.state.current?.type).toBe('live');
    island.element.querySelector<HTMLButtonElement>('.undo')!.click();
    expect(undone).toBe(1);
    island.destroy();
  });

  it('keeps a message that a live activity button shows', async () => {
    const store = createStore();
    const island = createIsland(store);
    const live = store.live({
      label: '3 files deleted',
      render: (el) => {
        el.innerHTML = '<button type="button" class="undo">Undo</button>';
        el.querySelector('.undo')!.addEventListener('click', () => {
          live.close();
          store.push('Restored 3 files', { type: 'success' });
        });
      },
    });
    await settle();
    island.element.querySelector<HTMLButtonElement>('.undo')!.click();
    expect(store.state.current?.title).toBe('Restored 3 files');
  });

  it('opens the tray from the live pill and lists tasks', async () => {
    const store = createStore();
    const island = createIsland(store);
    store.track(() => new Promise(() => {}), { label: 'big-file.zip', total: 100 });
    await settle();
    const live = island.element.querySelector<HTMLButtonElement>('.buoy-live');
    expect(live?.textContent).toContain('big-file.zip');
    live!.click();
    await settle();
    const tray = island.element.querySelector('.buoy-tray');
    expect(tray).not.toBeNull();
    expect(tray?.textContent).toContain('1 running');
    expect(tray?.textContent).toContain('big-file.zip');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(store.state.trayOpen).toBe(false);
    island.destroy();
  });

  it('takes every piece of its own text from labels', async () => {
    const store = createStore();
    const island = createIsland(store);
    // Replace each label with its own name in guillemets, then look for any text that is not one.
    const labels: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(store.defaults.labels)) labels[key] = typeof value === 'function' ? () => `«${key}»` : `«${key}»`;
    // Like the real summary, this one has nothing to say about an empty tray.
    labels.summary = (counts: Record<string, number>) => (Object.values(counts).some(Boolean) ? '«summary»' : '');
    store.configure({ labels: labels as never, resting: 'pill' });

    const heard: string[] = [];
    const read = async () => {
      await settle();
      heard.push(island.element.querySelector('.buoy-shell')!.textContent ?? '', island.element.querySelector('.buoy-sr')!.textContent ?? '');
      island.element.querySelectorAll('[aria-label], [title]').forEach((el) => heard.push(el.getAttribute('aria-label') ?? '', el.getAttribute('title') ?? ''));
    };
    const gate = () => {
      let open!: () => void;
      let fail!: (error?: unknown) => void;
      const promise = new Promise<void>((yes, no) => {
        open = yes;
        fail = no;
      });
      return { promise, open, fail };
    };

    // Messages and promises.
    store.push('One', { description: 'Two', expanded: true });
    await read();
    store.dismiss();
    store.push('One');
    store.push('Two');
    await read();
    store.dismiss();
    const rejected = gate();
    store.promise(rejected.promise, { retry: () => {} });
    await read();
    rejected.fail();
    await read();
    store.dismiss();
    const resolved = gate();
    store.promise(resolved.promise);
    resolved.open();
    await read();
    store.dismiss();

    // Tasks: two run and one waits, then they pause, fail and finish.
    const a = gate();
    const b = gate();
    const c = gate();
    let first!: TaskContext;
    const ta = store.track((task) => { first = task; return a.promise; }, { label: 'a.png', total: 8e6 });
    const tb = store.track(() => b.promise, { label: 'b.png', total: 8e6 });
    store.track(() => c.promise, { label: 'c.png' });
    await read();
    await settle(80);
    first.progress(2e6, 8e6);
    store.openTray();
    await read();
    ta.pause();
    await read();
    store.pauseAll();
    await read();
    store.closeTray();
    await read();
    store.resumeAll();
    b.fail();
    a.open();
    c.open();
    await read();
    store.openTray();
    await read();
    store.closeTray();
    tb.remove();

    // A batch that finishes cleanly: one task, then two.
    const d = gate();
    store.track(() => d.promise, { label: 'd.png', onOpen: () => {} });
    d.open();
    await read();
    store.openTray();
    await read();
    store.closeTray();
    store.dismiss();
    const e = gate();
    store.track(() => e.promise, { label: 'a.png' });
    store.track(() => e.promise, { label: 'b.png' });
    e.open();
    await read();
    store.dismiss();
    await read();
    store.clearDone();
    store.openTray();
    await read();
    store.closeTray();

    // History: a message that timed out shows under Recent.
    store.configure({ history: 3 });
    store.push('Two', { duration: 10 });
    await settle(80);
    store.openTray();
    await read();

    const all = heard.join(' ');
    const own = all.replace(/«\w+»/g, '');
    for (const mine of ['a.png', 'b.png', 'c.png', 'd.png', 'One', 'Two']) expect(all).toContain(mine);
    expect(own.replace(/[abcd]\.png|One|Two/g, '')).not.toMatch(/[A-Za-z]/);
    // `noun` and `running` only feed the default wording, which this test replaces.
    const unused = Object.keys(labels).filter((key) => !all.includes(`«${key}»`));
    expect(unused).toEqual(['noun', 'running']);
    island.destroy();
  });

  it('draws a countdown ring that shows the time left', async () => {
    const store = createStore();
    const island = createIsland(store);
    store.push('Conversation archived', { countdown: true, duration: 6000, action: { label: 'Undo' } });
    await settle();
    const ring = island.element.querySelector<SVGElement>('.buoy-count .val');
    expect(ring).not.toBeNull();
    expect(island.element.querySelector('.buoy-row')?.classList.contains('end-count')).toBe(true);
    // Nearly full: only the first moments have gone.
    expect(Number(ring!.style.strokeDashoffset)).toBeLessThan(5);
    store.dismiss();
    store.push('Link copied', { duration: Infinity, countdown: true });
    await settle();
    expect(island.element.querySelector('.buoy-count')).toBeNull();
    island.destroy();
  });

  it('draws filled content before measuring, and reads it out', async () => {
    const store = createStore();
    const island = createIsland(store);
    store.push('', {
      description: ' ',
      expanded: true,
      fill: (slot: string, el: HTMLElement) => {
        el.innerHTML = slot === 'title' ? '<b class="t">Saved</b> Q3' : '<i class="d">to Drafts</i>';
      },
    } as never);
    await settle();
    expect(island.element.querySelector('.buoy-shell .t')?.textContent).toBe('Saved');
    expect(island.element.querySelector('.buoy-shell .d')?.textContent).toBe('to Drafts');
    expect(island.element.querySelector('.buoy-sr')?.textContent).toBe('Saved Q3. to Drafts');
    island.destroy();
  });

  it('lists recent messages in the tray, and opens it from the resting pill', async () => {
    const store = createStore();
    const island = createIsland(store);
    store.configure({ history: 3, resting: 'pill' });
    store.push('Invite sent', { type: 'success', duration: 10 });
    await settle(80);
    const rest = island.element.querySelector<HTMLButtonElement>('button.buoy-rest');
    expect(rest).not.toBeNull();
    rest!.click();
    await settle();
    const tray = island.element.querySelector('.buoy-tray')!;
    expect(tray.querySelector('.buoy-recent-title')?.textContent).toBe('Recent');
    expect(tray.querySelector('.buoy-past')?.textContent).toContain('Invite sent');
    expect(tray.querySelector('.buoy-past')?.textContent).toContain('Just now');
    expect(tray.querySelector('.buoy-empty')).toBeNull();
    island.destroy();
  });
});
