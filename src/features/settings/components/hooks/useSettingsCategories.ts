import { useFinanceData } from '@/features/finance/hooks/useFinanceData';
import { useCallback } from 'react';

export function useSettingsCategories() {
    const {
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        categoriesLoading
    } = useFinanceData();

    const getCategoriesByType = useCallback((type: string) => {
        return categories.filter(c => c.type === type);
    }, [categories]);

    return {
        categories,
        getCategoriesByType,
        addCategory,
        updateCategory,
        deleteCategory,
        loading: categoriesLoading
    };
}

