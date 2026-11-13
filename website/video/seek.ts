// The page's timers and animation frames run on a clock the recorder steps one frame at a time.
// CSS animations, transitions and element.animate() run on the browser's own clock, so each is
// paused when first seen and moved by hand to where the stepped clock says it should be.
const started = new WeakMap<Animation, number>();
const done = new WeakSet<Animation>();

export function seekAnimations() {
  const now = performance.now();
  for (const animation of document.getAnimations()) {
    if (done.has(animation)) continue;
    let start = started.get(animation);
    if (start === undefined) {
      start = now;
      started.set(animation, start);
      animation.pause();
    }
    const timing = animation.effect?.getComputedTiming();
    const end = timing ? Number(timing.endTime) : Infinity;
    const at = now - start;
    if (Number.isFinite(end) && at >= end) {
      done.add(animation);
      animation.finish();
    } else {
      animation.currentTime = at;
    }
  }
}
