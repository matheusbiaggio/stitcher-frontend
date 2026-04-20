import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginPage } from '../LoginPage'

// Mock useAuth
const mockLogin = vi.fn()
const mockUser = { current: null as null | { id: string; role: string } }
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: mockUser.current,
  }),
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { MemoryRouter } from 'react-router-dom'

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  )
}

function getEmailInput() {
  return document.querySelector('input[type="email"]') as HTMLInputElement
}

function getPasswordInput() {
  return document.querySelector('input[type="password"]') as HTMLInputElement
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.current = null
  })

  it('renders email and password fields', () => {
    renderLogin()
    expect(getEmailInput()).toBeInTheDocument()
    expect(getPasswordInput()).toBeInTheDocument()
  })

  it('renders submit button with text "Entrar"', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('disables submit button when fields are empty', () => {
    renderLogin()
    const button = screen.getByRole('button', { name: /entrar/i })
    expect(button).toBeDisabled()
  })

  it('enables submit button when both fields filled', async () => {
    renderLogin()
    const user = userEvent.setup()
    await user.type(getEmailInput(), 'admin@test.com')
    await user.type(getPasswordInput(), 'password123')
    expect(screen.getByRole('button', { name: /entrar/i })).toBeEnabled()
  })

  it('calls login on form submit', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderLogin()
    const user = userEvent.setup()
    await user.type(getEmailInput(), 'admin@test.com')
    await user.type(getPasswordInput(), 'password123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    expect(mockLogin).toHaveBeenCalledWith('admin@test.com', 'password123')
  })

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Unauthorized'))
    renderLogin()
    const user = userEvent.setup()
    await user.type(getEmailInput(), 'admin@test.com')
    await user.type(getPasswordInput(), 'wrongpass')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    expect(await screen.findByText(/email ou senha incorretos/i)).toBeInTheDocument()
  })

  it('navigates to / on successful login', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderLogin()
    const user = userEvent.setup()
    await user.type(getEmailInput(), 'admin@test.com')
    await user.type(getPasswordInput(), 'password123')
    await user.click(screen.getByRole('button', { name: /entrar/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('redirects if user is already authenticated', () => {
    mockUser.current = { id: '1', role: 'admin' }
    renderLogin()
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
  })
})
