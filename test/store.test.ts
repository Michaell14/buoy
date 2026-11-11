import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../src/core/store';
import type { TaskContext } from '../src/core/types';

/** A store with an island "attached", so timers run. */
function attached() {
  const store = createStore();
  store.setPaused('detached', false);
  return store;
}

/** Work that reports progress in `steps` ticks of 100 ms. */
function work(steps: number, opts: { failAt?: number } = {}) {
  return async (task: TaskContext) => {
    for (let i = 1; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await task.checkpoint();
      if (task.signal.aborted) throw new DOMException('Canceled', 'AbortError');
      if (opts.failAt && task.attempt === 1 && i === opts.failAt) throw new Error('Connection lost');
      task.progress(i, steps);
    }
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('messages', () => {
  it('shows a message and dismisses it after its duration', () => {
    const s = attached();
    s.push('Saved');
    expect(s.state.current?.title).toBe('Saved');
    vi.advanceTimersByTime(2999);
    expect(s.state.current?.title).toBe('Saved');
    vi.advanceTimersByTime(1);
    expect(s.state.current).toBeNull();
  });

  it('shows one message at a time and hurries the visible one when others wait', () => {
    const s = attached();
    s.push('One');
    s.push('Two');
    s.push('Three');
    expect(s.state.current?.title).toBe('One');
    expect(s.state.queue.map((m) => m.title)).toEqual(['Two', 'Three']);
    // The first message gets its minimum readable time, then hands over.
    vi.advanceTimersByTime(900);
    expect(s.state.current?.title).toBe('Two');
    // While others still wait, each message holds for 1.5 s.
    vi.advanceTimersByTime(1500);
    expect(s.state.current?.title).toBe('Three');
    vi.advanceTimersByTime(3000);
    expect(s.state.current).toBeNull();
  });

  it('lets a new message in quickly once the current one has been read', () => {
    const s = attached();
    s.push('Link copied');
    vi.advanceTimersByTime(2000);
    s.push('Saving…', { type: 'loading', duration: Infinity });
    expect(s.state.current?.title).toBe('Link copied');
    vi.advanceTimersByTime(200);
    expect(s.state.current?.title).toBe('Saving…');
  });

  it('keeps errors until dismissed, and lets newer messages pass in front', () => {
    const s = attached();
    s.push("Couldn't save", { type: 'error' });
    vi.advanceTimersByTime(60_000);
    expect(s.state.current?.type).toBe('error');
    s.push('Link copied');
    expect(s.state.current?.title).toBe('Link copied');
    vi.advanceTimersByTime(1500);
    expect(s.state.current?.type).toBe('error');
    s.dismiss(s.state.current!.id);
    expect(s.state.current).toBeNull();
  });

  it('gives messages with buttons more time', () => {
    const s = attached();
    s.push('Export ready', { actions: [{ label: 'Open' }] });
    vi.advanceTimersByTime(5999);
    expect(s.state.current).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(s.state.current).toBeNull();
  });

  it('waits for an island before starting timers', () => {
    const s = createStore();
    s.push('Hello');
    vi.advanceTimersByTime(10_000);
    expect(s.state.current?.title).toBe('Hello');
    s.setPaused('detached', false);
    vi.advanceTimersByTime(3000);
    expect(s.state.current).toBeNull();
  });

  it('pauses while hovered and resumes with the time that was left', () => {
    const s = attached();
    s.push('Hold on');
    vi.advanceTimersByTime(2000);
    s.setPaused('hover', true);
    vi.advanceTimersByTime(10_000);
    expect(s.state.current?.title).toBe('Hold on');
    s.setPaused('hover', false);
    vi.advanceTimersByTime(999);
    expect(s.state.current).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(s.state.current).toBeNull();
  });

  it('updates a message in place when given its id', () => {
    const s = attached();
    s.push('Uploading…', { id: 'up', duration: Infinity });
    s.push('Uploaded', { id: 'up', type: 'success' });
    expect(s.state.current?.id).toBe('up');
    expect(s.state.current?.title).toBe('Uploaded');
    expect(s.state.queue).toHaveLength(0);
  });

  it('dismisses everything when called without an id', () => {
    const s = attached();
    s.push('One');
    s.push('Two');
    s.dismiss();
    expect(s.state.current).toBeNull();
    expect(s.state.queue).toHaveLength(0);
  });

  it('calls onDismiss for a message that was waiting in the queue', () => {
    const s = attached();
    const onDismiss = vi.fn();
    const id = s.push('Now playing', { persist: true, onDismiss });
    s.push('Link copied');
    expect(s.state.queue.map((m) => m.title)).toEqual(['Now playing']);
    s.dismiss(id);
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(s.state.queue).toHaveLength(0);
  });

  it('calls onDismiss for every message when clearing everything', () => {
    const s = attached();
    const first = vi.fn();
    const second = vi.fn();
    s.push('Now playing', { persist: true, onDismiss: first });
    s.push('Link copied', { onDismiss: second });
    s.dismiss();
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('calls onDismiss', () => {
    const s = attached();
    const onDismiss = vi.fn();
    s.push('Bye', { onDismiss });
    vi.advanceTimersByTime(3000);
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});

describe('promise', () => {
  it('turns loading into success on the same message', async () => {
    const s = attached();
    let resolve!: (value: string) => void;
    const pending = new Promise<string>((r) => (resolve = r));
    s.promise(pending, { loading: 'Saving…', success: (v) => `Saved ${v}` });
    const id = s.state.current!.id;
    expect(s.state.current?.type).toBe('loading');
    vi.advanceTimersByTime(30_000);
    expect(s.state.current?.type).toBe('loading');
    resolve('draft');
    await vi.advanceTimersByTimeAsync(0);
    expect(s.state.current?.id).toBe(id);
    expect(s.state.current?.type).toBe('success');
    expect(s.state.current?.title).toBe('Saved draft');
    await vi.advanceTimersByTimeAsync(2000);
    expect(s.state.current).toBeNull();
  });

  it('can show the promise in an existing message, by id', async () => {
    const s = attached();
    s.push('Link copied', { id: 'demo' });
    let resolve!: () => void;
    s.promise(new Promise<void>((r) => (resolve = r)), { id: 'demo', loading: 'Saving…', success: 'Saved' });
    expect(s.state.current?.id).toBe('demo');
    expect(s.state.current?.type).toBe('loading');
    expect(s.state.queue).toHaveLength(0);
    resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(s.state.current?.title).toBe('Saved');
  });

  it('drops its result when a newer message has taken over its id', async () => {
    const s = attached();
    let resolve!: () => void;
    s.promise(new Promise<void>((r) => (resolve = r)), { id: 'demo', loading: 'Saving…', success: 'Saved' });
    s.push('Link copied', { id: 'demo' });
    resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(s.state.current?.title).toBe('Link copied');
    s.dismiss('demo');
    let resolveLater!: () => void;
    s.promise(new Promise<void>((r) => (resolveLater = r)), { id: 'demo', success: 'Saved' });
    s.dismiss('demo');
    s.push('Message sent', { id: 'demo' });
    resolveLater();
    await vi.advanceTimersByTimeAsync(0);
    expect(s.state.current?.title).toBe('Message sent');
  });

  it('turns a rejection into an error that stays, with a retry button', async () => {
    const s = attached();
    const retry = vi.fn();
    const failing = Promise.reject(new Error('Network down'));
    s.promise(failing, { error: (e) => (e as Error).message, retry }).catch(() => {});
    await vi.advanceTimersByTimeAsync(0);
    expect(s.state.current?.type).toBe('error');
    expect(s.state.current?.title).toBe('Network down');
    expect(s.state.current?.action?.label).toBe('Retry');
    await vi.advanceTimersByTimeAsync(60_000);
    expect(s.state.current?.type).toBe('error');
  });
});

describe('tasks', () => {
  it('runs two at a time and queues the rest', async () => {
    const s = attached();
    s.track(work(5), { label: 'a' });
    s.track(work(5), { label: 'b' });
    s.track(work(5), { label: 'c' });
    expect(s.tasks().map((t) => t.status)).toEqual(['running', 'running', 'queued']);
    await vi.advanceTimersByTimeAsync(500);
    expect(s.tasks().map((t) => t.status)).toEqual(['done', 'done', 'running']);
  });

  it('reports progress across the batch', async () => {
    const s = attached();
    s.track(work(4), { label: 'a', total: 4 });
    s.track(work(4), { label: 'b', total: 4 });
    await vi.advanceTimersByTimeAsync(200);
    expect(s.aggregate()).toBeCloseTo(0.5);
  });

  it('pauses at the next checkpoint, frees the slot and resumes later', async () => {
    const s = attached();
    const a = s.track(work(5), { label: 'a' });
    s.track(work(5), { label: 'b' });
    s.track(work(5), { label: 'c' });
    await vi.advanceTimersByTimeAsync(150);
    a.pause();
    expect(s.tasks().map((t) => t.status)).toEqual(['paused', 'running', 'running']);
    await vi.advanceTimersByTimeAsync(1000);
    expect(s.tasks()[0].status).toBe('paused');
    a.resume();
    await vi.advanceTimersByTimeAsync(1000);
    expect(s.tasks().every((t) => t.status === 'done')).toBe(true);
  });

  it('cancels a task and aborts its signal', async () => {
    const s = attached();
    let signal: AbortSignal | undefined;
    const handle = s.track(async (task) => {
      signal = task.signal;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }, { label: 'a' });
    await vi.advanceTimersByTimeAsync(10);
    handle.cancel();
    expect(signal?.aborted).toBe(true);
    expect(s.tasks()).toHaveLength(0);
  });

  it('marks a failure, flags it for attention and retries on a second attempt', async () => {
    const s = attached();
    const handle = s.track(work(3, { failAt: 2 }), { label: 'photo.png' });
    await vi.advanceTimersByTimeAsync(250);
    expect(s.tasks()[0]).toMatchObject({ status: 'failed', error: 'Connection lost' });
    expect(s.failed()).toHaveLength(1);
    expect(s.state.attentionDismissed).toBe(false);
    handle.retry();
    await vi.advanceTimersByTimeAsync(350);
    expect(s.tasks()[0]).toMatchObject({ status: 'done', attempt: 2 });
    expect(s.state.current?.title).toBe('photo.png finished');
  });

  it('announces a finished batch with a View button that opens the tray', async () => {
    const s = attached();
    s.track(work(2), { label: 'a' });
    s.track(work(2), { label: 'b' });
    await vi.advanceTimersByTimeAsync(250);
    expect(s.state.current?.title).toBe('2 tasks finished');
    s.state.current?.action?.onClick?.();
    expect(s.state.trayOpen).toBe(true);
  });

  it('uses custom labels', async () => {
    const s = attached();
    s.configure({ labels: { noun: 'upload', doneMany: (n) => `${n} uploads are up` } });
    s.track(work(1), { label: 'a' });
    s.track(work(1), { label: 'b' });
    await vi.advanceTimersByTimeAsync(150);
    expect(s.state.current?.title).toBe('2 uploads are up');
  });
});

describe('live activities', () => {
  const draw = () => {};

  it('stays until closed, steps aside for messages and comes back', () => {
    const s = attached();
    let closed = 0;
    const live = s.live({ label: 'Focus timer', render: draw, onClose: () => closed++ });
    expect(s.state.current?.type).toBe('live');
    vi.advanceTimersByTime(60_000);
    expect(s.state.current?.id).toBe(live.id);
    s.push('Link copied');
    expect(s.state.current?.title).toBe('Link copied');
    vi.advanceTimersByTime(3000);
    expect(s.state.current?.id).toBe(live.id);
    live.close();
    expect(s.state.current).toBeNull();
    expect(closed).toBe(1);
  });

  it('refreshes without announcing, and only opens when expandable', () => {
    const s = attached();
    const events: string[] = [];
    s.subscribe((event) => events.push(event));
    const plain = s.live({ label: 'Offline', render: draw });
    expect(events).toContain('show');
    events.length = 0;
    plain.refresh();
    expect(events).toEqual(['change']);
    plain.expand();
    expect(s.state.current?.open).toBe(false);
    plain.close();
    const call = s.live({ label: 'Call', render: draw, expandable: true });
    const rev = s.state.current!.rev;
    call.expand();
    expect(s.state.current?.open).toBe(true);
    expect(s.state.current!.rev).toBeGreaterThan(rev);
    call.expand(false);
    expect(s.state.current?.open).toBe(false);
  });

  it('leaves after a duration, and is replaced in place by id', () => {
    const s = attached();
    const first = s.live({ id: 'net', label: "You're offline", render: draw });
    const rev = s.state.current!.rev;
    s.live({ id: 'net', label: 'Back online', render: draw, duration: 2000 });
    expect(s.state.current?.id).toBe(first.id);
    expect(s.state.current?.title).toBe('Back online');
    expect(s.state.current!.rev).toBeGreaterThan(rev);
    vi.advanceTimersByTime(2000);
    expect(s.state.current).toBeNull();
  });
});

describe('dismiss reasons', () => {
  it('tells onDismiss whether the time ran out or the code dismissed it', () => {
    const s = attached();
    const reasons: string[] = [];
    s.push('Saved', { onDismiss: (reason) => reasons.push(reason) });
    vi.advanceTimersByTime(3000);
    const id = s.push('Syncing…', { duration: Infinity, onDismiss: (reason) => reasons.push(reason) });
    s.dismiss(id);
    s.push('One', { onDismiss: (reason) => reasons.push(reason) });
    s.dismiss();
    expect(reasons).toEqual(['timeout', 'code', 'code']);
  });

  it('tells a live activity why it closed', () => {
    const s = attached();
    const reasons: string[] = [];
    s.live({ label: 'Undo', render: () => {}, duration: 5000, onClose: (reason) => reasons.push(reason) });
    vi.advanceTimersByTime(5000);
    s.live({ label: 'Call', render: () => {}, onClose: (reason) => reasons.push(reason) }).close();
    expect(reasons).toEqual(['timeout', 'code']);
  });

  it('does not count replacing a message by its id as leaving', () => {
    const s = attached();
    const onDismiss = vi.fn();
    s.push('Archived', { id: 'archive', onDismiss });
    s.push('2 archived', { id: 'archive', onDismiss });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe('task handles', () => {
  it('resolves done with what the work returned', async () => {
    const s = attached();
    const handle = s.track(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return { url: '/files/a.png' };
    }, { label: 'a.png' });
    let result: { url: string } | undefined;
    handle.done.then((value) => (result = value));
    await vi.advanceTimersByTimeAsync(50);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(100);
    expect(result).toEqual({ url: '/files/a.png' });
  });

  it('keeps done waiting through a failure, and resolves it after a retry', async () => {
    const s = attached();
    const handle = s.track(work(3, { failAt: 2 }), { label: 'photo.png' });
    const settled = vi.fn();
    handle.done.then(settled, settled);
    await vi.advanceTimersByTimeAsync(250);
    expect(s.tasks()[0].status).toBe('failed');
    expect(settled).not.toHaveBeenCalled();
    handle.retry();
    await vi.advanceTimersByTimeAsync(350);
    expect(s.tasks()[0].status).toBe('done');
    expect(settled).toHaveBeenCalledOnce();
  });

  it('rejects done with an AbortError when the task is canceled', async () => {
    const s = attached();
    const handle = s.track(work(5), { label: 'a' });
    const failed = vi.fn();
    handle.done.catch(failed);
    await vi.advanceTimersByTimeAsync(150);
    handle.cancel();
    await vi.advanceTimersByTimeAsync(0);
    expect(failed).toHaveBeenCalledOnce();
    expect(failed.mock.calls[0][0]).toMatchObject({ name: 'AbortError' });
  });

  it('removes a task whatever state it is in', async () => {
    const s = attached();
    const running = s.track(work(5), { label: 'running' });
    const failing = s.track(work(3, { failAt: 1 }), { label: 'failing' });
    const quick = s.track(work(1), { label: 'quick' });
    const gone = vi.fn();
    failing.done.catch(gone);
    await vi.advanceTimersByTimeAsync(250);
    expect(s.tasks().map((t) => t.status)).toEqual(['running', 'failed', 'done']);
    failing.remove();
    expect(s.tasks().map((t) => t.label)).toEqual(['running', 'quick']);
    running.remove();
    quick.remove();
    expect(s.tasks()).toHaveLength(0);
    expect(s.failed()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(0);
    // The one that failed never finished, so whoever was waiting for it hears that it is gone.
    expect(gone.mock.calls[0][0]).toMatchObject({ name: 'AbortError' });
    await expect(quick.done).resolves.toBeUndefined();
  });
});

describe('subscribing to tasks', () => {
  it('hears about tasks as they start, progress and finish, and nothing after it stops', async () => {
    const s = attached();
    const seen: string[] = [];
    const stop = s.onTasks((tasks) => seen.push(tasks.map((t) => `${t.label} ${t.status} ${Math.round(t.progress * 100)}`).join(', ')));
    s.track(work(2), { label: 'a', total: 2 });
    expect(seen).toEqual(['a running 0']);
    await vi.advanceTimersByTimeAsync(100);
    expect(seen.at(-1)).toBe('a running 50');
    await vi.advanceTimersByTimeAsync(100);
    expect(seen.at(-1)).toBe('a done 100');
    const heard = seen.length;
    stop();
    s.track(work(1), { label: 'b' });
    await vi.advanceTimersByTimeAsync(100);
    expect(seen).toHaveLength(heard);
  });

  it('stays quiet when only a message changed', () => {
    const s = attached();
    const listener = vi.fn();
    s.onTasks(listener);
    s.push('Link copied');
    s.dismiss();
    s.configure({ theme: 'paper' });
    expect(listener).not.toHaveBeenCalled();
  });
});
