import { useFinanceData } from '@/hooks/useFinanceData';

export function useSettingsProfile() {
    const {
        currency,
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
