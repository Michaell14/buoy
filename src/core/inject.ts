import { css } from './styles';

/** Adds the stylesheet once, at the top of <head> so your own CSS can override it. */
export function injectStyles(doc: Document, nonce?: string): void {
  if (doc.querySelector('style[data-buoy]')) return;
  const style = doc.createElement('style');
  style.setAttribute('data-buoy', '');
  if (nonce) style.nonce = nonce;
  style.textContent = css;
  const head = doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement;
  head.insertBefore(style, head.firstChild);
}
