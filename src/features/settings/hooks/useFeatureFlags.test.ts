import { describe, it, expect } from 'vitest';
import { DEFAULT_FEATURE_FLAGS, parseFeatureFlags } from './useFeatureFlags';

describe('parseFeatureFlags', () => {
  it('returns defaults for empty or invalid input', () => {
    expect(parseFeatureFlags(null)).toEqual(DEFAULT_FEATURE_FLAGS);
    expect(parseFeatureFlags('x')).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it('keeps stored booleans and ignores unknown or invalid values', () => {
    expect(parseFeatureFlags({ pendingInvoices: false, reclassificationZone: 'no', extra: true })).toEqual({
      pendingInvoices: false,
      reclassificationZone: true,
    });
  });
});
