import { render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SessionExpiredBanner } from '../SessionExpiredBanner'

describe('SessionExpiredBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is hidden by default', () => {
    render(<SessionExpiredBanner />)
    expect(screen.queryByText(/sessão expirou/i)).not.toBeInTheDocument()
  })

  it('shows banner when session:expired event fires', () => {
    render(<SessionExpiredBanner />)
    act(() => {
      window.dispatchEvent(new CustomEvent('session:expired'))
    })
    expect(screen.getByText(/sessão expirou/i)).toBeInTheDocument()
  })
})
