import { describe, expect, it } from '@jest/globals'
import { getCaptcha, getMyUsername, login, logout, register } from '../../src/lemmy/account.ts'
import { mockFetch, requestTo } from '../testUtils.ts'

describe('login', () => {
  it('sends the username and password', async () => {
    const fetchMock = mockFetch(() => ({ body: { jwt: 'abc', registration_created: false, verify_email_sent: false } }))

    await expect(login('bob', 'secret-password')).resolves.toMatchObject({ jwt: 'abc' })
    expect(requestTo(fetchMock, 'user/login')?.body).toEqual({
      username_or_email: 'bob',
      password: 'secret-password',
    })
  })

  it('includes the two-factor code when given one', async () => {
    const fetchMock = mockFetch(() => ({ body: {} }))
    await login('bob', 'secret-password', '123456')
    expect(requestTo(fetchMock, 'user/login')?.body.totp_2fa_token).toBe('123456')
  })
})

describe('register', () => {
  it('sends the sign-up form', async () => {
    const fetchMock = mockFetch(() => ({ body: { registration_created: true, verify_email_sent: true } }))
    const form = { username: 'bob', password: 'secret-password', password_verify: 'secret-password' }

    await expect(register(form)).resolves.toEqual({ registration_created: true, verify_email_sent: true })
    expect(requestTo(fetchMock, 'user/register')?.body).toEqual(form)
  })
})

describe('logout', () => {
  it('sends the token being logged out', async () => {
    const fetchMock = mockFetch()
    await logout('abc')
    expect(requestTo(fetchMock, 'user/logout')?.headers.Authorization).toBe('Bearer abc')
  })
})

describe('getCaptcha', () => {
  it('returns the captcha', async () => {
    mockFetch(() => ({ body: { ok: { png: 'png-data', wav: 'wav-data', uuid: 'u1' } } }))
    await expect(getCaptcha()).resolves.toEqual({ png: 'png-data', wav: 'wav-data', uuid: 'u1' })
  })

  it('returns null when the instance has no captcha', async () => {
    mockFetch(() => ({ body: {} }))
    await expect(getCaptcha()).resolves.toBeNull()
  })

  it('throws when the request fails', async () => {
    mockFetch(() => ({ status: 500 }))
    await expect(getCaptcha()).rejects.toThrow('Lemmy request failed: 500')
  })
})

describe('getMyUsername', () => {
  it('reads the logged-in user from the site info', async () => {
    const fetchMock = mockFetch(() => ({ body: { my_user: { local_user_view: { person: { name: 'bob' } } } } }))

    await expect(getMyUsername('abc')).resolves.toBe('bob')
    expect(requestTo(fetchMock, 'site')?.headers.Authorization).toBe('Bearer abc')
  })

  it('returns null when the token isn’t recognised', async () => {
    mockFetch(() => ({ body: {} }))
    await expect(getMyUsername('abc')).resolves.toBeNull()
  })

  it('returns null when the request fails', async () => {
    mockFetch(() => ({ status: 500 }))
    await expect(getMyUsername('abc')).resolves.toBeNull()
  })
})
