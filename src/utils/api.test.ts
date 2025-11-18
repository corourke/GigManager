import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from './api'

// Mock the modules
vi.mock('./supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token',
            user: { id: 'user-1' }
          }
        },
        error: null,
      }),
    },
  })),
}))

vi.mock('./supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'test-key',
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('getGigs', () => {
    it('fetches gigs for an organization successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: 'gig-1',
            title: 'Test Gig',
            organization_id: 'org-1',
            status: 'Booked',
            start: '2025-01-01T10:00:00Z',
            end: '2025-01-01T12:00:00Z',
          }
        ])
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await api.getGigs('org-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-project.supabase.co/functions/v1/make-server-de012ad4/gigs?organization_id=org-1',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result).toEqual([
        {
          id: 'gig-1',
          title: 'Test Gig',
          organization_id: 'org-1',
          status: 'Booked',
          start: '2025-01-01T10:00:00Z',
          end: '2025-01-01T12:00:00Z',
        }
      ])
    })

    it('throws error when fetch fails', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Database error' })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      await expect(api.getGigs('org-1')).rejects.toThrow('Failed to fetch gigs')
    })
  })

  describe('createGig', () => {
    it('creates a gig successfully', async () => {
      const gigData = {
        title: 'New Gig',
        organization_id: 'org-1',
        start: '2025-01-01T10:00:00Z',
        end: '2025-01-01T12:00:00Z',
        status: 'Proposed',
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'gig-1',
          ...gigData,
        })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await api.createGig(gigData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-project.supabase.co/functions/v1/make-server-de012ad4/gigs',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(gigData),
        })
      )
      expect(result).toEqual({
        id: 'gig-1',
        ...gigData,
      })
    })

    it('throws error when creation fails', async () => {
      const mockResponse = {
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Validation error' })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      await expect(api.createGig({ title: 'Invalid' })).rejects.toThrow('Failed to create gig')
    })
  })

  describe('updateGig', () => {
    it('updates a gig successfully', async () => {
      const updateData = { title: 'Updated Title' }
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await api.updateGig('gig-1', updateData)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-project.supabase.co/functions/v1/make-server-de012ad4/gigs/gig-1',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(updateData),
        })
      )
      expect(result).toEqual({ success: true })
    })
  })

  describe('deleteGig', () => {
    it('deletes a gig successfully', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({ success: true })
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      const result = await api.deleteGig('gig-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-project.supabase.co/functions/v1/make-server-de012ad4/gigs/gig-1',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result).toEqual({ success: true })
    })
  })
})
