import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProfileManagement } from '../useProfileManagement';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useToast } from '@/shared/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const queryClientMock = {
  cancelQueries: vi.fn().mockResolvedValue(undefined),
  getQueryData: vi.fn(),
  setQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
};

const toastMock = vi.fn();

vi.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/shared/hooks/use-toast', () => ({
  useToast: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('useProfileManagement', () => {
  const profile = {
    currency: 'COP',
    onboarding_decision: 'from_scratch',
    has_pending_import: false,
    welcome_completed: true,
    decimal_places: 0,
    base_color: '#84CC16',
    country: 'CO',
    data_treatment_accepted: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
    } as ReturnType<typeof useAuth>);

    vi.mocked(useToast).mockReturnValue({
      toast: toastMock,
    } as ReturnType<typeof useToast>);

    vi.mocked(useQueryClient).mockReturnValue(queryClientMock as ReturnType<typeof useQueryClient>);

    const selectMock = vi.fn().mockResolvedValue({
      data: [{ id: 'user-1', base_color: '#F472B6' }],
      error: null,
    });
    const eqMock = vi.fn().mockReturnValue({ select: selectMock });
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ update: updateMock } as never);

    queryClientMock.getQueryData.mockReturnValue(profile);
  });

  it('applies base_color updates optimistically before the mutation settles', async () => {
    const { result } = renderHook(() => useProfileManagement(profile));

    let mutationPromise: Promise<unknown> | null = null;

    await act(async () => {
      mutationPromise = result.current.updateProfile({ base_color: '#F472B6' });
    });

    await waitFor(() => {
      expect(result.current.profileData?.base_color).toBe('#F472B6');
    });

    expect(queryClientMock.setQueryData).toHaveBeenCalled();
    const updater = queryClientMock.setQueryData.mock.calls[0][1] as (prev: typeof profile | null) => typeof profile | null;
    expect(updater(profile)?.base_color).toBe('#F472B6');

    await act(async () => {
      await mutationPromise;
    });

    expect(vi.mocked(supabase.from)).toHaveBeenCalledWith('profiles');
    expect(queryClientMock.invalidateQueries).toHaveBeenCalled();
  });
});
