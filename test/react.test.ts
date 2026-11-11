import { act, createElement, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { shared } from '../src/core/shared';
import { Buoy, BuoyLive, buoy, useBuoyTasks, type BuoyLiveView } from '../src/index';

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

describe('<BuoyLive />', () => {
  // The store is shared by the whole page, so start without what the tests above left on it.
  beforeEach(() => {
    buoy.dismiss();
    shared().store.clearDone();
  });

  const island = () => document.querySelector<HTMLElement>('.buoy')!;
  const text = (selector: string) => island().querySelector(selector)?.textContent;
  // React draws when an act() ends, and the island draws a frame later, so each step is two of them.
  const settle = (ms?: number) => act(async () => wait(ms));
  const render = async (root: ReturnType<typeof createRoot>, node: Parameters<ReturnType<typeof createRoot>['render']>[0]) => {
    await act(async () => root.render(node));
    await settle();
  };
  const click = async (selector: string) => {
    await act(async () => island().querySelector<HTMLElement>(selector)!.click());
    await settle();
  };

  it('puts React content on the island, updates it from props and opens its details', async () => {
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    const closed: string[] = [];
    let left = 0;
    const call = (seconds: number, label = 'Call') =>
      createElement(
        Fragment,
        null,
        createElement(Buoy),
        createElement(BuoyLive, {
          label,
          expandable: true,
          onClose: (reason) => closed.push(reason),
          children: (view: BuoyLiveView) =>
            view.expanded
              ? createElement('button', { className: 'leave', onClick: () => { left++; view.close(); } }, `Leave after ${seconds}`)
              : createElement('span', { className: 'time' }, `Call ${seconds}`),
        }),
      );
    const show = (seconds: number, label?: string) => render(root, call(seconds, label));

    await show(1);
    expect(text('.time')).toBe('Call 1');
    expect(text('.buoy-sr')).toBe('Call');

    // New props draw again, with no refresh() and no second announcement.
    island().querySelector('.buoy-sr')!.textContent = '';
    await show(2);
    expect(text('.time')).toBe('Call 2');
    expect(text('.buoy-sr')).toBe('');

    await click('[data-act="live-open"]');
    expect(text('.leave')).toBe('Leave after 2');

    // A new label is read out, and the details stay open.
    await show(3, 'Call on hold');
    expect(text('.buoy-sr')).toBe('Call on hold');
    expect(text('.leave')).toBe('Leave after 3');

    // Buttons in the content are ordinary React buttons, and the view can close the activity.
    await click('.leave');
    expect(left).toBe(1);
    expect(closed).toEqual(['code']);
    expect(island().querySelector('.leave')).toBeNull();
    await act(async () => root.unmount());
  });

  it('leaves the island when it stops rendering, without calling onClose', async () => {
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    const onClose = () => {
      throw new Error('onClose is for an activity that leaves while it is still rendered');
    };
    const app = (recording: boolean) =>
      createElement(Fragment, null, createElement(Buoy), recording && createElement(BuoyLive, { label: 'Recording', onClose, children: createElement('span', { className: 'rec' }, 'Recording') }));
    await render(root, app(true));
    expect(text('.rec')).toBe('Recording');
    expect(shared().store.state.current?.type).toBe('live');
    await render(root, app(false));
    expect(shared().store.state.current).toBeNull();
    await act(async () => root.unmount());
  });

  it('renders beside useBuoyTasks without rendering forever', async () => {
    let renders = 0;
    function Uploads() {
      renders++;
      const tasks = useBuoyTasks();
      return createElement(BuoyLive, { label: 'Uploads', children: createElement('span', { className: 'count' }, `${tasks.length} uploading`) });
    }
    const host = document.body.appendChild(document.createElement('div'));
    const root = createRoot(host);
    await render(root, createElement(Fragment, null, createElement(Buoy), createElement(Uploads)));
    await settle(200);
    expect(text('.count')).toBe('0 uploading');
    expect(renders).toBeLessThan(6);
    await act(async () => root.unmount());
  });
});
