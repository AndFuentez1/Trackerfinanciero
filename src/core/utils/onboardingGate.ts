type OnboardingDecision = 'pending' | 'from_scratch' | 'imported' | null;

type OnboardingGateInput = {
  currency?: string | null;
  paymentMethods?: { length: number };
  categories?: { length: number };
  onboardingDecision?: OnboardingDecision;
  welcomeCompleted?: boolean;
  isLoading?: boolean;
};

export const getOnboardingGateState = ({
  currency,
  paymentMethods,
  categories,
  onboardingDecision,
  welcomeCompleted,
  isLoading = false,
}: OnboardingGateInput) => {
  if (isLoading) {
    return {
      isEmptyState: false,
      showWelcomePanel: false,
      showDecisionPanel: false,
      isOnboardingLocked: false,
    };
  }

  const paymentCount = paymentMethods?.length ?? 0;
  const categoryCount = categories?.length ?? 0;

  // isEmptyState: truly empty if no currency and no basic setup
  const isEmptyState = !currency || paymentCount === 0 || categoryCount === 0;

  // showWelcomePanel: Only if they haven't made any decision AND it's physically empty
  const showWelcomePanel = !welcomeCompleted && !onboardingDecision && isEmptyState;

  // showDecisionPanel: If they have currency but haven't chosen 'how' to start (scratch vs import)
  const showDecisionPanel = !showWelcomePanel && isEmptyState && (!onboardingDecision || onboardingDecision === 'pending');

  const isOnboardingLocked = showWelcomePanel || showDecisionPanel;

  return {
    isEmptyState,
    showWelcomePanel,
    showDecisionPanel,
    isOnboardingLocked,
  };
};

export const isOnboardingAllowedRoute = (path: string) =>
  path === "/dashboard" || path === "/settings" || path.startsWith("/dashboard") || path.startsWith("/settings") || path.startsWith("/history") || path.startsWith("/budgets") || path.startsWith("/cashflow") || path.startsWith("/savings") || path.startsWith("/loans");
