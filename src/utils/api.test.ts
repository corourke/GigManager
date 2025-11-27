import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from './api'

// Create a simple mock Supabase client
const createMockSupabaseClient = () => {
  const mockFrom = vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((onResolve: any) => Promise.resolve({ data: [], error: null }).then(onResolve)),
  }))

  return {
    from: mockFrom,
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
  }
}

const mockClient = createMockSupabaseClient()

// Mock the modules
vi.mock('./supabase/client', () => ({
  createClient: vi.fn(() => mockClient),
}))

vi.mock('./supabase/info', () => ({
  projectId: 'test-project',
  publicAnonKey: 'test-key',
}))

describe('API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Minimal error-checking tests - just verify functions don't throw
  describe('getGigs', () => {
    it('does not throw errors', async () => {
      // Mock the chain to return empty data
      const chain = mockClient.from()
      chain.then = vi.fn((onResolve: any) => Promise.resolve({ data: [], error: null }).then(onResolve))
      
      await expect(api.getGigs('org-1')).resolves.not.toThrow()
    })
  })

  describe('getAssets', () => {
    it('does not throw errors', async () => {
      const chain = mockClient.from()
      chain.then = vi.fn((onResolve: any) => Promise.resolve({ data: [], error: null }).then(onResolve))
      
      await expect(api.getAssets('org-1')).resolves.not.toThrow()
    })
  })

  describe('getAsset', () => {
    it('does not throw errors', async () => {
      const chain = mockClient.from()
      chain.single = vi.fn().mockResolvedValue({ data: {}, error: null })
      
      await expect(api.getAsset('asset-1')).resolves.not.toThrow()
    })
  })

  describe('createAsset', () => {
    it('does not throw errors', async () => {
      const chain = mockClient.from()
      chain.single = vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
      
      await expect(api.createAsset({
        organization_id: 'org-1',
        category: 'Audio',
        manufacturer_model: 'Test',
      })).resolves.not.toThrow()
    })
  })

  describe('updateAsset', () => {
    it('does not throw errors', async () => {
      const chain = mockClient.from()
      chain.single = vi.fn().mockResolvedValue({ data: {}, error: null })
      
      await expect(api.updateAsset('asset-1', { name: 'Updated' })).resolves.not.toThrow()
    })
  })

  describe('getKits', () => {
    it('does not throw errors', async () => {
      const chain = mockClient.from()
      chain.then = vi.fn((onResolve: any) => Promise.resolve({ data: [], error: null }).then(onResolve))
      
      await expect(api.getKits('org-1')).resolves.not.toThrow()
    })
  })

  describe('getKit', () => {
    it('does not throw errors', async () => {
      const chain = mockClient.from()
      chain.single = vi.fn().mockResolvedValue({ data: {}, error: null })
      
      await expect(api.getKit('kit-1')).resolves.not.toThrow()
    })
  })

  describe('createKit', () => {
    it('does not throw errors', async () => {
      const chain = mockClient.from()
      chain.single = vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
      
      await expect(api.createKit({
        organization_id: 'org-1',
        name: 'Test Kit',
        category: 'Audio',
      })).resolves.not.toThrow()
    })
  })

  describe('getOrganizations', () => {
    it('does not throw errors', async () => {
      const chain = mockClient.from()
      chain.then = vi.fn((onResolve: any) => Promise.resolve({ data: [], error: null }).then(onResolve))
      
      await expect(api.getOrganizations('Production')).resolves.not.toThrow()
    })
  })

  describe('getUserProfile', () => {
    it('does not throw errors', async () => {
      const chain = mockClient.from()
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: {}, error: null })
      
      await expect(api.getUserProfile('user-1')).resolves.not.toThrow()
    })
  })

  describe('updateUserProfile', () => {
    it('does not throw errors', async () => {
      const chain = mockClient.from()
      chain.single = vi.fn().mockResolvedValue({ data: {}, error: null })
      
      await expect(api.updateUserProfile('user-1', { first_name: 'Test' })).resolves.not.toThrow()
    })
  })

  describe('getOrganizationMembers', () => {
    it('does not throw errors', async () => {
      const chain = mockClient.from()
      chain.then = vi.fn((onResolve: any) => Promise.resolve({ data: [], error: null }).then(onResolve))
      
      await expect(api.getOrganizationMembers('org-1')).resolves.not.toThrow()
    })
  })
})
