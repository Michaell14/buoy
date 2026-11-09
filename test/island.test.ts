import { describe, expect, it } from 'vitest';
import { createIsland } from '../src/core/island';
import { createStore } from '../src/core/store';

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
});
