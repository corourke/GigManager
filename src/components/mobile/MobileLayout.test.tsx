import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MobileLayout from './MobileLayout'

describe('MobileLayout', () => {
  it('keeps bottom nav non-intercepting so main content can own vertical scroll', () => {
    render(
      <MobileLayout currentRoute="mobile-dashboard" onNavigate={vi.fn()}>
        <div>Body Content</div>
      </MobileLayout>
    )

    const nav = screen.getByTestId('mobile-bottom-nav')
    const main = screen.getByTestId('mobile-main-content')

    expect(nav.style.touchAction).not.toBe('none')
    expect(main.style.overflowY).toBe('auto')
  })
})
