import { injectStyles } from './inject';
import { createIsland } from './island';
import { shared } from './shared';
import type { BuoyOptions, MountHandle, MountOptions } from './types';

/**
 * Put the island on the page. Without React, call this once at startup.
 * Safe to call on a server: it does nothing there.
 */
export function mount(options: MountOptions = {}): MountHandle {
  const { container, injectStyles: inject = true, nonce, ...config } = options;
  const s = shared();
  const configure = (o: BuoyOptions) => s.store.configure(o);
  s.store.configure(config);
  if (typeof document === 'undefined') return { configure, destroy() {} };
  if (s.island) {
    if (!s.warned && typeof console !== 'undefined') {
      s.warned = true;
      console.warn('[buoy] An island is already mounted. Only one is shown at a time, so this one was skipped.');
    }
    return { configure, destroy() {} };
  }
  if (inject) injectStyles(document, nonce);
  const island = createIsland(s.store, { container });
  s.island = island;
  return {
    configure,
    destroy() {
      if (s.island === island) s.island = null;
      island.destroy();
    },
  };
}
