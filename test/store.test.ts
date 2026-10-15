import { beforeEach, describe, expect, it } from '@jest/globals'
import { store } from '../src/store.ts'
import { logIn, logOut } from '../src/login/authSlice.ts'
import { fetchHomePosts } from '../src/main/postsSlice.ts'

const storageKey = 'buddybobs-auth'

function saved() {
  return JSON.parse(localStorage.getItem(storageKey) ?? 'null')
}

describe('store', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('has a slice for each part of the app', () => {
    expect(Object.keys(store.getState()).sort()).toEqual(['auth', 'comments', 'posts', 'site'])
  })

  it('remembers the login after logging in', () => {
    store.dispatch(
      logIn.fulfilled({ jwt: 'token-1', username: 'bob' }, 'request-1', {
        usernameOrEmail: 'bob',
        password: 'secret-password',
      }),
    )
    expect(saved()).toEqual({ jwt: 'token-1', username: 'bob' })
  })

  it('does not rewrite storage when the login has not changed', () => {
    localStorage.setItem(storageKey, 'untouched')
    store.dispatch(fetchHomePosts.pending('request-2'))
    expect(localStorage.getItem(storageKey)).toBe('untouched')
  })

  it('forgets the login after logging out', () => {
    localStorage.setItem(storageKey, JSON.stringify({ jwt: 'token-1', username: 'bob' }))
    store.dispatch(logOut.fulfilled(undefined, 'request-3'))
    expect(localStorage.getItem(storageKey)).toBeNull()
  })
})
