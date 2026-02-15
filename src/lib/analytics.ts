import type { Dict} from './mixpanel-shim';
import mixpanel, { Query } from './mixpanel-shim';

// Constants
const MIXPANEL_TOKEN = 'ed2dc14829d7b4d24069695b97131c0d';
const IS_PROD = import.meta.env.PROD;

// Initialize Mixpanel
export const initAnalytics = () => {
    mixpanel.init(MIXPANEL_TOKEN, {
        debug: !IS_PROD, // Enable debug mode in development
        track_pageview: true,
        persistence: 'localStorage',
        ignore_dnt: true,
    });
};

// --- Type Definitions for Events ---
export type EventName =
    | 'view_feature'
    | 'onboarding_step_completed'
    | 'transaction_created'
    | 'budget_created'
    | 'budget_burn_check'
    | 'alert_clicked'
    | 'session_start'
    | 'login'
    | 'logout'
    | 'payment_method_added'
    | 'excel_import_completed';

interface TrackingProps extends Dict {
    feature_name?: string;
    step_name?: string;
    duration_seconds?: number;
    source_type?: 'manual' | 'excel_import' | 'recurring';
    amount?: number;
    category?: string;
    installments_count?: number;
    result?: 'success' | 'failure';
    [key: string]: any;
}

// --- Core Analytics Functions ---

/**
 * Track a specific event with properties
 */
export const trackEvent = (eventName: EventName, props?: TrackingProps) => {
    if (!MIXPANEL_TOKEN) {return;}

    try {
        mixpanel.track(eventName, props);
    } catch (error) {
        console.error('Mixpanel Error:', error);
    }
};

/**
 * Identify a user (call on login)
 */
export const identifyUser = (userId: string, traits?: Dict) => {
    if (!MIXPANEL_TOKEN) {return;}

    mixpanel.identify(userId);
    if (traits) {
        mixpanel.people.set(traits);
    }
};

/**
 * Set global user properties (people profile)
 */
export const setUserProperties = (props: Dict) => {
    if (!MIXPANEL_TOKEN) {return;}
    mixpanel.people.set(props);
};

/**
 * Start a timer for an event (e.g., Time-to-Transaction)
 */
export const startEventTimer = (eventName: EventName) => {
    if (!MIXPANEL_TOKEN) {return;}
    mixpanel.time_event(eventName);
};

/**
 * Reset analytics on logout
 */
export const resetAnalytics = () => {
    if (!MIXPANEL_TOKEN) {return;}
    mixpanel.reset();
};

// --- Specific Insight Helpers ---

/**
 * Track user financial health based on Net Flow
 */
export const updateFinancialHealthProfile = (income: number, expenses: number) => {
    const netFlow = income - expenses;
    const healthStatus = netFlow >= 0 ? 'Resilient' : 'Vulnerable'; // "Positive" vs "Negative" logic

    setUserProperties({
        'Net Flow Status': netFlow >= 0 ? 'Positive' : 'Negative',
        'Financial Health Segment': healthStatus,
        'Last Calculated Net Flow': netFlow
    });
};

/**
 * Track sticky feature usage
 */
export const trackFeatureView = (featureName: string) => {
    trackEvent('view_feature', { feature_name: featureName });
};
