import { describe, expect, it } from '@jest/globals'
import { getHomePosts, votePost } from '../../src/lemmy/homePost.ts'
import { makePost, mockFetch, requestTo } from '../testUtils.ts'

describe('getHomePosts', () => {
  it('gets the first 20 posts with the instance defaults', async () => {
    const posts = [makePost(1), makePost(2)]
    const fetchMock = mockFetch(() => ({ body: { posts, next_page: 'cursor-2' } }))

    await expect(getHomePosts()).resolves.toEqual({ posts, nextPage: 'cursor-2' })

    const request = requestTo(fetchMock, 'post/list')
    expect(request?.url).toMatch(/post\/list\?limit=20$/)
    expect(request?.headers).toEqual({})
  })

  it('asks for the next page and sends the token', async () => {
    const fetchMock = mockFetch(() => ({ body: { posts: [] } }))

    await expect(getHomePosts('cursor-2', 'abc')).resolves.toEqual({ posts: [], nextPage: undefined })

    const request = requestTo(fetchMock, 'post/list')
    expect(request?.url).toContain('page_cursor=cursor-2')
    expect(request?.headers.Authorization).toBe('Bearer abc')
  })

  it('throws when the request fails', async () => {
    mockFetch(() => ({ status: 503 }))
    await expect(getHomePosts()).rejects.toThrow('Lemmy request failed: 503')
  })
})

describe('votePost', () => {
  it('sends the vote and returns the updated post', async () => {
    const updated = { ...makePost(1), my_vote: 1 }
    const fetchMock = mockFetch(() => ({ body: { post_view: updated } }))

    await expect(votePost('abc', 1, 1)).resolves.toEqual(updated)
    expect(requestTo(fetchMock, 'post/like')?.body).toEqual({ post_id: 1, score: 1 })
  })
})
