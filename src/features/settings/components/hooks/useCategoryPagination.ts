import { useState, useMemo } from 'react';
import type { CategoryItem } from '@/features/finance/hooks/useFinanceData';

export type AlphabetTab = 'all' | 'first' | 'second';

export function useCategoryPagination(categories: CategoryItem[]) {
    const [alphabetTab, setAlphabetTab] = useState<AlphabetTab>('all');

    const { firstHalf, secondHalf } = useMemo(() => {
        const midpoint = Math.ceil(categories.length / 2);
        return {
            firstHalf: categories.slice(0, midpoint),
            secondHalf: categories.slice(midpoint)
        };
    }, [categories]);

    const filteredCategories = useMemo(() => {
        if (alphabetTab === 'all') {return categories;}
        if (alphabetTab === 'first') {return firstHalf;}
        return secondHalf;
    }, [categories, alphabetTab, firstHalf, secondHalf]);

    const getTabLabel = (type: 'first' | 'second') => {
        const list = type === 'first' ? firstHalf : secondHalf;
        if (list.length === 0) {return type === 'first' ? 'Primera Mitad (0)' : 'Segunda Mitad (0)';}

        const start = list[0]?.name.charAt(0).toUpperCase();
        const end = list[list.length - 1]?.name.charAt(0).toUpperCase();
        return `${start}-${end} (${list.length})`;
    };

    return {
        alphabetTab,
        setAlphabetTab,
        filteredCategories,
        getTabLabel
    };
}

