import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useTheme } from '../useTheme';
import {
    DEFAULT_BASE_COLOR,
    THEME_STORAGE_KEY,
    THEME_STORAGE_USER_KEY,
} from '../../utils/themeRuntime';

vi.mock('@/features/auth/hooks/useAuth', () => ({
    useAuth: vi.fn(),
}));

describe('useTheme', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        document.documentElement.removeAttribute('style');

        vi.mocked(useAuth).mockReturnValue({
            user: { id: 'user-1' },
        } as ReturnType<typeof useAuth>);
    });

    it('reuses the stored theme only for the active user', () => {
        localStorage.setItem(THEME_STORAGE_KEY, '#84CC16');
        localStorage.setItem(THEME_STORAGE_USER_KEY, 'user-1');

        const { result } = renderHook(() => useTheme(undefined));

        expect(result.current.baseColor).toBe('#84CC16');
    });

    it('ignores a stored theme from another user', () => {
        localStorage.setItem(THEME_STORAGE_KEY, '#84CC16');
        localStorage.setItem(THEME_STORAGE_USER_KEY, 'user-2');

        const { result } = renderHook(() => useTheme(undefined));

        expect(result.current.baseColor).toBe(DEFAULT_BASE_COLOR);
    });

    it('resets to the default color when the resolved profile theme is null', async () => {
        localStorage.setItem(THEME_STORAGE_KEY, '#84CC16');
        localStorage.setItem(THEME_STORAGE_USER_KEY, 'user-1');

        const { result, rerender } = renderHook(
            ({ initialColor }: { initialColor: string | null | undefined }) => useTheme(initialColor),
            {
                initialProps: { initialColor: undefined },
            }
        );

        expect(result.current.baseColor).toBe('#84CC16');

        rerender({ initialColor: null });

        await waitFor(() => {
            expect(result.current.baseColor).toBe(DEFAULT_BASE_COLOR);
        });
    });

    it('persists the active user theme and applies CSS variables', async () => {
        const { result } = renderHook(() => useTheme('#3B82F6'));

        await waitFor(() => {
            expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('#3B82F6');
        });

        expect(result.current.baseColor).toBe('#3B82F6');
        expect(localStorage.getItem(THEME_STORAGE_USER_KEY)).toBe('user-1');
        expect(document.documentElement.style.getPropertyValue('--primary')).not.toBe('');
    });
});
