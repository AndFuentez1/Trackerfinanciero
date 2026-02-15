import { renderHook, act } from '@testing-library/react';
import { useInactivityLogout } from '../useInactivityLogout';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock Auth Context
const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockUser = { id: 'test-user', email: 'test@example.com' };

vi.mock('@/features/auth/context/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        signOut: mockSignOut,
    }),
}));

// Mock Supabase to avoid errors if imported
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            signOut: vi.fn(),
        },
    },
}));

// Helper to flush microtasks
const flushPromises = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

describe('useInactivityLogout', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Set a fixed start time
        vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));

        localStorage.clear();
        mockSignOut.mockClear();
        // Mock window.location.reload
        Object.defineProperty(window, 'location', {
            configurable: true,
            value: { reload: vi.fn() },
        });
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('should set lastActiveTime on mount if missing', () => {
        renderHook(() => useInactivityLogout(5));
        expect(localStorage.getItem('lastActiveTime')).toBeDefined();
    });

    it('should NOT logout if inactive for less than timeout', async () => {
        renderHook(() => useInactivityLogout(5));

        // Fast forward 4 minutes
        await act(async () => {
            vi.advanceTimersByTime(4 * 60 * 1000);
        });

        await flushPromises();

        expect(mockSignOut).not.toHaveBeenCalled();
    });

    it('should logout if inactive for more than timeout', async () => {
        renderHook(() => useInactivityLogout(5));

        // Fast forward 6 minutes
        await act(async () => {
            vi.advanceTimersByTime(6 * 60 * 1000);
        });

        // Check inactivity logic runs async
        await flushPromises();

        expect(mockSignOut).toHaveBeenCalled();
        expect(window.location.reload).toHaveBeenCalled();
        expect(localStorage.getItem('lastActiveTime')).toBeNull();
    });

    it('should logout immediately on mount if lastActiveTime is old', async () => {
        // Set last active time to 10 minutes ago
        const now = Date.now();
        const tenMinutesAgo = now - 10 * 60 * 1000;
        localStorage.setItem('lastActiveTime', tenMinutesAgo.toString());

        renderHook(() => useInactivityLogout(5));

        // Hook effect runs immediately, calls checkInactivity, which awaits signOut
        await flushPromises();

        expect(mockSignOut).toHaveBeenCalled();
    });

    it('should update lastActiveTime on activity', async () => {
        renderHook(() => useInactivityLogout(5));

        const initialTime = localStorage.getItem('lastActiveTime');

        // Advance time by 1 minute (to pass throttle)
        await act(async () => {
            vi.advanceTimersByTime(61 * 1000);
        });

        // Simulate click
        act(() => {
            window.dispatchEvent(new Event('click'));
        });

        const newTime = localStorage.getItem('lastActiveTime');
        expect(newTime).not.toBe(initialTime);
    });
});
