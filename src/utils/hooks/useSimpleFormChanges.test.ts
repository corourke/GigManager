import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { useSimpleFormChanges } from './useSimpleFormChanges';

interface TestFormData {
  name: string;
  email: string;
  start_time: Date;
  end_time: Date;
  tags: string[];
  nested?: any;
}

describe('useSimpleFormChanges', () => {
  describe('with react-hook-form integration', () => {
    it('should detect no changes in edit mode when form is pristine', () => {
      const { result } = renderHook(() => {
        const form = useForm<TestFormData>({
          defaultValues: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        const changes = useSimpleFormChanges({
          form,
          initialData: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        return { form, changes };
      });

      expect(result.current.changes.hasChanges).toBe(false);
      expect(result.current.changes.isDirty).toBe(false);
    });

    it('should detect changes when form field is modified', () => {
      const { result } = renderHook(() => {
        const form = useForm<TestFormData>({
          defaultValues: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        const changes = useSimpleFormChanges({
          form,
          initialData: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        return { form, changes };
      });

      act(() => {
        result.current.form.setValue('name', 'Updated Name', { shouldDirty: true });
      });

      expect(result.current.changes.hasChanges).toBe(true);
      expect(result.current.changes.isDirty).toBe(true);
    });

    it('should detect changes when Date field is modified', () => {
      const { result } = renderHook(() => {
        const form = useForm<TestFormData>({
          defaultValues: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        const changes = useSimpleFormChanges({
          form,
          initialData: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        return { form, changes };
      });

      act(() => {
        result.current.form.setValue('start_time', new Date('2024-01-15'), { shouldDirty: true });
      });

      expect(result.current.changes.hasChanges).toBe(true);
      expect(result.current.changes.isDirty).toBe(true);
    });

    it('should detect changes when array field is modified', () => {
      const { result } = renderHook(() => {
        const form = useForm<TestFormData>({
          defaultValues: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        const changes = useSimpleFormChanges({
          form,
          initialData: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        return { form, changes };
      });

      act(() => {
        result.current.form.setValue('tags', ['tag1', 'tag2', 'tag3'], { shouldDirty: true });
      });

      expect(result.current.changes.hasChanges).toBe(true);
      expect(result.current.changes.isDirty).toBe(true);
    });

    it('should reset hasChanges after loadInitialData is called', () => {
      const { result } = renderHook(() => {
        const form = useForm<TestFormData>({
          defaultValues: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        const changes = useSimpleFormChanges({
          form,
          initialData: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        return { form, changes };
      });

      act(() => {
        result.current.form.setValue('name', 'Updated Name', { shouldDirty: true });
      });

      expect(result.current.changes.hasChanges).toBe(true);

      act(() => {
        result.current.changes.loadInitialData({
          name: 'Updated Name',
          email: 'test@example.com',
          start_time: new Date('2024-01-01'),
          end_time: new Date('2024-01-02'),
          tags: ['tag1', 'tag2'],
        });
      });

      expect(result.current.changes.hasChanges).toBe(false);
      expect(result.current.changes.isDirty).toBe(false);
    });

    it('should reset hasChanges after markAsSaved is called', () => {
      const { result } = renderHook(() => {
        const form = useForm<TestFormData>({
          defaultValues: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        const changes = useSimpleFormChanges({
          form,
          initialData: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        return { form, changes };
      });

      act(() => {
        result.current.form.setValue('name', 'Updated Name', { shouldDirty: true });
      });

      expect(result.current.changes.hasChanges).toBe(true);

      act(() => {
        result.current.changes.markAsSaved();
      });

      expect(result.current.changes.hasChanges).toBe(false);
      expect(result.current.changes.isDirty).toBe(false);
    });

    it('should return changed fields only', () => {
      const { result } = renderHook(() => {
        const form = useForm<TestFormData>({
          defaultValues: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        const changes = useSimpleFormChanges({
          form,
          initialData: {
            name: 'Test',
            email: 'test@example.com',
            start_time: new Date('2024-01-01'),
            end_time: new Date('2024-01-02'),
            tags: ['tag1', 'tag2'],
          },
        });
        
        return { form, changes };
      });

      act(() => {
        result.current.form.setValue('name', 'Updated Name', { shouldDirty: true });
      });

      const changedFields = result.current.changes.changedFields;
      expect(changedFields).toHaveProperty('name');
      expect(changedFields.name).toBe('Updated Name');
      expect(changedFields).not.toHaveProperty('email');
    });
  });

  describe('with manual state management', () => {
    it('should detect no changes when data matches initial', () => {
      const initialData = {
        name: 'Test',
        email: 'test@example.com',
        tags: ['tag1', 'tag2'],
      };

      const { result } = renderHook(() =>
        useSimpleFormChanges({
          initialData,
          currentData: initialData,
        })
      );

      expect(result.current.hasChanges).toBe(false);
    });

    it('should detect changes when data reference changes', () => {
      const initialData = {
        name: 'Test',
        email: 'test@example.com',
        tags: ['tag1', 'tag2'],
      };

      const { result, rerender } = renderHook(
        ({ currentData }) =>
          useSimpleFormChanges({
            initialData,
            currentData,
          }),
        {
          initialProps: {
            currentData: initialData,
          },
        }
      );

      expect(result.current.hasChanges).toBe(false);

      const updatedData = {
        name: 'Updated',
        email: 'test@example.com',
        tags: ['tag1', 'tag2'],
      };

      rerender({ currentData: updatedData });

      expect(result.current.hasChanges).toBe(true);
    });
  });
});