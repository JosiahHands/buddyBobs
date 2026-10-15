import { describe, expect, it } from '@jest/globals'
import { screen } from '@testing-library/react'
import Header from '../../src/header/header.tsx'
import { loggedIn, mockFetch, renderWithStore, requestTo, withSite } from '../testUtils.ts'

describe('Header', () => {
  it('shows the brand and a Login button when logged out', () => {
    renderWithStore(<Header />)
    expect(screen.getByRole('link', { name: /BuddyBobs/ })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  it('opens the login window and closes it again', async () => {
    const { user } = renderWithStore(<Header />, withSite())

    await user.click(screen.getByRole('button', { name: 'Login' }))
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument()
  })

  it('shows the username and logs out', async () => {
    const fetchMock = mockFetch()
    const { user, store } = renderWithStore(<Header />, loggedIn('bob'))

    expect(screen.getByText('@bob')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Logout' }))

    expect(await screen.findByRole('button', { name: 'Login' })).toBeInTheDocument()
    expect(screen.queryByText('@bob')).not.toBeInTheDocument()
    expect(store.getState().auth.jwt).toBeNull()
    expect(requestTo(fetchMock, 'user/logout')).toBeDefined()
  })
})
