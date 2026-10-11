import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileBarcodeScanner } from './MobileBarcodeScanner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'

const mockScanner = vi.fn()

vi.mock('react-qr-barcode-scanner', () => ({
  default: function MockBarcodeScanner(props: any) {
    mockScanner(props)
    React.useEffect(() => {
      props.onError?.(new DOMException('Permission denied', 'NotAllowedError'))
    }, [props])
    return <div data-testid="mock-barcode-scanner" />
  },
}))

describe('MobileBarcodeScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
    })
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(),
      },
      configurable: true,
    })
  })

  it('shows manual entry guidance when camera access requires a secure context', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      configurable: true,
    })

    render(
      <MobileBarcodeScanner
        isScanning
        onClose={vi.fn()}
        onScan={vi.fn()}
      />
    )

    expect(await screen.findByText(/camera access requires https or localhost/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/tag number/i)).toBeInTheDocument()
  })

  it('falls back to manual entry when the scanner reports permission denial', async () => {
    render(
      <MobileBarcodeScanner
        isScanning
        onClose={vi.fn()}
        onScan={vi.fn()}
      />
    )

    expect(await screen.findByText(/camera permission was denied/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/tag number/i)).toBeInTheDocument()
    expect(mockScanner).toHaveBeenCalled()
  })

  describe('manual tag entry (#256)', () => {
    // A computer with no camera: the scanner opens straight on manual entry.
    const noCamera = () => {
      Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true })
    }

    it('on a phone (no dialog around it), a typed tag is submitted by Submit and by Enter', async () => {
      noCamera()
      const onScan = vi.fn()
      const user = userEvent.setup()
      render(<MobileBarcodeScanner isScanning onClose={vi.fn()} onScan={onScan} />)

      const field = await screen.findByPlaceholderText(/tag number/i)
      await user.click(field)
      await user.type(field, 'DSL-0041')
      expect(field).toHaveValue('DSL-0041')
      await user.click(screen.getByRole('button', { name: 'Submit' }))
      expect(onScan).toHaveBeenLastCalledWith('DSL-0041')

      await user.type(field, 'DSL-0042{Enter}')
      expect(onScan).toHaveBeenLastCalledWith('DSL-0042')
    })

    it('inside the desktop "Track a gig" dialog, a typed tag can be entered and submitted', async () => {
      noCamera()
      const onScan = vi.fn()
      const user = userEvent.setup()
      // Mirrors InventoryTabScreen: Track a gig is a modal Radix Dialog, and the scanner
      // (TrackingTab -> MobileInventoryMode) renders inside its content.
      render(
        <Dialog open onOpenChange={vi.fn()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Track a gig</DialogTitle>
              <DialogDescription>Scan equipment out and back in for a gig.</DialogDescription>
            </DialogHeader>
            <MobileBarcodeScanner isScanning onClose={vi.fn()} onScan={onScan} />
          </DialogContent>
        </Dialog>
      )

      const field = await screen.findByPlaceholderText(/tag number/i)
      await user.click(field)
      expect(field).toHaveFocus()
      await user.type(field, 'DSL-0041')
      expect(field).toHaveValue('DSL-0041')
      await user.click(screen.getByRole('button', { name: 'Submit' }))
      expect(onScan).toHaveBeenLastCalledWith('DSL-0041')

      await user.type(field, 'DSL-0042{Enter}')
      expect(onScan).toHaveBeenLastCalledWith('DSL-0042')
    })
  })
})
