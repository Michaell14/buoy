import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
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
