import '@testing-library/jest-dom';
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error - global assignment for test env
global.ResizeObserver = ResizeObserverMock;

class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// @ts-expect-error - global assignment for test env
global.IntersectionObserver = IntersectionObserverMock;
