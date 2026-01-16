import { describe, it, expect } from 'vitest';
import {
  normalizeFormData,
  createSubmissionPayload,
  getChangedFields,
} from './form-utils';

describe('form-utils', () => {

  describe('normalizeFormData', () => {
    it('should convert empty strings to null', () => {
      const data = { name: 'Test', url: '', description: 'Desc' };
      const result = normalizeFormData(data);
      expect(result.url).toBeNull();
      expect(result.name).toBe('Test');
    });

    it('should trim string values', () => {
      const data = { name: '  Test  ', type: 'Venue' };
      const result = normalizeFormData(data);
      expect(result.name).toBe('Test');
    });

    it('should filter empty items from arrays', () => {
      const data = { tags: ['tag1', '', 'tag2', null, undefined] };
      const result = normalizeFormData(data);
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle mixed data', () => {
      const data = {
        name: '  Test  ',
        url: '',
        tags: ['tag1', '', 'tag2'],
        count: 5,
      };
      const result = normalizeFormData(data);
      expect(result.name).toBe('Test');
      expect(result.url).toBeNull();
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.count).toBe(5);
    });
  });

  describe('getChangedFields', () => {
    it('should return only changed fields', () => {
      const current = { name: 'New Name', type: 'Venue', url: 'https://example.com' };
      const original = { name: 'Old Name', type: 'Venue', url: 'https://example.com' };
      const result = getChangedFields(current, original);
      expect(result).toEqual({ name: 'New Name' });
    });

    it('should return empty object when no changes', () => {
      const current = { name: 'Test', type: 'Venue' };
      const original = { name: 'Test', type: 'Venue' };
      const result = getChangedFields(current, original);
      expect(result).toEqual({});
    });

    it('should handle multiple changed fields', () => {
      const current = { name: 'New', type: 'Act', url: 'https://new.com' };
      const original = { name: 'Old', type: 'Venue', url: 'https://old.com' };
      const result = getChangedFields(current, original);
      expect(result).toEqual({ name: 'New', type: 'Act', url: 'https://new.com' });
    });

    it('should handle new fields (not in original)', () => {
      const current = { name: 'Test', type: 'Venue', url: 'https://new.com' };
      const original = { name: 'Test', type: 'Venue' };
      const result = getChangedFields(current, original);
      expect(result).toEqual({ url: 'https://new.com' });
    });

    it('should handle null vs undefined as different', () => {
      const current = { url: null };
      const original = { url: undefined };
      const result = getChangedFields(current, original);
      expect(result).toEqual({ url: null });
    });

    it('should handle array reference changes', () => {
      const current = { tags: ['tag1', 'tag2'] };
      const original = { tags: ['tag1', 'tag2'] };
      const result = getChangedFields(current, original);
      // Since arrays are compared by reference, this should be detected as changed
      expect(result).toEqual({ tags: ['tag1', 'tag2'] });
    });

    it('should handle object reference changes', () => {
      const current = { config: { enabled: true } };
      const original = { config: { enabled: true } };
      const result = getChangedFields(current, original);
      // Since objects are compared by reference, this should be detected as changed
      expect(result).toEqual({ config: { enabled: true } });
    });

    it('should handle empty objects', () => {
      const current = {};
      const original = {};
      const result = getChangedFields(current, original);
      expect(result).toEqual({});
    });

    it('should handle empty original data', () => {
      const current = { name: 'Test', type: 'Venue' };
      const original = {};
      const result = getChangedFields(current, original);
      expect(result).toEqual({ name: 'Test', type: 'Venue' });
    });

    it('should handle primitive types correctly', () => {
      const current = { count: 5, enabled: true, rate: 3.14 };
      const original = { count: 5, enabled: false, rate: 3.14 };
      const result = getChangedFields(current, original);
      expect(result).toEqual({ enabled: true });
    });
  });

  describe('createSubmissionPayload', () => {
    it('should return only changed fields', () => {
      const current = { name: 'New Name', type: 'Venue', url: 'https://example.com' };
      const original = { name: 'Old Name', type: 'Venue', url: 'https://example.com' };
      const result = createSubmissionPayload(current, original);
      expect(result).toEqual({ name: 'New Name' });
    });

    it('should normalize data before comparison', () => {
      const current = { name: '  Test  ', url: '' };
      const original = { name: 'Test', url: 'https://old.com' };
      const result = createSubmissionPayload(current, original);
      expect(result).toEqual({ url: null });
      expect(result.name).toBeUndefined(); // Trimmed to same value
    });

    it('should handle empty strings as null', () => {
      const current = { name: 'Test', url: '' };
      const original = { name: 'Test', url: 'https://old.com' };
      const result = createSubmissionPayload(current, original);
      expect(result).toEqual({ url: null });
    });

    it('should handle array deep comparison', () => {
      const current = { tags: ['tag1', 'tag2'] };
      const original = { tags: ['tag1'] };
      const result = createSubmissionPayload(current, original);
      expect(result).toEqual({ tags: ['tag1', 'tag2'] });
    });

    it('should return empty object when no changes', () => {
      const current = { name: 'Test', type: 'Venue' };
      const original = { name: 'Test', type: 'Venue' };
      const result = createSubmissionPayload(current, original);
      expect(result).toEqual({});
    });

    it('should return all fields when originalData is empty (create mode)', () => {
      const current = { name: 'Test', type: 'Venue' };
      const result = createSubmissionPayload(current, {});
      expect(result).toEqual({ name: 'Test', type: 'Venue' });
    });

    it('should handle null values correctly', () => {
      const current = { name: 'Test', url: null };
      const original = { name: 'Test', url: 'https://old.com' };
      const result = createSubmissionPayload(current, original);
      expect(result).toEqual({ url: null });
    });
  });
});

