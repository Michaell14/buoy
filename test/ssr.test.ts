// @vitest-environment node
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Atoll, atoll } from '../src/index';
import { mount } from '../src/vanilla';

describe('on the server', () => {
  it('renders nothing and never touches the DOM', () => {
    expect(typeof document).toBe('undefined');
    expect(renderToString(createElement(Atoll, { theme: 'ink' }))).toBe('');
    expect(() => atoll('Queued while rendering on the server')).not.toThrow();
    expect(() => mount().destroy()).not.toThrow();
  });
});
