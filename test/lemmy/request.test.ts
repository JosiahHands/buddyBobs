import { describe, expect, it } from '@jest/globals'
import { authHeaders, baseUrl, postJson } from '../../src/lemmy/request.ts'
import { mockFetch, requestTo } from '../testUtils.ts'

describe('authHeaders', () => {
  it('sends the token as a Bearer header', () => {
    expect(authHeaders('abc')).toEqual({ Authorization: 'Bearer abc' })
  })

  it('sends nothing when logged out', () => {
    expect(authHeaders(null)).toEqual({})
    expect(authHeaders()).toEqual({})
  })
})

describe('postJson', () => {
  it('POSTs JSON with the token and returns the reply', async () => {
    const fetchMock = mockFetch(() => ({ body: { ok: true } }))

    await expect(postJson('comment', { content: 'hi' }, 'abc')).resolves.toEqual({ ok: true })

    const request = requestTo(fetchMock, 'comment')
    expect(request?.url).toBe(`${baseUrl}comment`)
    expect(request?.init?.method).toBe('POST')
    expect(request?.headers).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer abc' })
    expect(request?.body).toEqual({ content: 'hi' })
  })

  it('throws Lemmy’s error code', async () => {
    mockFetch(() => ({ status: 400, body: { error: 'incorrect_login' } }))
    await expect(postJson('user/login', {})).rejects.toThrow('incorrect_login')
  })

  it('throws the status when the reply isn’t JSON', async () => {
    mockFetch(() => ({ status: 502, invalidJson: true }))
    await expect(postJson('user/login', {})).rejects.toThrow('Lemmy request failed: 502')
  })
})
