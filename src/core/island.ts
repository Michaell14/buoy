import { esc, frac, metaText, stateText } from './format';
import { iconHTML, ringHTML, setRing, spinnerHTML } from './icons';
import type { Msg, Store, Task } from './store';

type Spr = readonly [stiffness: number, damping: number];
const SPR = {
  enter: [420, 32],
  resize: [320, 30],
  expand: [300, 28],
  tray: [260, 26],
  bubble: [380, 22],
  drag: [420, 34],
} as const satisfies Record<string, Spr>;

const BUBBLE = 44;
const GAP = 8;
const TYPE_ICON: Record<string, string> = { success: 'check', error: 'error', warning: 'warning', info: 'info' };
const TYPE_TONE: Record<string, string> = { success: 'success', error: 'error', warning: 'warn', info: 'info' };
const USER_TONE: Record<string, string> = { accent: 'accent', success: 'success', error: 'error', warning: 'warn', info: 'info' };

const MARKUP =
  '<div class="atoll-sr" role="status" aria-live="polite" aria-atomic="true"></div>' +
  '<div class="atoll-stage" hidden><div class="atoll-drag">' +
  '<div class="atoll-shadow"></div><div class="atoll-bshadow"></div>' +
  '<div class="atoll-goo"><div class="atoll-fill"></div><div class="atoll-bfill"></div></div>' +
  '<div class="atoll-shell"></div>' +
  '<button class="atoll-bubble" type="button" data-act="bubble" tabindex="-1" aria-hidden="true"></button>' +
  '</div></div>';

// Blur plus an alpha threshold: shapes that come close melt into each other while the bubble splits off.
const GOO =
  '<svg data-atoll-goo aria-hidden="true" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden"><defs>' +
  '<filter id="atoll-goo" filterUnits="userSpaceOnUse" x="-700" y="-700" width="1400" height="1400" color-interpolation-filters="sRGB">' +
  '<feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b"/>' +
  '<feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" result="g"/>' +
  '<feComposite in="SourceGraphic" in2="g" operator="atop"/>' +
  '</filter></defs></svg>';

type Kind = 'msg' | 'live' | 'attention' | 'rest' | 'tray';
interface View {
  kind: Kind;
  key: string;
  /** Structure signature. A change rebuilds the layer in place without a cross-fade. */
  sig: string;
  html: string;
  type: string;
  expanded: boolean;
  radius: number | null;
  spring: Spr;
  /** Cheap in-place updates (progress) that don't change the structure. */
  patch?: (el: HTMLElement) => void;
}
interface Spring { x: number; v: number; t: number; k: number; c: number }

export interface IslandOptions {
  container?: HTMLElement | null;
}
export interface Island {
  readonly element: HTMLElement;
  destroy(): void;
}

