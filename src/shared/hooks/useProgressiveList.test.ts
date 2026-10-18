import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useProgressiveList } from './useProgressiveList';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('useProgressiveList', () => {
  it('returns all items when list is shorter than pageSize', () => {
    const { result } = renderHook(() => useProgressiveList(range(10), { pageSize: 50 }));
    expect(result.current.visibleItems).toHaveLength(10);
    expect(result.current.hasMore).toBe(false);
  });

  it('limits long lists and grows on showMore', () => {
    const items = range(250);
    const { result } = renderHook(() => useProgressiveList(items, { pageSize: 100 }));
    expect(result.current.visibleItems).toHaveLength(100);
    expect(result.current.remaining).toBe(150);

    act(() => result.current.showMore());
    expect(result.current.visibleItems).toHaveLength(200);

    act(() => result.current.showMore());
    expect(result.current.visibleItems).toHaveLength(250);
    expect(result.current.hasMore).toBe(false);
  });
});
