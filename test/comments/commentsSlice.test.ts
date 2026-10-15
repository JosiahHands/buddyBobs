import { describe, expect, it } from '@jest/globals'
import { fetchPostComments, postComment, voteOnComment } from '../../src/comments/commentsSlice.ts'
import { logIn, logOut, signUp } from '../../src/login/authSlice.ts'
import { makeStore } from '../../src/store.ts'
import { loggedIn, makeComment, mockFetch, requestTo } from '../testUtils.ts'

describe('fetchPostComments', () => {
  it('loads a post’s comments with the user’s token', async () => {
    const comments = [makeComment(1, '0.1')]
    const fetchMock = mockFetch(() => ({ body: { comments } }))
    const store = makeStore(loggedIn())

    await store.dispatch(fetchPostComments(7))
    expect(store.getState().comments.byPostId[7]).toEqual({ items: comments, status: 'succeeded', error: null })
    expect(requestTo(fetchMock, 'comment/list')?.headers.Authorization).toBe('Bearer test-token')
  })

  it('records the error when loading fails', async () => {
    mockFetch(() => ({ status: 500 }))
    const store = makeStore()

    await store.dispatch(fetchPostComments(7))
    expect(store.getState().comments.byPostId[7]).toMatchObject({ status: 'failed', error: 'Lemmy request failed: 500' })
  })

  it('doesn’t reload comments it already has', async () => {
    const fetchMock = mockFetch(() => ({ body: { comments: [] } }))
    const store = makeStore()

    await store.dispatch(fetchPostComments(7))
    await store.dispatch(fetchPostComments(7))
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('postComment', () => {
  it('puts the new comment at the top of the thread', async () => {
    mockFetch((url) =>
      url.includes('comment/list')
        ? { body: { comments: [makeComment(1, '0.1')] } }
        : { body: { comment_view: makeComment(2, '0.2') } },
    )
    const store = makeStore(loggedIn())
    await store.dispatch(fetchPostComments(7))

    await store.dispatch(postComment({ postId: 7, content: 'Nice' }))
    expect(store.getState().comments.byPostId[7].items.map((item) => item.comment.id)).toEqual([2, 1])
  })

  it('is fine when the thread hasn’t been opened', async () => {
    mockFetch(() => ({ body: { comment_view: makeComment(2, '0.2') } }))
    const store = makeStore(loggedIn())

    await store.dispatch(postComment({ postId: 7, content: 'Nice' }))
    expect(store.getState().comments.byPostId[7]).toBeUndefined()
  })

  it('needs a login', async () => {
    const result = await makeStore().dispatch(postComment({ postId: 7, content: 'Nice' }))
    expect(result).toMatchObject({ error: { message: 'not_logged_in' } })
  })
})

describe('voteOnComment', () => {
  it('swaps in the comment Lemmy sends back', async () => {
    mockFetch((url) =>
      url.includes('comment/list')
        ? { body: { comments: [makeComment(1, '0.1'), makeComment(2, '0.2')] } }
        : { body: { comment_view: { ...makeComment(2, '0.2'), my_vote: 1 } } },
    )
    const store = makeStore(loggedIn())
    await store.dispatch(fetchPostComments(7))

    await store.dispatch(voteOnComment({ postId: 7, commentId: 2, score: 1 }))
    expect(store.getState().comments.byPostId[7].items[1].my_vote).toBe(1)
  })

  it('ignores replies for threads or comments it doesn’t have', async () => {
    mockFetch((url) =>
      url.includes('comment/list')
        ? { body: { comments: [makeComment(1, '0.1')] } }
        : { body: { comment_view: makeComment(9, '0.9') } },
    )
    const store = makeStore(loggedIn())
    await store.dispatch(voteOnComment({ postId: 7, commentId: 9, score: 1 }))
    expect(store.getState().comments.byPostId[7]).toBeUndefined()

    await store.dispatch(fetchPostComments(7))
    await store.dispatch(voteOnComment({ postId: 7, commentId: 9, score: 1 }))
    expect(store.getState().comments.byPostId[7].items.map((item) => item.comment.id)).toEqual([1])
  })
})

describe('logging in or out', () => {
  const user = { jwt: 'abc', username: 'bob' }
  const form = { username: 'bob', password: 'secret-password', password_verify: 'secret-password' }

  it.each([
    ['log in', logIn.fulfilled(user, 'r1', { usernameOrEmail: 'bob', password: 'secret-password' })],
    ['sign up', signUp.fulfilled({ ...user, verifyEmailSent: false, applicationCreated: false }, 'r2', form)],
    ['log out', logOut.fulfilled(undefined, 'r3')],
  ])('clears loaded threads on %s so votes reload', async (_, action) => {
    mockFetch(() => ({ body: { comments: [makeComment(1, '0.1')] } }))
    const store = makeStore()
    await store.dispatch(fetchPostComments(7))

    store.dispatch(action)
    expect(store.getState().comments.byPostId).toEqual({})
  })
})
