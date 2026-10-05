import { describe, it, expect } from 'vitest';
import { suggestedTaxTreatment, TAX_EXPENSE_BELOW, TAX_DEPRECIATE_ABOVE, taxTreatmentLabel, isTaxYearLocked } from './taxTreatment';

describe('tax treatment rule (#133)', () => {
  it('expenses items under $200 per item', () => {
    expect(suggestedTaxTreatment(0)).toBe('expense');
    expect(suggestedTaxTreatment(199.99)).toBe('expense');
  });

  it('depreciates items over $2,500 per item', () => {
    expect(suggestedTaxTreatment(2500.01)).toBe('depreciate');
    expect(suggestedTaxTreatment(4000)).toBe('depreciate');
  });

  it('leaves the $200 to $2,500 grey zone to the user', () => {
    expect(suggestedTaxTreatment(200)).toBeNull();
    expect(suggestedTaxTreatment(239.21)).toBeNull();
    expect(suggestedTaxTreatment(2500)).toBeNull();
  });

  it('uses the thresholds Cameron set', () => {
    expect(TAX_EXPENSE_BELOW).toBe(200);
    expect(TAX_DEPRECIATE_ABOVE).toBe(2500);
  });

  it('labels each treatment', () => {
    expect(taxTreatmentLabel('expense')).toBe('Expense');
    expect(taxTreatmentLabel('depreciate')).toBe('Depreciate');
    expect(taxTreatmentLabel(null)).toBe('Choose');
  });

  it('knows whether a date falls in a locked year', () => {
    const locked = new Set([2024, 2025]);
    expect(isTaxYearLocked('2025-02-14', locked)).toBe(true);
    expect(isTaxYearLocked('2026-01-02', locked)).toBe(false);
    expect(isTaxYearLocked(null, locked)).toBe(false);
  });
});
