import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { shared } from '../src/core/shared';
import { Buoy, buoy, useBuoyTasks } from '../src/index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const wait = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

describe('<Buoy />', () => {
  it('mounts the island, follows its props and unmounts cleanly', async () => {
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    await act(async () => root.render(createElement(Buoy, { theme: 'paper', position: 'bottom' })));
    const el = document.querySelector<HTMLElement>('.buoy')!;
    expect(el.dataset.buoyTheme).toBe('paper');
    expect(el.dataset.position).toBe('bottom');
    expect(document.querySelectorAll('style[data-buoy]')).toHaveLength(1);

    await act(async () => {
      buoy.success('Saved to drafts');
      await wait();
    });
    expect(el.textContent).toContain('Saved to drafts');

    // Removing a prop puts it back to its default.
    await act(async () => root.render(createElement(Buoy, { theme: 'frost' })));
    expect(el.dataset.buoyTheme).toBe('frost');
    expect(el.dataset.position).toBe('top');

    await act(async () => root.unmount());
    expect(document.querySelector('.buoy')).toBeNull();
    buoy.dismiss();
  });

  it('takes any label as a prop, keeps inline functions from reconfiguring, and restores defaults', async () => {
    const { store } = shared();
    let configured = 0;
    const stop = store.subscribe((event) => {
      if (event === 'config') configured++;
    });
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    const render = (activity: string, suffix: string) =>
      act(async () => root.render(createElement(Buoy, { labels: { activity, failures: (count) => `${count} ${suffix}` } })));

    await render('Aktivität', 'fehlgeschlagen');
    expect(store.cfg.labels.activity).toBe('Aktivität');
    expect(store.cfg.labels.failures(2)).toBe('2 fehlgeschlagen');
    expect(store.cfg.labels.close).toBe('Close');

    // A new inline function is picked up without another configure.
    const before = configured;
    await render('Aktivität', 'gescheitert');
    expect(configured).toBe(before);
    expect(store.cfg.labels.failures(2)).toBe('2 gescheitert');

    await act(async () => root.render(createElement(Buoy, {})));
    expect(store.cfg.labels.activity).toBe('Activity');
    expect(store.cfg.labels.failures(2)).toBe('2 tasks failed');
    stop();
    await act(async () => root.unmount());
  });

  it('shares tasks with React through useBuoyTasks', async () => {
    function Count() {
      const tasks = useBuoyTasks();
      return createElement('output', null, `${tasks.length} ${tasks[0]?.status ?? ''}`);
    }
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    await act(async () => root.render(createElement(Count)));
    expect(host.textContent).toBe('0 ');
    let finish!: () => void;
    await act(async () => {
      buoy.track(() => new Promise<void>((resolve) => (finish = resolve)), { label: 'report.pdf' });
    });
    expect(host.textContent).toBe('1 running');
    await act(async () => {
      finish();
      await wait(0);
    });
    expect(host.textContent).toBe('1 done');
    await act(async () => root.unmount());
  });
});
