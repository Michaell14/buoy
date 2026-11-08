import { createStore, type Store } from './store';
import type { Island } from './island';

interface Shared {
  store: Store;
  island: Island | null;
  warned: boolean;
}

// One store per page, even if two copies of the package end up bundled (ESM + CJS, or two versions).
const KEY = Symbol.for('atoll-ui');

export function shared(): Shared {
  const g = globalThis as unknown as Record<symbol, Shared | undefined>;
  let s = g[KEY];
  if (!s) {
    s = { store: createStore(), island: null, warned: false };
    g[KEY] = s;
  }
  return s;
}
