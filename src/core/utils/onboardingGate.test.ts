import { describe, it, expect } from 'vitest';
import { getOnboardingGateState, isOnboardingAllowedRoute } from '@/core/utils/onboardingGate';

describe('onboardingGate', () => {
    it('locks when empty state and welcome not completed', () => {
        const state = getOnboardingGateState({
            currency: null,
            paymentMethods: { length: 0 } as any,
            categories: { length: 0 } as any,
            onboardingDecision: null,
            welcomeCompleted: false,
        });

        expect(state.isEmptyState).toBe(true);
        expect(state.showWelcomePanel).toBe(true);
        expect(state.isOnboardingLocked).toBe(true);
    });

    it('shows decision panel when data exists but decision pending', () => {
        const state = getOnboardingGateState({
            currency: 'COP',
            paymentMethods: { length: 1 } as any,
            categories: { length: 1 } as any,
            onboardingDecision: 'pending',
            welcomeCompleted: true,
        });

        expect(state.isEmptyState).toBe(false);
        expect(state.showDecisionPanel).toBe(true);
        expect(state.isOnboardingLocked).toBe(true);
    });

    it('unlocks when onboarding is complete', () => {
        const state = getOnboardingGateState({
            currency: 'COP',
            paymentMethods: { length: 1 } as any,
            categories: { length: 1 } as any,
            onboardingDecision: 'from_scratch',
            welcomeCompleted: true,
        });

        expect(state.isOnboardingLocked).toBe(false);
    });

    it('allows only dashboard and settings routes during onboarding', () => {
        expect(isOnboardingAllowedRoute('/')).toBe(true);
        expect(isOnboardingAllowedRoute('/configuracion')).toBe(true);
        expect(isOnboardingAllowedRoute('/presupuestos')).toBe(false);
        expect(isOnboardingAllowedRoute('/loans')).toBe(false);
    });
});
