import { useFinanceData } from './useFinanceData';

export function useDecimalPlaces() {
  const { decimalPlaces } = useFinanceData();
  return decimalPlaces;
}
