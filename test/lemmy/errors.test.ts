import { describe, expect, it } from '@jest/globals'
import { actionError, friendlyError } from '../../src/lemmy/errors.ts'

describe('friendlyError', () => {
  it('explains known codes in plain English', () => {
    expect(friendlyError('incorrect_login')).toBe('Wrong username or password.')
  })

  it('keeps unknown codes so they can be looked up', () => {
    expect(friendlyError('brand_new_error')).toBe('Something went wrong (brand_new_error).')
  })

  it('has a fallback when there is no code', () => {
    expect(friendlyError()).toBe('Something went wrong.')
  })
})

describe('actionError', () => {
  it('treats incorrect_login as an expired login', () => {
    expect(actionError('incorrect_login')).toBe(friendlyError('not_logged_in'))
  })

  it('passes other codes through', () => {
    expect(actionError('locked')).toBe(friendlyError('locked'))
  })
})
