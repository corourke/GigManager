import { describe, it, expect } from 'vitest';
import {
  deepEqual,
  getChangedFields,
  normalizeFormData,
  createSubmissionPayload,
  hasFormChanges,
} from './form-utils';

describe('form-utils', () => {
  describe('deepEqual', () => {
    it('should return true for identical primitives', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('test', 'test')).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
    });

    it('should return false for different primitives', () => {
      expect(deepEqual(1, 2)).toBe(false);
      expect(deepEqual('test', 'test2')).toBe(false);
      expect(deepEqual(true, false)).toBe(false);
    });

    it('should return true for identical arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual(['a', 'b'], ['a', 'b'])).toBe(true);
    });

    it('should return false for different arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(deepEqual([1, 2], [2, 1])).toBe(false);
    });

    it('should return true for identical objects', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(deepEqual({ name: 'Test' }, { name: 'Test' })).toBe(true);
    });

    it('should return false for different objects', () => {
      expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    it('should handle nested objects', () => {
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
      expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
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

    it('should handle array deep comparison', () => {
      const current = { tags: ['tag1', 'tag2'] };
      const original = { tags: ['tag1'] };
      const result = getChangedFields(current, original);
      expect(result).toEqual({ tags: ['tag1', 'tag2'] });
    });

    it('should handle null vs undefined', () => {
      const current = { url: null };
      const original = { url: undefined };
      const result = getChangedFields(current, original);
      // null and undefined are considered equal in deepEqual
      expect(result).toEqual({});
    });
  });

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

  describe('hasFormChanges', () => {
    it('should return true when there are changes', () => {
      const current = { name: 'New Name' };
      const original = { name: 'Old Name' };
      expect(hasFormChanges(current, original)).toBe(true);
    });

    it('should return false when there are no changes', () => {
      const current = { name: 'Test' };
      const original = { name: 'Test' };
      expect(hasFormChanges(current, original)).toBe(false);
    });

    it('should return true for array changes', () => {
      const current = { tags: ['tag1', 'tag2'] };
      const original = { tags: ['tag1'] };
      expect(hasFormChanges(current, original)).toBe(true);
    });
  });
});

