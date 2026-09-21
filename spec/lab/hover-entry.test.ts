import { expect, it } from 'vitest';
import { createHoverEntry } from '../../src/lab/walk/hover-entry';

it('opens the hovered week only after two uninterrupted seconds', () => {
  const entry = createHoverEntry();
  expect(entry.update(3, true, 100).remaining).toBe(2000);
  expect(entry.update(3, true, 2099).open).toBeUndefined();
  expect(entry.update(3, true, 2100).open).toBe(3);
  expect(entry.update(3, true, 5000).open).toBeUndefined();
});

it('cancels on movement, leaving, changing weeks, or losing focus', () => {
  const entry = createHoverEntry();
  entry.update(3, true, 0);
  entry.update(3, false, 1900);
  expect(entry.update(3, true, 2200).remaining).toBe(2000);
  entry.update(undefined, true, 4000);
  expect(entry.update(3, true, 4500).remaining).toBe(2000);
  expect(entry.update(4, true, 6000).remaining).toBe(2000);
  entry.cancel();
  expect(entry.update(4, true, 10000).remaining).toBe(2000);
});

it('does not reopen a dismissed week until leaving and returning', () => {
  const entry = createHoverEntry();
  entry.dismiss(3);
  entry.update(3, false, 0);
  expect(entry.update(3, true, 5000)).toEqual({ remaining: 0 });
  entry.cancel();
  expect(entry.update(3, true, 6000).open).toBeUndefined();
  entry.update(undefined, false, 6100);
  entry.update(3, true, 7000);
  expect(entry.update(3, true, 9000).open).toBe(3);
  entry.reset();
  expect(entry.update(3, true, 10000).remaining).toBe(2000);
});
