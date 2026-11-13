// Stands in for the site's `buoy` singleton when website/live.ts is bundled here, so its live
// activities can be started on any one of the page's many islands.
import type { Store } from '../../src/core/store';
import type { LiveOptions, MessageOptions } from '../../src/core/types';

let current: Store | null = null;
/** Runs `fn` with `store` as the island that `buoy.live()` and friends go to. */
export function use<T>(store: Store, fn: () => T): T {
  current = store;
  try {
    return fn();
  } finally {
    current = null;
  }
}
const store = () => {
  if (!current) throw new Error('No island selected: wrap the call in use(store, …)');
  return current;
};
export const buoy = Object.assign((title: string, o?: MessageOptions) => store().push(title, o), {
  live: (o: LiveOptions) => store().live(o),
  success: (title: string, o?: MessageOptions) => store().push(title, { ...o, type: 'success' }),
});
