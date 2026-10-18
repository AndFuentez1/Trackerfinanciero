import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useStableCallbacks } from './useStableCallbacks';

describe('useStableCallbacks', () => {
  it('keeps function identity stable across renders', () => {
    const { result, rerender } = renderHook(({ n }) => useStableCallbacks({ get: () => n }), {
      initialProps: { n: 1 },
    });
    const first = result.current.get;
    rerender({ n: 2 });
    expect(result.current.get).toBe(first);
  });

  it('always calls the latest implementation', () => {
    const { result, rerender } = renderHook(
      ({ n }) => useStableCallbacks({ add: (x: number) => x + n }),
      { initialProps: { n: 1 } }
    );
    expect(result.current.add(1)).toBe(2);
    rerender({ n: 10 });
    expect(result.current.add(1)).toBe(11);
  });
});
