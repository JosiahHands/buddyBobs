import { describe, expect, it } from '@jest/globals'
import { addComment, getPostComments, voteComment } from '../../src/lemmy/postComments.ts'
import { makeComment, mockFetch, requestTo } from '../testUtils.ts'

describe('getPostComments', () => {
  it('gets whole threads for a post', async () => {
    const comments = [makeComment(1, '0.1'), makeComment(2, '0.1.2')]
    const fetchMock = mockFetch(() => ({ body: { comments } }))

    await expect(getPostComments(7, 'abc')).resolves.toEqual(comments)

    const request = requestTo(fetchMock, 'comment/list')
    expect(request?.url).toContain('post_id=7')
    expect(request?.url).toContain('max_depth=8')
    expect(request?.headers.Authorization).toBe('Bearer abc')
  })

  it('throws when the request fails', async () => {
    mockFetch(() => ({ status: 500 }))
    await expect(getPostComments(7)).rejects.toThrow('Lemmy request failed: 500')
  })
})

describe('addComment', () => {
  it('posts a top-level comment', async () => {
    const created = makeComment(3, '0.3')
    const fetchMock = mockFetch(() => ({ body: { comment_view: created } }))

    await expect(addComment('abc', 7, 'Nice')).resolves.toEqual(created)
    expect(requestTo(fetchMock, 'comment')?.body).toEqual({ post_id: 7, content: 'Nice' })
  })

  it('posts a reply to another comment', async () => {
    const fetchMock = mockFetch(() => ({ body: { comment_view: makeComment(4, '0.3.4') } }))
    await addComment('abc', 7, 'Agreed', 3)
    expect(requestTo(fetchMock, 'comment')?.body).toEqual({ post_id: 7, content: 'Agreed', parent_id: 3 })
  })
})

describe('voteComment', () => {
  it('sends the vote and returns the updated comment', async () => {
    const updated = { ...makeComment(3, '0.3'), my_vote: -1 }
    const fetchMock = mockFetch(() => ({ body: { comment_view: updated } }))

    await expect(voteComment('abc', 3, -1)).resolves.toEqual(updated)
    expect(requestTo(fetchMock, 'comment/like')?.body).toEqual({ comment_id: 3, score: -1 })
  })
})
