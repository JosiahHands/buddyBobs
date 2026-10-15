import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { logIn, logOut, requireJwt, saveAuth, signUp } from '../../src/login/authSlice.ts'
import { makeStore } from '../../src/store.ts'
import { loggedIn, mockFetch, requestTo } from '../testUtils.ts'

const storageKey = 'buddybobs-auth'

afterEach(() => {
  localStorage.clear()
  jest.restoreAllMocks()
})

describe('requireJwt', () => {
  it('returns the token when logged in', () => {
    expect(requireJwt(makeStore(loggedIn()).getState())).toBe('test-token')
  })

  it('throws not_logged_in when logged out', () => {
    expect(() => requireJwt(makeStore().getState())).toThrow('not_logged_in')
  })
})

describe('saved login', () => {
  // The slice reads storage once when it loads, so load a fresh copy each time
  async function freshAuthState() {
    let state: unknown
    await jest.isolateModulesAsync(async () => {
      const { default: reducer } = await import('../../src/login/authSlice.ts')
      state = reducer(undefined, { type: 'init' })
    })
    return state
  }

  it('starts logged in when a login was saved', async () => {
    localStorage.setItem(storageKey, JSON.stringify({ jwt: 'saved-token', username: 'bob' }))
    await expect(freshAuthState()).resolves.toEqual({ jwt: 'saved-token', username: 'bob' })
  })

  it('copes with a saved login that has no username', async () => {
    localStorage.setItem(storageKey, JSON.stringify({ jwt: 'saved-token' }))
    await expect(freshAuthState()).resolves.toEqual({ jwt: 'saved-token', username: null })
  })

  it('starts logged out when storage holds junk', async () => {
    localStorage.setItem(storageKey, '{not json')
    await expect(freshAuthState()).resolves.toEqual({ jwt: null, username: null })
  })

  it('keeps working when storage is blocked', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => saveAuth({ jwt: 'abc', username: 'bob' })).not.toThrow()
  })
})

describe('logIn', () => {
  it('stores the token and the real username', async () => {
    mockFetch((url) => {
      if (url.includes('user/login')) return { body: { jwt: 'abc' } }
      if (url.endsWith('/site')) return { body: { my_user: { local_user_view: { person: { name: 'Bob' } } } } }
    })
    const store = makeStore()

    await store.dispatch(logIn({ usernameOrEmail: 'bob@example.com', password: 'secret-password' }))
    expect(store.getState().auth).toEqual({ jwt: 'abc', username: 'Bob' })
  })

  it('falls back to what was typed if the username lookup fails', async () => {
    mockFetch((url) => (url.includes('user/login') ? { body: { jwt: 'abc' } } : { status: 500 }))
    const store = makeStore()

    await store.dispatch(logIn({ usernameOrEmail: 'bob', password: 'secret-password' }))
    expect(store.getState().auth.username).toBe('bob')
  })

  it('explains when the email isn’t confirmed yet', async () => {
    mockFetch(() => ({ body: { verify_email_sent: true } }))
    const result = await makeStore().dispatch(logIn({ usernameOrEmail: 'bob', password: 'secret-password' }))
    expect(result).toMatchObject({ error: { message: 'email_not_verified' } })
  })

  it('explains when the account is waiting for approval', async () => {
    mockFetch(() => ({ body: { verify_email_sent: false } }))
    const result = await makeStore().dispatch(logIn({ usernameOrEmail: 'bob', password: 'secret-password' }))
    expect(result).toMatchObject({ error: { message: 'registration_application_is_pending' } })
  })
})

describe('signUp', () => {
  const form = { username: 'bob', password: 'secret-password', password_verify: 'secret-password' }

  it('logs straight in when the instance allows it', async () => {
    mockFetch(() => ({ body: { jwt: 'abc', verify_email_sent: false, registration_created: false } }))
    const store = makeStore()

    await store.dispatch(signUp(form))
    expect(store.getState().auth).toEqual({ jwt: 'abc', username: 'bob' })
  })

  it('stays logged out while the account waits for approval', async () => {
    mockFetch(() => ({ body: { verify_email_sent: true, registration_created: true } }))
    const store = makeStore()

    const result = await store.dispatch(signUp(form))
    expect(result.payload).toEqual({ jwt: null, username: 'bob', verifyEmailSent: true, applicationCreated: true })
    expect(store.getState().auth.jwt).toBeNull()
  })
})

describe('logOut', () => {
  it('tells Lemmy to drop the token and forgets it', async () => {
    const fetchMock = mockFetch()
    const store = makeStore(loggedIn())

    await store.dispatch(logOut())
    expect(requestTo(fetchMock, 'user/logout')?.headers.Authorization).toBe('Bearer test-token')
    expect(store.getState().auth).toEqual({ jwt: null, username: null })
  })

  it('still logs out locally when Lemmy can’t be reached', async () => {
    mockFetch(() => ({ status: 500 }))
    const store = makeStore(loggedIn())

    await store.dispatch(logOut())
    expect(store.getState().auth.jwt).toBeNull()
  })

  it('skips the request when nobody is logged in', async () => {
    const fetchMock = mockFetch()
    await makeStore().dispatch(logOut())
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
