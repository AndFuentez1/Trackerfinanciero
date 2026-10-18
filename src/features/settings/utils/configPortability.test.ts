import { describe, it, expect } from 'vitest';
import { buildConfigExport, parseConfigImport, type PortablePreferences } from './configPortability';

const prefs: PortablePreferences = {
  baseColor: '#3B82F6',
  decimalPlaces: 2,
  keepSessionAlive: false,
  hideIncompleteAlert: true,
  savingsViewMode: 'annual',
  featureFlags: { pendingInvoices: false, reclassificationZone: true },
};

describe('configPortability', () => {
  it('round-trips exported preferences', () => {
    const file = JSON.stringify(buildConfigExport(prefs, new Date('2026-10-18T00:00:00Z')));
    expect(parseConfigImport(file)).toEqual(prefs);
  });

  it('rejects invalid JSON and foreign files', () => {
    expect(() => parseConfigImport('{nope')).toThrow(/JSON/);
    expect(() => parseConfigImport(JSON.stringify({ kind: 'other', version: 1, preferences: {} }))).toThrow(/FinTrack/);
  });

  it('rejects out-of-range values', () => {
    const bad = buildConfigExport({ ...prefs, decimalPlaces: 9 });
    expect(() => parseConfigImport(JSON.stringify(bad))).toThrow();
  });

  it('rejects files from a newer version', () => {
    const future = { ...buildConfigExport(prefs), version: 99 };
    expect(() => parseConfigImport(JSON.stringify(future))).toThrow(/reciente/);
  });

  it('accepts partial preferences', () => {
    const partial = { kind: 'fintrack-config', version: 1, preferences: { decimalPlaces: 0 } };
    expect(parseConfigImport(JSON.stringify(partial))).toEqual({ decimalPlaces: 0 });
  });
});