export function createIsland(store: Store, options: IslandOptions = {}): Island {
  const doc = document;
  const win = window;
  const { cfg, state } = store;

  const motionQuery = typeof win.matchMedia === 'function' ? win.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const reduced = () => !!(motionQuery && motionQuery.matches);
  const clock = () => (win.performance ? win.performance.now() : Date.now());
  const raf: (cb: (time: number) => void) => number =
    typeof win.requestAnimationFrame === 'function' ? (cb) => win.requestAnimationFrame(cb) : (cb) => win.setTimeout(() => cb(clock()), 16);
  const caf: (id: number) => void =
    typeof win.cancelAnimationFrame === 'function' ? (id) => win.cancelAnimationFrame(id) : (id) => win.clearTimeout(id);
  const canAnimate = typeof (doc.documentElement as Partial<HTMLElement>).animate === 'function';
  const play = (el: Element, keyframes: Keyframe[], o: KeyframeAnimationOptions): Animation | null =>
    canAnimate ? el.animate(keyframes, o) : null;

  /* ───── DOM ───── */

  const root = doc.createElement('div');
  root.className = 'atoll';
  root.innerHTML = MARKUP;
  const pick = <T extends Element = HTMLElement>(selector: string) => root.querySelector(selector) as T;
  const sr = pick('.atoll-sr');
  const stage = pick('.atoll-stage');
  const dragEl = pick('.atoll-drag');
  const goo = pick('.atoll-goo');
  const shell = pick('.atoll-shell');
  const bubble = pick<HTMLButtonElement>('.atoll-bubble');
  const shellParts = [pick('.atoll-shadow'), pick('.atoll-fill'), shell];
  const bubbleParts = [pick('.atoll-bshadow'), pick('.atoll-bfill'), bubble];
  const holder = doc.createElement('div');
  holder.innerHTML = GOO;
  const gooSvg = holder.firstElementChild as Element;

  /* ───── Springs: interruptible and retargetable mid-flight ───── */

  const spring = (x: number): Spring => ({ x, v: 0, t: x, k: 320, c: 30 });
  const S = { w: spring(44), h: spring(44), r: spring(22), p: spring(0), dy: spring(0) };
  type Key = keyof typeof S;
  const KEYS = Object.keys(S) as Key[];
  let frameId = 0;
  let last = 0;

  function kick() {
    if (frameId) return;
    last = clock();
    frameId = raf(step);
  }
  function step(time: number) {
    const dt = Math.min(0.05, Math.max(0, (time - last) / 1000));
    last = time;
    const n = Math.max(1, Math.ceil(dt * 240));
    const h = dt / n;
    let moving = false;
    for (const key of KEYS) {
      const s = S[key];
      if (s.x === s.t && s.v === 0) continue;
      for (let i = 0; i < n; i++) {
        const a = -s.k * (s.x - s.t) - s.c * s.v;
        s.v += a * h;
        s.x += s.v * h;
      }
      const eps = key === 'p' ? 0.002 : 0.25;
      if (Math.abs(s.x - s.t) < eps && Math.abs(s.v) < eps * 4) {
        s.x = s.t;
        s.v = 0;
      } else {
        moving = true;
      }
    }
    layout();
    frameId = moving ? raf(step) : 0;
  }
  function to(key: Key, target: number, spr: Spr) {
    const s = S[key];
    if (s.t === target && s.k === spr[0] && s.c === spr[1]) return;
    s.t = target;
    s.k = spr[0];
    s.c = spr[1];
    if (reduced()) {
      s.x = target;
      s.v = 0;
      layout();
      return;
    }
    kick();
  }
  function snap(key: Key, value: number) {
    const s = S[key];
    s.x = s.t = value;
    s.v = 0;
  }

  function layout() {
    const w = Math.max(0, S.w.x);
    const h = Math.max(0, S.h.x);
    const r = Math.min(Math.max(0, S.r.x), Math.min(w, h) / 2);
    const p = S.p.x;
    const left = -w / 2 - ((BUBBLE + GAP) / 2) * Math.min(Math.max(p, 0), 1.25);
    const notch = cfg.theme === 'notch';
    const bottom = cfg.position === 'bottom';
    const radius = notch ? (bottom ? `${r}px ${r}px 0 0` : `0 0 ${r}px ${r}px`) : `${r}px`;
    for (const el of shellParts) {
      const st = el.style;
      st.transform = `translateX(${left.toFixed(2)}px)`;
      st.width = `${w.toFixed(2)}px`;
      st.height = `${h.toFixed(2)}px`;
      st.borderRadius = radius;
    }
    const bl = left + w - BUBBLE + (BUBBLE + GAP) * p;
    const scale = 0.4 + 0.6 * Math.min(Math.max(p, 0), 1.2);
    const opacity = Math.min(Math.max(p * 2.2, 0), 1);
    const bubbleRadius = notch ? (bottom ? '22px 22px 0 0' : '0 0 22px 22px') : '22px';
    for (const el of bubbleParts) {
      const st = el.style;
      st.transform = `translateX(${bl.toFixed(2)}px) scale(${scale.toFixed(3)})`;
      st.opacity = opacity.toFixed(3);
      st.borderRadius = bubbleRadius;
      st.visibility = opacity < 0.01 ? 'hidden' : 'visible';
    }
    dragEl.style.transform = S.dy.x ? `translateY(${S.dy.x.toFixed(2)}px)` : '';
    goo.classList.toggle('is-gooey', (cfg.theme === 'ink' || notch) && p > 0.02 && p < 0.97 && !reduced());
  }

  /* ───── Views: what the one surface should look like right now ───── */

  const ib = (t: Task, act: string, fk: string, label: string, icon: string, reveal = false) =>
    `<button type="button" class="atoll-ib${reveal ? ' atoll-reveal' : ''}" data-act="${act}" data-id="${t.id}" data-fk="${fk}:${t.id}" aria-label="${label} ${esc(t.label)}"><span>${iconHTML(icon)}</span></button>`;
  const hasDetails = (m: Msg) => !!(m.description || (m.actions && m.actions.length));
  let hoverExpand = false;

  function msgView(m: Msg): View {
    const expanded = hasDetails(m) && (m.expanded || m.tapped || (hoverExpand && cfg.expandOnHover));
    const tone = TYPE_TONE[m.type] || USER_TONE[m.tone] || '';
    const icon = m.type === 'loading' ? spinnerHTML : iconHTML(m.icon === undefined ? TYPE_ICON[m.type] : m.icon);
    let html: string;
    if (expanded) {
      const actions = (m.actions || [])
        .map((a, i) => `<button type="button" class="atoll-btn${a.primary ? ' is-primary' : ''}" data-act="action" data-i="${i}" data-fk="a${i}">${esc(a.label)}</button>`)
        .join('');
      html =
        `<div class="atoll-exp"><div class="atoll-exp-head"><span class="atoll-tile" data-tone="${tone}">${icon || iconHTML('info')}</span>` +
        `<div class="atoll-exp-text"><span class="atoll-exp-title">${esc(m.title)}</span>${m.description ? `<span class="atoll-exp-desc">${esc(m.description)}</span>` : ''}</div>` +
        `<button type="button" class="atoll-x" data-act="dismiss" data-fk="x" aria-label="Dismiss">${iconHTML('x')}</button></div>` +
        `${actions ? `<div class="atoll-actions">${actions}</div>` : ''}</div>`;
    } else {
      const waiting = state.queue.length;
      const action = m.action ? `<button type="button" class="atoll-act" data-act="action" data-i="-1" data-fk="a-1"><span>${esc(m.action.label)}</span></button>` : '';
      const badge = !action && waiting ? `<span class="atoll-badge" title="${waiting} waiting">+${waiting}</span>` : '';
      const cls = `atoll-row${icon ? '' : ' no-icon'}${action ? ' end-action' : badge ? ' end-badge' : ''}`;
      html = `<div class="${cls}">${icon ? `<span class="atoll-ic" data-tone="${tone}">${icon}</span>` : ''}<span class="atoll-title">${esc(m.title)}</span>${badge}${action}</div>`;
    }
    return {
      kind: 'msg',
      key: `m:${m.id}:${m.type}:${expanded ? 'x' : 'c'}`,
      sig: html,
      html,
      type: m.type,
      expanded,
      radius: expanded ? 28 : null,
      spring: expanded ? SPR.expand : SPR.resize,
    };
  }

  function liveView(running: Task[]): View {
    const f = store.aggregate();
    const paused = running.every((t) => t.status === 'paused');
    const name = cfg.labels.active(running.map(store.info));
    const label = paused ? `Paused · ${name}` : name;
    const html =
      `<button type="button" class="atoll-row end-ring atoll-live" data-act="open-tray" data-fk="live" aria-label="${esc(label)}. Show details">` +
      `<span class="atoll-ic" data-tone="${paused ? '' : 'accent'}">${iconHTML(paused ? 'pause' : cfg.taskIcon)}</span>` +
      `<span class="atoll-title">${esc(label)}</span><span class="atoll-pct">${Math.round(f * 100)}%</span>${ringHTML(f, paused)}</button>`;
    const patch = (el: HTMLElement) => {
      const pct = el.querySelector('.atoll-pct');
      if (pct) pct.textContent = `${Math.round(f * 100)}%`;
      setRing(el.querySelector('.atoll-ring'), f);
    };
    return { kind: 'live', key: 'live', sig: `live|${label}|${paused}`, html, type: '', expanded: false, radius: null, spring: SPR.resize, patch };
  }

  function attentionView(bad: Task[]): View {
    const n = bad.length;
    const label = `${n} ${cfg.labels.noun}${n === 1 ? '' : 's'} failed`;
    const html =
      `<div class="atoll-row end-action"><span class="atoll-ic" data-tone="error">${iconHTML('error')}</span>` +
      `<button type="button" class="atoll-link atoll-title" data-act="open-tray" data-fk="att">${esc(label)}</button>` +
      `<button type="button" class="atoll-act" data-act="retry-failed" data-fk="att-retry"><span>Retry</span></button></div>`;
    return { kind: 'attention', key: 'attention', sig: html, html, type: 'error', expanded: false, radius: null, spring: SPR.resize };
  }

  function restView(): View {
    const html = state.tasks.length
      ? '<button type="button" class="atoll-rest" data-act="open-tray" data-fk="rest" aria-label="Show activity"></button>'
      : '<div class="atoll-rest"></div>';
    return { kind: 'rest', key: 'rest', sig: html, html, type: '', expanded: false, radius: 15, spring: SPR.resize };
  }

  function rowHTML(t: Task): string {
    const st = t.status;
    const tone = st === 'failed' ? 'error' : st === 'done' ? 'success' : '';
    const tile = `<span class="atoll-tile sm" data-tone="${tone}">${iconHTML(st === 'done' ? 'check' : t.icon) || iconHTML('file')}</span>`;
    const bar = st === 'done' || st === 'queued' ? '' : `<div class="atoll-bar"><i style="width:${(frac(t) * 100).toFixed(1)}%"></i></div>`;
    let buttons = '';
    if (st === 'running') buttons = ib(t, 'cancel', 'c', 'Cancel', 'x', true) + (t.pausable ? ib(t, 'pause', 'p', 'Pause', 'pause') : '');
    else if (st === 'queued') buttons = ib(t, 'cancel', 'c', 'Cancel', 'x');
    else if (st === 'paused') buttons = ib(t, 'cancel', 'c', 'Cancel', 'x', true) + ib(t, 'resume', 'p', 'Resume', 'play');
    else if (st === 'failed') buttons = ib(t, 'remove', 'c', 'Remove', 'x', true) + ib(t, 'retry', 'p', 'Retry', 'retry');
    else if (st === 'done' && t.onOpen) buttons = ib(t, 'open', 'p', 'Open', 'open');
    return (
      `<li class="atoll-task" data-id="${t.id}" data-status="${st}">${tile}<div class="atoll-task-main">` +
      `<div class="atoll-task-top"><span class="atoll-task-name">${esc(t.label)}</span><span class="atoll-task-state${st === 'failed' ? ' is-error' : ''}">${esc(stateText(t))}</span></div>` +
      `${bar}<span class="atoll-task-meta">${esc(metaText(t))}</span></div><div class="atoll-task-actions">${buttons}</div></li>`
    );
  }

  function trayView(): View {
    const { counts, text } = store.summary();
    const running = counts.running + counts.queued + counts.paused;
    const bottom = cfg.position === 'bottom';
    const noun = (n: number) => `${cfg.labels.noun}${n === 1 ? '' : 's'}`;
    const clear = counts.done ? '<button type="button" class="atoll-act" data-act="clear-done" data-fk="clear"><span>Clear done</span></button>' : '';
    const head =
      `<div class="atoll-tray-head"><div class="atoll-tray-titles"><span class="atoll-tray-title">Activity</span><span class="atoll-tray-sub">${esc(text || 'Nothing here yet')}</span></div>` +
      `<div class="atoll-tray-tools">${clear}<button type="button" class="atoll-ib" data-act="close-tray" data-fk="close" aria-label="Close"><span>${iconHTML(bottom ? 'down' : 'up')}</span></button></div></div>`;
    const list = state.tasks.length ? `<ul class="atoll-list">${state.tasks.map(rowHTML).join('')}</ul>` : '<p class="atoll-empty">Tasks you start show up here.</p>';
    let foot = '';
    if (cfg.guard && running) {
      const all = counts.running
        ? '<button type="button" class="atoll-act" data-act="pause-all" data-fk="all"><span>Pause all</span></button>'
        : counts.paused
          ? '<button type="button" class="atoll-act" data-act="resume-all" data-fk="all"><span>Resume all</span></button>'
          : '';
      foot = `<div class="atoll-tray-foot">${iconHTML('info')}<span>Closing this tab stops ${running} ${noun(running)}.</span>${all}</div>`;
    }
    const html = `<div class="atoll-tray" role="dialog" aria-label="Activity">${head}${list}${foot}</div>`;
    const sig = ['tray', bottom, cfg.guard, running, counts.running > 0, counts.paused > 0, counts.done > 0, state.tasks.map((t) => t.id + t.status).join(',')].join('|');
    const patch = (el: HTMLElement) => {
      for (const t of state.tasks) {
        const row = el.querySelector(`.atoll-task[data-id="${t.id}"]`);
        if (!row) continue;
        const label = row.querySelector('.atoll-task-state');
        if (label) label.textContent = stateText(t);
        const fill = row.querySelector<HTMLElement>('.atoll-bar > i');
        if (fill) fill.style.width = `${(frac(t) * 100).toFixed(1)}%`;
        const meta = row.querySelector('.atoll-task-meta');
        if (meta) meta.textContent = metaText(t);
      }
      const sub = el.querySelector('.atoll-tray-sub');
      if (sub) sub.textContent = text || 'Nothing here yet';
    };
    return { kind: 'tray', key: 'tray', sig, html, type: '', expanded: false, radius: 30, spring: SPR.tray, patch };
  }

  /* ───── Rendering ───── */

  let view: View | null = null;
  let layer: HTMLElement | null = null;
  let visible = false;
  let exitAnim: Animation | null = null;
  let renderId = 0;
  let bubbleMode = '';
  let lastMessageId: string | null = null;

  function render() {
    if (!renderId) renderId = raf(() => {
      renderId = 0;
      draw();
    });
  }

  function draw() {
    const running = store.active();
    const bad = store.failed();
    const attention = bad.length > 0 && !state.attentionDismissed;
    const currentId = state.current ? state.current.id : null;
    if (currentId !== lastMessageId) {
      hoverExpand = false;
      lastMessageId = currentId;
    }
    let next: View;
    let withBubble = false;
    if (state.trayOpen) next = trayView();
    else if (state.current) {
      next = msgView(state.current);
      withBubble = running.length > 0 || attention;
    } else if (running.length) next = liveView(running);
    else if (attention) next = attentionView(bad);
    else next = restView();

    root.dataset.kind = next.kind;
    root.dataset.type = next.type;
    if (next.kind === 'rest' && cfg.resting === 'hidden') {
      setBubble(false, running);
      hide();
      return;
    }
    const entering = !visible;
    if (entering) show();
    if (!view || !layer || view.key !== next.key) swap(next);
    else if (view.sig !== next.sig) rebuild(next);
    if (next.patch && layer) next.patch(layer);
    view = next;
    const el = layer as HTMLElement;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const spr = entering ? SPR.enter : next.spring;
    to('w', w, spr);
    to('h', h, spr);
    to('r', next.radius == null ? h / 2 : next.radius, spr);
    setBubble(withBubble, running);
    shell.style.cursor = next.kind === 'msg' && !next.expanded && state.current && state.current.type !== 'loading' ? 'pointer' : '';
  }

  function swap(next: View) {
    const old = layer;
    const el = doc.createElement('div');
    el.className = 'atoll-layer';
    el.innerHTML = next.html;
    shell.appendChild(el);
    layer = el;
    const calm = reduced();
    if (old) {
      old.inert = true;
      old.setAttribute('aria-hidden', 'true');
      const out = play(
        old,
        calm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }, { opacity: 0, filter: 'blur(2px)', transform: 'scale(.96)' }],
        { duration: calm ? 80 : 120, easing: 'ease-in', fill: 'forwards' },
      );
      if (out) out.onfinish = () => old.remove();
      else old.remove();
    }
    play(
      el,
      calm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, filter: 'blur(2px)', transform: 'scale(.96)' }, { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }],
      { duration: calm ? 120 : 200, delay: old ? 60 : 40, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' },
    );
  }

  function rebuild(next: View) {
    if (!layer) return;
    const active = doc.activeElement;
    const focusKey = active && layer.contains(active) ? active.getAttribute('data-fk') : null;
    const list = layer.querySelector('.atoll-list');
    const scroll = list ? list.scrollTop : 0;
    layer.innerHTML = next.html;
    const newList = layer.querySelector('.atoll-list');
    if (newList && scroll) newList.scrollTop = scroll;
    if (focusKey) {
      const target = Array.from(layer.querySelectorAll<HTMLElement>('[data-fk]')).find((n) => n.getAttribute('data-fk') === focusKey);
      if (target) target.focus({ preventScroll: true });
    }
  }

  function show() {
    visible = true;
    if (exitAnim) {
      exitAnim.cancel();
      exitAnim = null;
    }
    stage.hidden = false;
    if (reduced()) {
      play(stage, [{ opacity: 0 }, { opacity: 1 }], { duration: 150 });
      return;
    }
    const notch = cfg.theme === 'notch';
    const bottom = cfg.position === 'bottom';
    play(
      stage,
      notch ? [{ transform: `translateY(${bottom ? 60 : -60}px)` }, { transform: 'translateY(0px)' }] : [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: notch ? 380 : 340, easing: 'cubic-bezier(.2,.9,.25,1.12)' },
    );
  }

  function resetGeometry() {
    snap('w', 44);
    snap('h', 44);
    snap('r', 22);
    snap('p', 0);
    layout();
  }

  function hide() {
    if (!visible) return;
    visible = false;
    unhover();
    const old = layer;
    layer = null;
    view = null;
    if (old) {
      old.inert = true;
      old.setAttribute('aria-hidden', 'true');
      const out = play(old, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });
      if (out) out.onfinish = () => old.remove();
      else old.remove();
    }
    const notch = cfg.theme === 'notch';
    const bottom = cfg.position === 'bottom';
    const keyframes: Keyframe[] = reduced()
      ? [{ opacity: 1 }, { opacity: 0 }]
      : notch
        ? [{ transform: 'translateY(0px)' }, { transform: `translateY(${((bottom ? 1 : -1) * (S.h.x + 24)).toFixed(1)}px)` }]
        : [{ opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' }, { opacity: 0, transform: 'scale(.92)', filter: 'blur(4px)' }];
    const anim = play(stage, keyframes, { duration: notch ? 220 : 180, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
    const finish = () => {
      if (visible) return;
      stage.hidden = true;
      if (anim) anim.cancel();
      exitAnim = null;
      resetGeometry();
    };
    if (anim) {
      exitAnim = anim;
      anim.onfinish = () => {
        if (exitAnim === anim) finish();
      };
    } else {
      finish();
    }
  }

  function setBubble(on: boolean, running: Task[]) {
    if (on) {
      if (running.length) {
        const f = store.aggregate();
        const paused = running.every((t) => t.status === 'paused');
        const mode = `ring|${paused}`;
        if (bubbleMode !== mode) {
          bubble.innerHTML = ringHTML(f, paused);
          bubbleMode = mode;
        } else {
          setRing(bubble.querySelector('.atoll-ring'), f);
        }
        bubble.setAttribute('aria-label', `${cfg.labels.active(running.map(store.info))}. Show details`);
      } else if (bubbleMode !== 'attention') {
        bubble.innerHTML = `<span class="atoll-bub-ic">${iconHTML('error')}</span>`;
        bubbleMode = 'attention';
        bubble.setAttribute('aria-label', `A ${cfg.labels.noun} needs attention. Show details`);
      }
      bubble.tabIndex = 0;
      bubble.removeAttribute('aria-hidden');
    } else {
      bubble.tabIndex = -1;
      bubble.setAttribute('aria-hidden', 'true');
    }
    to('p', on ? 1 : 0, SPR.bubble);
  }

  function announce(m: Msg) {
    const text = [m.title, m.description].filter(Boolean).join('. ');
    sr.textContent = '';
    win.setTimeout(() => {
      sr.textContent = text;
    }, 40);
  }

  let lastPosition = cfg.position;
  function applyConfig() {
    root.dataset.atollTheme = cfg.theme;
    root.dataset.position = cfg.position;
    root.dataset.rich = cfg.richColors ? 'true' : 'false';
    root.dataset.scheme = cfg.colorScheme;
    if (cfg.offset != null) root.style.setProperty('--atoll-offset', `${cfg.offset}px`);
    else root.style.removeProperty('--atoll-offset');
    layout();
    if (lastPosition !== cfg.position && visible && !reduced()) play(stage, [{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
    lastPosition = cfg.position;
  }

  /* ───── Input ───── */

  const cleanups: Array<() => void> = [];
  function on<K extends keyof WindowEventMap>(target: Window, type: K, fn: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions): void;
  function on<K extends keyof DocumentEventMap>(target: Document, type: K, fn: (e: DocumentEventMap[K]) => void, o?: AddEventListenerOptions): void;
  function on<K extends keyof HTMLElementEventMap>(target: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void, o?: AddEventListenerOptions): void;
  function on(target: EventTarget, type: string, fn: (e: never) => void, o?: AddEventListenerOptions) {
    const listener = fn as unknown as EventListener;
    target.addEventListener(type, listener, o);
    cleanups.push(() => target.removeEventListener(type, listener, o));
  }

  let lastFocus: Element | null = null;
  function openTray(keyboard: boolean) {
    if (state.trayOpen) return;
    lastFocus = doc.activeElement;
    hoverExpand = false;
    store.openTray();
    if (keyboard) raf(() => raf(() => {
      const close = layer && layer.querySelector<HTMLElement>('[data-fk="close"]');
      if (close) close.focus({ preventScroll: true });
    }));
  }
  function closeTray() {
    if (!state.trayOpen) return;
    const inside = root.contains(doc.activeElement);
    store.closeTray();
    if (inside) raf(() => raf(() => {
      const target = layer && layer.querySelector<HTMLElement>('[data-fk="live"], [data-fk="att"], [data-fk="rest"]');
      const back = target || (lastFocus instanceof HTMLElement && lastFocus.isConnected ? lastFocus : null);
      if (back) back.focus({ preventScroll: true });
    }));
  }
  function swipeAway() {
    if (state.trayOpen) closeTray();
    else if (state.current) store.dismiss(state.current.id);
    else if (view && view.kind === 'attention') store.dismissAttention();
  }

  function act(el: Element, e: MouseEvent) {
    const keyboard = e.detail === 0;
    const id = el.getAttribute('data-id') || '';
    const m = state.current;
    switch (el.getAttribute('data-act')) {
      case 'dismiss':
        if (m) store.dismiss(m.id);
        break;
      case 'action': {
        if (!m) break;
        const i = Number(el.getAttribute('data-i'));
        const action = i < 0 ? m.action : m.actions && m.actions[i];
        store.dismiss(m.id);
        if (action && action.onClick) action.onClick();
        break;
      }
      case 'open-tray':
      case 'bubble':
        openTray(keyboard);
        break;
      case 'close-tray':
        closeTray();
        break;
      case 'retry-failed':
        store.retryFailed();
        break;
      case 'pause':
        store.pauseTask(id);
        break;
      case 'resume':
        store.resumeTask(id);
        break;
      case 'cancel':
        store.cancelTask(id);
        break;
      case 'retry':
        store.retryTask(id);
        break;
      case 'remove':
        store.removeTask(id);
        break;
      case 'open': {
        const t = state.tasks.find((x) => x.id === id);
        closeTray();
        if (t && t.onOpen) t.onOpen(store.info(t));
        break;
      }
      case 'clear-done':
        store.clearDone();
        break;
      case 'pause-all':
        store.pauseAll();
        break;
      case 'resume-all':
        store.resumeAll();
        break;
      default:
        break;
    }
  }

  let suppressClick = false;
  on(root, 'click', (e) => {
    if (suppressClick) {
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const target = e.target as Element;
    const button = target.closest('[data-act]');
    if (button && root.contains(button)) {
      act(button, e);
      return;
    }
    if (!view || view.kind !== 'msg' || view.expanded || !shell.contains(target)) return;
    const m = state.current;
    if (!m) return;
    if (hasDetails(m)) store.tap(m.id);
    else if (m.type !== 'loading') store.dismiss(m.id);
  });

  // Hovering pauses timers and, after a short intent delay, opens a message's details.
  let hovering = false;
  let hoverTimer = 0;
  let leaveTimer = 0;
  function unhover() {
    if (!hovering) return;
    hovering = false;
    store.setPaused('hover', false);
    win.clearTimeout(hoverTimer);
    if (hoverExpand) {
      win.clearTimeout(leaveTimer);
      leaveTimer = win.setTimeout(() => {
        if (hovering) return;
        hoverExpand = false;
        render();
      }, 300);
    }
  }
  on(stage, 'pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    hovering = true;
    store.setPaused('hover', true);
    win.clearTimeout(leaveTimer);
    const m = state.current;
    if (m && cfg.expandOnHover && hasDetails(m) && !m.expanded && !hoverExpand) {
      win.clearTimeout(hoverTimer);
      hoverTimer = win.setTimeout(() => {
        if (hovering && state.current === m) {
          hoverExpand = true;
          render();
        }
      }, 120);
    }
  });
  on(stage, 'pointerleave', (e) => {
    if (e.pointerType === 'mouse') unhover();
  });

  let drag: { id: number; y: number; t: number; dy: number; active: boolean } | null = null;
  on(shell, 'pointerdown', (e) => {
    if (e.button !== 0 || (e.target as Element).closest('.atoll-list')) return;
    drag = { id: e.pointerId, y: e.clientY, t: clock(), dy: 0, active: false };
  });
  on(win, 'pointermove', (e) => {
    // Safety net: if the island shrank or vanished under a still pointer, leave events can be skipped.
    if (hovering && e.pointerType === 'mouse' && !stage.contains(e.target as Node)) unhover();
    if (!drag || e.pointerId !== drag.id) return;
    const raw = e.clientY - drag.y;
    const dir = cfg.position === 'bottom' ? 1 : -1;
    if (!drag.active && Math.abs(raw) > 6) {
      drag.active = true;
      try { shell.setPointerCapture(e.pointerId); } catch { /* optional */ }
    }
    if (!drag.active) return;
    const toward = raw * dir;
    drag.dy = (toward > 0 ? toward : toward * 0.2) * dir;
    snap('dy', drag.dy);
    layout();
  });
  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.active) return;
    suppressClick = true;
    win.setTimeout(() => {
      suppressClick = false;
    }, 0);
    const dir = cfg.position === 'bottom' ? 1 : -1;
    const distance = d.dy * dir;
    const velocity = distance / Math.max(1, clock() - d.t);
    if (distance > 28 || velocity > 0.45) swipeAway();
    to('dy', 0, SPR.drag);
  };
  on(win, 'pointerup', endDrag);
  on(win, 'pointercancel', endDrag);
  on(doc, 'keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (state.trayOpen) {
      e.preventDefault();
      closeTray();
    } else if (root.contains(doc.activeElement) || hovering) {
      swipeAway();
    }
  });
  on(doc, 'pointerdown', (e) => {
    if (state.trayOpen && !root.contains(e.target as Node)) closeTray();
  }, { capture: true });
  on(doc, 'visibilitychange', () => store.setPaused('hidden', doc.hidden));
  on(win, 'beforeunload', (e) => {
    if (cfg.guard && store.active().length) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  if (motionQuery && typeof motionQuery.addEventListener === 'function') {
    const onMotion = () => layout();
    motionQuery.addEventListener('change', onMotion);
    cleanups.push(() => motionQuery.removeEventListener('change', onMotion));
  }

  /* ───── Lifecycle ───── */

  const unsubscribe = store.subscribe((event, message) => {
    if (event === 'show' && message) announce(message);
    if (event === 'config') applyConfig();
    render();
  });

  (options.container || doc.body).appendChild(root);
  doc.body.appendChild(gooSvg);
  applyConfig();
  store.setPaused('hidden', doc.hidden);
  store.setPaused('detached', false);
  if (state.current) announce(state.current);
  render();

  let destroyed = false;
  return {
    element: root,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribe();
      cleanups.forEach((fn) => fn());
      if (frameId) caf(frameId);
      if (renderId) caf(renderId);
      win.clearTimeout(hoverTimer);
      win.clearTimeout(leaveTimer);
      store.setPaused('hover', false);
      store.setPaused('hidden', false);
      store.setPaused('detached', true);
      root.remove();
      gooSvg.remove();
    },
  };
}
