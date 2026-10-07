import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Package } from 'lucide-react'
import { Tabs } from '../ui/tabs'
import { PageHeader } from './PageHeader'
import { PageTabsList, PageTabsTrigger } from './PageTabs'

describe('PageHeader (#39 page frame)', () => {
  it('renders the title as the page h1', () => {
    render(<PageHeader title="Equipment" icon={Package} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Equipment' })).toBeInTheDocument()
  })

  it('shows the section icon in the slot when there is no Back', () => {
    render(<PageHeader title="Equipment" icon={Package} />)
    const slot = screen.getByTestId('page-header-slot')
    expect(slot.querySelector('svg')).not.toBeNull()
    expect(within(slot).queryByRole('button')).toBeNull()
  })

  it('puts Back in the slot instead of the icon, named for where it goes', async () => {
    const onBack = vi.fn()
    render(<PageHeader title="Fall Festival" icon={Package} back={{ label: 'Back to Gigs', onClick: onBack }} />)
    const slot = screen.getByTestId('page-header-slot')
    const back = within(slot).getByRole('button', { name: 'Back to Gigs' })
    await userEvent.click(back)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('keeps the slot when there is neither icon nor Back, so the title does not move', () => {
    render(<PageHeader title="Untitled" />)
    expect(screen.getByTestId('page-header-slot')).toBeInTheDocument()
  })

  it('renders badge, meta and actions on the title row', () => {
    render(
      <PageHeader
        title="Fall Festival"
        badge={<span>Proposed</span>}
        meta="Oct 17, 2026"
        actions={<button>Edit</button>}
      />,
    )
    const row = screen.getByTestId('page-header-title-row')
    expect(within(row).getByText('Proposed')).toBeInTheDocument()
    expect(within(row).getByText('Oct 17, 2026')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('renders tabs below the title row, never above it', () => {
    render(
      <Tabs value="assets">
        <PageHeader
          title="Equipment"
          tabs={
            <PageTabsList aria-label="Equipment sections">
              <PageTabsTrigger value="assets">Assets</PageTabsTrigger>
              <PageTabsTrigger value="kits">Kits</PageTabsTrigger>
            </PageTabsList>
          }
        />
      </Tabs>,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    const tablist = screen.getByRole('tablist', { name: 'Equipment sections' })
    // DOCUMENT_POSITION_FOLLOWING: the tab list comes after the title.
    expect(heading.compareDocumentPosition(tablist) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Assets' })).toHaveAttribute('data-state', 'active')
    expect(screen.getByRole('tab', { name: 'Kits' })).toHaveAttribute('data-state', 'inactive')
  })

  it('renders no tab row when the page has no tabs', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.queryByRole('tablist')).toBeNull()
  })
})
