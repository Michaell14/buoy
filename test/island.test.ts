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
