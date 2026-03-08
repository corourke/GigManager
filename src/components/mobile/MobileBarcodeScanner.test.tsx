import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MobileBarcodeScanner } from './MobileBarcodeScanner'

describe('MobileBarcodeScanner', () => {
  it('shows secure-context remediation when camera is unavailable in insecure context', async () => {
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      configurable: true,
    })

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError')),
      },
      configurable: true,
    })

    render(
      <MobileBarcodeScanner
        isScanning
        onClose={vi.fn()}
        onScan={vi.fn()}
      />
    )

    expect(await screen.findByText(/requires a secure connection/i)).toBeInTheDocument()
  })
})
