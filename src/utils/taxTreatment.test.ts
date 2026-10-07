import { describe, it, expect } from 'vitest';
import { lineTaxTreatment, suggestedTaxTreatment, TAX_EXPENSE_BELOW, TAX_DEPRECIATE_ABOVE, taxTreatmentLabel, isTaxYearLocked, lockedYearMessage } from './taxTreatment';

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

  it('reads a line\'s treatment; a line without one counts as an expense (10-07: one line type)', () => {
    expect(lineTaxTreatment({ row_type: 'line', tax_treatment: 'depreciate' })).toBe('depreciate');
    expect(lineTaxTreatment({ row_type: 'line', tax_treatment: 'expense' })).toBe('expense');
    expect(lineTaxTreatment({ row_type: 'line', tax_treatment: null })).toBe('expense');
    expect(lineTaxTreatment({ row_type: 'header', tax_treatment: null })).toBeNull();
  });
});

describe('lockedYearMessage', () => {
  it('passes on the database\'s filed-year message, and nothing else', () => {
    const locked = { code: '42501', message: 'The 2025 tax year is locked (filed), so its gig income and expenses can\'t be deleted.' };
    expect(lockedYearMessage(locked)).toBe(locked.message);
    expect(lockedYearMessage({ code: '42501', message: 'Permission denied' })).toBeUndefined();
    expect(lockedYearMessage(new Error('Failed to fetch'))).toBeUndefined();
    expect(lockedYearMessage(null)).toBeUndefined();
  });
});
