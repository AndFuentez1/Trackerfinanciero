import { useFinanceData } from '@/features/finance/hooks/useFinanceData';

export function useSettingsProfile() {
    const {
        currency,
        country,
        decimalPlaces,
        baseColor,
        updateProfile,
        setAppThemePreference,
        themeOptions,
        resetProfileData,
        resetOperationalData,
        loading
    } = useFinanceData();

    return {
        currency,
        country,
        decimalPlaces,
        baseColor,
        updateProfile,
        setAppThemePreference,
        themeOptions,
        resetProfileData,
        resetOperationalData,
        loading
    };
}

