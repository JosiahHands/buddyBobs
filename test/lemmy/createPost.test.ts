import { describe, expect, it } from '@jest/globals'
import { createPost, searchCommunities } from '../../src/lemmy/createPost.ts'
import { makeCommunity, makePost, mockFetch, requestTo } from '../testUtils.ts'

describe('searchCommunities', () => {
  it('searches communities on every instance, biggest first', async () => {
    const communities = [makeCommunity(1, 'technology')]
    const fetchMock = mockFetch(() => ({ body: { communities } }))

    await expect(searchCommunities('tech')).resolves.toEqual(communities)

    const params = new URL(requestTo(fetchMock, 'search')?.url ?? '').searchParams
    expect(Object.fromEntries(params)).toEqual({
      q: 'tech',
      type_: 'Communities',
      listing_type: 'All',
      sort: 'TopAll',
      limit: '8',
    })
  })

  it('throws when the request fails', async () => {
    mockFetch(() => ({ status: 500 }))
    await expect(searchCommunities('tech')).rejects.toThrow('Lemmy request failed: 500')
  })
})

describe('createPost', () => {
  it('sends the post with the token and returns it', async () => {
    const created = makePost(9, { name: 'Hello' })
    const fetchMock = mockFetch(() => ({ body: { post_view: created } }))

    await expect(createPost('abc', { community_id: 1, name: 'Hello' })).resolves.toEqual(created)

    const request = requestTo(fetchMock, 'post')
    expect(request?.body).toEqual({ community_id: 1, name: 'Hello' })
    expect(request?.headers.Authorization).toBe('Bearer abc')
  })
})
