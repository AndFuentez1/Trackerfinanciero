import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }),
});

// Mock ResizeObserver
class ResizeObserverMock {
    observe() { }
    unobserve() { }
    disconnect() { }
}
global.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];

    constructor() { }

    observe() { }
    unobserve() { }
    disconnect() { }
    takeRecords(): IntersectionObserverEntry[] { return []; }
}
global.IntersectionObserver = IntersectionObserverMock;

// Mock PointerEvents (often needed for Radix UI)
if (!global.PointerEvent) {
    class PointerEvent extends MouseEvent {
        public height: number;
        public isPrimary: boolean;
        public pointerId: number;
        public pointerType: string;
        public pressure: number;
        public tangentialPressure: number;
        public tiltX: number;
        public tiltY: number;
        public twist: number;
        public width: number;

        constructor(type: string, params: PointerEventInit = {}) {
            super(type, params);
            this.pointerId = params.pointerId || 0;
            this.width = params.width || 0;
            this.height = params.height || 0;
            this.pressure = params.pressure || 0;
            this.tangentialPressure = params.tangentialPressure || 0;
            this.tiltX = params.tiltX || 0;
            this.tiltY = params.tiltY || 0;
            this.twist = params.twist || 0;
            this.pointerType = params.pointerType || 'mouse';
            this.isPrimary = params.isPrimary || false;
        }
    }
    // @ts-expect-error - Implementing minimal polyfill
    global.PointerEvent = PointerEvent;
}
