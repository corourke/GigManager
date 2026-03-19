import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginScreen from './LoginScreen'

// Shared auth mock — hoisted so the mock factory can reference it before the
// const declarations are reached by the JS engine.
const mockAuth = vi.hoisted(() => ({
  signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  signUp: vi.fn().mockResolvedValue({ data: { session: null, user: null }, error: null }),
  signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
  getUser: vi.fn().mockResolvedValue({ data: { user: { email: 'test@example.com' } }, error: null }),
}))

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(() => ({ auth: mockAuth })),
}))

vi.mock('../services/organization.service', () => ({
  convertPendingToActive: vi.fn().mockResolvedValue(undefined),
}))

const mockOnLogin = vi.fn()

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore default happy-path behaviour
    mockAuth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: null })
    mockAuth.signUp.mockResolvedValue({ data: { session: null, user: null }, error: null })
    mockAuth.signInWithOAuth.mockResolvedValue({ data: {}, error: null })
    mockAuth.getUser.mockResolvedValue({ data: { user: { email: 'test@example.com' } }, error: null })
  })

  it('renders without throwing errors', () => {
    expect(() => render(<LoginScreen />)).not.toThrow()
  })

  it('renders the sign-in email and password inputs', () => {
    render(<LoginScreen />)
    expect(document.getElementById('signin-email')).not.toBeNull()
    expect(document.getElementById('signin-password')).not.toBeNull()
  })

  it('renders the sign-in submit button', () => {
    render(<LoginScreen />)
    expect(screen.getByRole('button', { name: /sign in with email/i })).toBeTruthy()
  })

  it('disables the submit button while a sign-in is in flight', async () => {
    // Never resolves — simulates a slow network
    mockAuth.signInWithPassword.mockReturnValue(new Promise(() => {}))

    render(<LoginScreen />)

    const emailInput = document.getElementById('signin-email') as HTMLInputElement
    const passwordInput = document.getElementById('signin-password') as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    const submitButton = screen.getByRole('button', { name: /sign in with email/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })

  it('displays an error alert when sign-in returns an auth error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    })

    render(<LoginScreen />)

    const emailInput = document.getElementById('signin-email') as HTMLInputElement
    const passwordInput = document.getElementById('signin-password') as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } })

    fireEvent.click(screen.getByRole('button', { name: /sign in with email/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/invalid email or password/i)
      ).toBeTruthy()
    })
  })

  it('calls signInWithPassword with the entered email and password', async () => {
    // Return an error so we don't need to stub the full post-login flow
    mockAuth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'test error' },
    })

    render(<LoginScreen />)

    const emailInput = document.getElementById('signin-email') as HTMLInputElement
    const passwordInput = document.getElementById('signin-password') as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'alice@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'secret123' } })

    fireEvent.click(screen.getByRole('button', { name: /sign in with email/i }))

    await waitFor(() => {
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'alice@example.com',
        password: 'secret123',
      })
    })
  })

  it('renders the Google sign-in button', () => {
    render(<LoginScreen />)
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeTruthy()
  })

  it('renders both Sign In and Sign Up tab triggers', () => {
    render(<LoginScreen />)
    expect(screen.getByRole('tab', { name: /sign in/i })).toBeTruthy()
    expect(screen.getByRole('tab', { name: /sign up/i })).toBeTruthy()
  })
})
