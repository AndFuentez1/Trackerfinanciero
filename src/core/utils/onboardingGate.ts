type OnboardingDecision = 'pending' | 'from_scratch' | 'imported' | null;

type OnboardingGateInput = {
  currency?: string | null;
  paymentMethods?: { length: number };
  categories?: { length: number };
  onboardingDecision?: OnboardingDecision;
  welcomeCompleted?: boolean;
};

export const getOnboardingGateState = ({
  currency,
  paymentMethods,
  categories,
  onboardingDecision,
  welcomeCompleted,
}: OnboardingGateInput) => {
  const paymentCount = paymentMethods?.length ?? 0;
  const categoryCount = categories?.length ?? 0;
  const isEmptyState = !currency || paymentCount === 0 || categoryCount === 0;
  const showWelcomePanel = !welcomeCompleted && isEmptyState;
  const showDecisionPanel = !isEmptyState && (!onboardingDecision || onboardingDecision === 'pending');
  const isOnboardingLocked = showWelcomePanel || showDecisionPanel;

  return {
    isEmptyState,
    showWelcomePanel,
    showDecisionPanel,
    isOnboardingLocked,
  };
};

export const isOnboardingAllowedRoute = (path: string) =>
  path === "/" || path.startsWith("/configuracion");
