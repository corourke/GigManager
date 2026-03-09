import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MobileBarcodeScanner } from './MobileBarcodeScanner'

const mockScanner = vi.fn()

vi.mock('react-qr-barcode-scanner', () => ({
  default: (props: any) => {
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
})
