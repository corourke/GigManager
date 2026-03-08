import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import MobileDashboard from './MobileDashboard'

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ isLoading: false }),
}))

vi.mock('../../utils/idb/store', () => ({
  idbStore: {
    getGigs: vi.fn(),
  },
}))

vi.mock('../../services/mobile/packingList.service', () => ({
  packingListService: {
    fetchUpcomingGigs: vi.fn(),
  },
}))

import { idbStore } from '../../utils/idb/store'
import { packingListService } from '../../services/mobile/packingList.service'

describe('MobileDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(idbStore.getGigs).mockResolvedValue([])
    vi.mocked(packingListService.fetchUpcomingGigs).mockResolvedValue([])
  })

  it('does not show hard error UI for AbortError during refresh', async () => {
    vi.mocked(packingListService.fetchUpcomingGigs).mockRejectedValue(
      new DOMException('The operation was aborted.', 'AbortError')
    )

    render(<MobileDashboard onViewGig={vi.fn()} />)

    await waitFor(() => {
      expect(screen.queryByText('Error loading gigs')).not.toBeInTheDocument()
    })
  })
})
