// Demo links (?example=…&view=…) open a catalog example directly; anything else is ignored.
import { describe, expect, it } from 'vitest';
import { readDeepLink, withoutDeepLink } from './deepLink';

const known = (id: string) => ['two-sum', 'tree-build'].includes(id);

describe('demo links', () => {
  it('opens a catalog example on the requested panel', () => {
    expect(readDeepLink('?example=two-sum&view=visual', known)).toEqual({ problemId: 'two-sum', pane: 'visual' });
    expect(readDeepLink('?view=code', known)).toEqual({ pane: 'code' });
  });

  it('ignores unknown examples, unknown panels and unrelated parameters', () => {
    expect(readDeepLink('?example=not-a-problem&view=sideways', known)).toEqual({});
    expect(readDeepLink('?utm_source=instagram', known)).toEqual({});
    expect(readDeepLink('', known)).toEqual({});
  });

  it('never accepts the custom (pasted) problem slot as an example', () => {
    expect(readDeepLink('?example=custom', known)).toEqual({});
  });

  it('removes only its own parameters once used', () => {
    expect(withoutDeepLink('?example=two-sum&view=visual')).toBe('');
    expect(withoutDeepLink('?utm_source=instagram&example=two-sum')).toBe('?utm_source=instagram');
    expect(withoutDeepLink('')).toBe('');
  });
});
