import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { useFormWithChanges } from './useFormWithChanges'

// Mock react-hook-form
vi.mock('react-hook-form', () => ({
  useForm: vi.fn(),
}))

describe('useFormWithChanges', () => {
  let mockForm: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockForm = {
      getValues: vi.fn(),
      watch: vi.fn(() => vi.fn()), // watch returns an unsubscribe function
      reset: vi.fn(),
      formState: {
        isDirty: false,
      },
    }
    ;(useForm as any).mockReturnValue(mockForm)
  })

  describe('basic functionality', () => {
    it('returns expected interface', () => {
      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: { name: 'test' },
        })
      )

      expect(result.current).toHaveProperty('hasChanges')
      expect(result.current).toHaveProperty('changedFields')
      expect(result.current).toHaveProperty('originalData')
      expect(result.current).toHaveProperty('isDirty')
      expect(result.current).toHaveProperty('markAsSaved')
      expect(result.current).toHaveProperty('resetToOriginal')
      expect(result.current).toHaveProperty('loadInitialData')
      expect(result.current).toHaveProperty('getChangedFields')
      expect(result.current).toHaveProperty('updateChangedFields')
      expect(result.current).toHaveProperty('hasFieldChanged')
      expect(result.current).toHaveProperty('deepEqual')
    })
  })

  describe('hasChanges detection', () => {
    it('detects changes in form fields', () => {
      mockForm.getValues.mockReturnValue({ name: 'changed', email: 'test@example.com' })
      mockForm.watch.mockReturnValue(vi.fn())

      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: { name: 'original', email: 'test@example.com' },
        })
      )

      // Trigger update (simulate form watch callback)
      act(() => {
        result.current.updateChangedFields()
      })

      expect(result.current.hasChanges).toBe(true)
      expect(result.current.changedFields).toEqual({ name: 'changed' })
    })

    it('detects no changes when form matches original', () => {
      mockForm.getValues.mockReturnValue({ name: 'original', email: 'test@example.com' })
      mockForm.watch.mockReturnValue(vi.fn())

      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: { name: 'original', email: 'test@example.com' },
        })
      )

      act(() => {
        result.current.updateChangedFields()
      })

      expect(result.current.hasChanges).toBe(false)
      expect(result.current.changedFields).toEqual({})
    })

    it('detects changes in nested data when using currentData', () => {
      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: { name: 'original', staffSlots: [] },
          currentData: { name: 'original', staffSlots: [{ id: '1', name: 'Slot 1' }] },
        })
      )

      act(() => {
        result.current.updateChangedFields()
      })

      expect(result.current.hasChanges).toBe(true)
      expect(result.current.changedFields).toEqual({
        staffSlots: [{ id: '1', name: 'Slot 1' }]
      })
    })
  })

  describe('markAsSaved', () => {
    it('updates original data and resets changes', () => {
      mockForm.getValues.mockReturnValue({ name: 'changed', email: 'test@example.com' })

      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: { name: 'original', email: 'test@example.com' },
        })
      )

      // Make changes
      act(() => {
        result.current.updateChangedFields()
      })
      expect(result.current.hasChanges).toBe(true)

      // Mark as saved
      act(() => {
        result.current.markAsSaved()
      })

      expect(result.current.hasChanges).toBe(false)
      expect(result.current.changedFields).toEqual({})
      expect(result.current.originalData).toEqual({ name: 'changed', email: 'test@example.com' })
    })

    it('uses provided data when marking as saved', () => {
      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: { name: 'original' },
        })
      )

      act(() => {
        result.current.markAsSaved({ name: 'custom', customField: 'value' })
      })

      expect(result.current.originalData).toEqual({ name: 'custom', customField: 'value' })
    })
  })

  describe('getChangedFields', () => {
    it('returns only changed fields', () => {
      mockForm.getValues.mockReturnValue({
        name: 'changed',
        email: 'test@example.com',
        age: 25,
      })

      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: { name: 'original', email: 'test@example.com' },
        })
      )

      const changes = result.current.getChangedFields()
      expect(changes).toEqual({ name: 'changed', age: 25 })
    })
  })

  describe('deep equality', () => {
    it('handles primitive equality', () => {
      const { result } = renderHook(() => useFormWithChanges({ initialData: {} }))

      expect(result.current.deepEqual(1, 1)).toBe(true)
      expect(result.current.deepEqual(1, 2)).toBe(false)
      expect(result.current.deepEqual('test', 'test')).toBe(true)
      expect(result.current.deepEqual('test', 'other')).toBe(false)
      expect(result.current.deepEqual(true, true)).toBe(true)
      expect(result.current.deepEqual(true, false)).toBe(false)
    })

    it('handles array equality', () => {
      const { result } = renderHook(() => useFormWithChanges({ initialData: {} }))

      expect(result.current.deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(result.current.deepEqual([1, 2, 3], [1, 2])).toBe(false)
      expect(result.current.deepEqual([1, 2], [2, 1])).toBe(false)
    })

    it('handles object equality', () => {
      const { result } = renderHook(() => useFormWithChanges({ initialData: {} }))

      expect(result.current.deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
      expect(result.current.deepEqual({ a: 1 }, { a: 2 })).toBe(false)
      expect(result.current.deepEqual({ a: 1 }, { b: 1 })).toBe(false)
    })

    it('handles nested objects', () => {
      const { result } = renderHook(() => useFormWithChanges({ initialData: {} }))

      expect(result.current.deepEqual(
        { user: { name: 'John', age: 25 } },
        { user: { name: 'John', age: 25 } }
      )).toBe(true)

      expect(result.current.deepEqual(
        { user: { name: 'John', age: 25 } },
        { user: { name: 'Jane', age: 25 } }
      )).toBe(false)
    })

    it('handles Date objects', () => {
      const { result } = renderHook(() => useFormWithChanges({ initialData: {} }))

      const date1 = new Date('2023-01-01')
      const date2 = new Date('2023-01-01')
      const date3 = new Date('2023-01-02')

      expect(result.current.deepEqual(date1, date2)).toBe(true)
      expect(result.current.deepEqual(date1, date3)).toBe(false)
      expect(result.current.deepEqual(date1, '2023-01-01')).toBe(false)
    })

    it('handles null and undefined', () => {
      const { result } = renderHook(() => useFormWithChanges({ initialData: {} }))

      expect(result.current.deepEqual(null, null)).toBe(true)
      expect(result.current.deepEqual(undefined, undefined)).toBe(true)
      expect(result.current.deepEqual(null, undefined)).toBe(true)
      expect(result.current.deepEqual(null, 'null')).toBe(false)
    })
  })

  describe('loadInitialData', () => {
    it('updates original data and resets form', () => {
      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: { name: 'original' },
        })
      )

      act(() => {
        result.current.loadInitialData({ name: 'new initial', email: 'new@example.com' })
      })

      expect(result.current.originalData).toEqual({ name: 'new initial', email: 'new@example.com' })
      expect(result.current.hasChanges).toBe(false)
      expect(result.current.changedFields).toEqual({})
      expect(mockForm.reset).toHaveBeenCalledWith({ name: 'new initial', email: 'new@example.com' })
    })
  })

  describe('resetToOriginal', () => {
    it('resets form to original data', () => {
      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: { name: 'original', email: 'test@example.com' },
        })
      )

      act(() => {
        result.current.resetToOriginal()
      })

      expect(mockForm.reset).toHaveBeenCalledWith({ name: 'original', email: 'test@example.com' })
      expect(result.current.hasChanges).toBe(false)
      expect(result.current.changedFields).toEqual({})
    })
  })

  describe('hasFieldChanged', () => {
    it('returns true for changed fields', () => {
      mockForm.getValues.mockReturnValue({ name: 'changed' })

      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: { name: 'original' },
        })
      )

      act(() => {
        result.current.updateChangedFields()
      })

      expect(result.current.hasFieldChanged('name')).toBe(true)
      expect(result.current.hasFieldChanged('email')).toBe(false)
    })
  })

  describe('manual state management (without form)', () => {
    it('works without react-hook-form', () => {
      const { result } = renderHook(() =>
        useFormWithChanges({
          initialData: { name: 'original' },
          currentData: { name: 'changed' },
        })
      )

      act(() => {
        result.current.updateChangedFields()
      })

      expect(result.current.hasChanges).toBe(true)
      expect(result.current.changedFields).toEqual({ name: 'changed' })
    })
  })

  describe('form watch integration', () => {
    it('subscribes to form changes', () => {
      const mockUnsubscribe = vi.fn()
      mockForm.watch.mockReturnValue(mockUnsubscribe)

      renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: {},
        })
      )

      expect(mockForm.watch).toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('handles empty objects', () => {
      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: {},
        })
      )

      expect(result.current.hasChanges).toBe(false)
      expect(result.current.changedFields).toEqual({})
    })

    it('handles undefined values', () => {
      mockForm.getValues.mockReturnValue({ name: undefined })

      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: { name: 'original' },
        })
      )

      act(() => {
        result.current.updateChangedFields()
      })

      expect(result.current.hasChanges).toBe(true)
      expect(result.current.changedFields).toEqual({ name: undefined })
    })

    it('handles complex nested structures', () => {
      const original = {
        user: {
          profile: {
            name: 'John',
            settings: { theme: 'dark', notifications: true }
          },
          roles: ['admin', 'user']
        }
      }

      const changed = {
        user: {
          profile: {
            name: 'Jane',
            settings: { theme: 'light', notifications: true }
          },
          roles: ['admin', 'user']
        }
      }

      mockForm.getValues.mockReturnValue(changed)

      const { result } = renderHook(() =>
        useFormWithChanges({
          form: mockForm,
          initialData: original,
        })
      )

      act(() => {
        result.current.updateChangedFields()
      })

      expect(result.current.hasChanges).toBe(true)
      expect(result.current.changedFields.user.profile.name).toBe('Jane')
      expect(result.current.changedFields.user.profile.settings.theme).toBe('light')
    })
  })
})
