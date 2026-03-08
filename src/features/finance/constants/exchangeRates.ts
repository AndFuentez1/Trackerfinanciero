/**
 * Exchange Rates Dictionary (Base: USD = 1)
 * Reference Point: Estimated values relative to USD as of January 1, 2026.
 * TRM COP is explicitly set to 3757.08.
 */

export const BASE_RATES_TO_USD: Record<string, number> = {
    USD: 1.0,
    COP: 3757.08,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 145.50,
    CNY: 7.15,
    CAD: 1.35,
    AUD: 1.50,
    CHF: 0.85,
    HKD: 7.82,
    NZD: 1.62,
    SEK: 10.30,
    KRW: 1320.50,
    SGD: 1.33,
    NOK: 10.50,
    MXN: 17.05,
    INR: 83.10,
    RUB: 90.00,
    ZAR: 18.50,
    TRY: 30.50,
    BRL: 4.95,
    TWD: 31.20,
    DKK: 6.85,
    PLN: 4.00,
    THB: 35.00,
    IDR: 15500.00,
    HUF: 350.00,
    CZK: 22.50,
    ILS: 3.70,
    CLP: 880.00,
    PHP: 55.60,
    AED: 3.67,
    SAR: 3.75,
    MYR: 4.65,
    RON: 4.55,
    PEN: 3.70,
    ARS: 850.00,
};

/**
 * Calculates the exchange rate from a source currency to a target currency.
 * Formula: Rate = Target_Base_Rate / Source_Base_Rate
 */
export const getExchangeRate = (fromCurrency: string, toCurrency: string): number | null => {
    const fromRate = BASE_RATES_TO_USD[fromCurrency];
    const toRate = BASE_RATES_TO_USD[toCurrency];

    if (!fromRate || !toRate) {
        return null;
    }

    return toRate / fromRate;
};
