import { describe, expect, it } from '@jest/globals'
import { fetchHomePosts, fetchMorePosts, publishPost, voteOnPost } from '../../src/main/postsSlice.ts'
import { postComment } from '../../src/comments/commentsSlice.ts'
import { makeStore } from '../../src/store.ts'
import { loggedIn, makeComment, makePost, mockFetch, requestTo } from '../testUtils.ts'

describe('fetchHomePosts', () => {
  it('loads the first page', async () => {
    mockFetch(() => ({ body: { posts: [makePost(1), makePost(2)], next_page: 'cursor-2' } }))
    const store = makeStore()

    await store.dispatch(fetchHomePosts())
    const { posts } = store.getState()
    expect(posts.status).toBe('succeeded')
    expect(posts.items.map((item) => item.post.id)).toEqual([1, 2])
    expect(posts.nextPage).toBe('cursor-2')
  })

  it('sends the token so the user’s votes come back', async () => {
    const fetchMock = mockFetch(() => ({ body: { posts: [] } }))
    await makeStore(loggedIn()).dispatch(fetchHomePosts())
    expect(requestTo(fetchMock, 'post/list')?.headers.Authorization).toBe('Bearer test-token')
  })

  it('records the error when loading fails', async () => {
    mockFetch(() => ({ status: 500 }))
    const store = makeStore()

    await store.dispatch(fetchHomePosts())
    expect(store.getState().posts).toMatchObject({ status: 'failed', error: 'Lemmy request failed: 500' })
  })

  it('doesn’t start a second request while one is loading', async () => {
    const fetchMock = mockFetch(() => ({ body: { posts: [] } }))
    const store = makeStore()

    await Promise.all([store.dispatch(fetchHomePosts()), store.dispatch(fetchHomePosts())])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('fetchMorePosts', () => {
  it('adds the next page and skips posts already shown', async () => {
    mockFetch((url) =>
      url.includes('page_cursor')
        ? { body: { posts: [makePost(2), makePost(3)] } }
        : { body: { posts: [makePost(1), makePost(2)], next_page: 'cursor-2' } },
    )
    const store = makeStore()
    await store.dispatch(fetchHomePosts())

    await store.dispatch(fetchMorePosts('cursor-2'))
    const { posts } = store.getState()
    expect(posts.items.map((item) => item.post.id)).toEqual([1, 2, 3])
    expect(posts.nextPage).toBeNull()
    expect(posts.moreStatus).toBe('idle')
  })

  it('records the error when loading more fails', async () => {
    mockFetch(() => ({ status: 500 }))
    const store = makeStore()

    await store.dispatch(fetchMorePosts('cursor-2'))
    expect(store.getState().posts).toMatchObject({ moreStatus: 'failed', error: 'Lemmy request failed: 500' })
  })
})

describe('voteOnPost', () => {
  it('swaps in the post Lemmy sends back', async () => {
    mockFetch((url) =>
      url.includes('post/like')
        ? { body: { post_view: { ...makePost(1), counts: { score: 11, comments: 2 }, my_vote: 1 } } }
        : { body: { posts: [makePost(1), makePost(2)] } },
    )
    const store = makeStore(loggedIn())
    await store.dispatch(fetchHomePosts())

    await store.dispatch(voteOnPost({ postId: 1, score: 1 }))
    const [first] = store.getState().posts.items
    expect(first.my_vote).toBe(1)
    expect(first.counts.score).toBe(11)
  })

  it('ignores a reply for a post that is no longer listed', async () => {
    mockFetch(() => ({ body: { post_view: makePost(99) } }))
    const store = makeStore(loggedIn())

    await store.dispatch(voteOnPost({ postId: 99, score: 1 }))
    expect(store.getState().posts.items).toEqual([])
  })

  it('needs a login', async () => {
    const result = await makeStore().dispatch(voteOnPost({ postId: 1, score: 1 }))
    expect(result).toMatchObject({ error: { message: 'not_logged_in' } })
  })
})

describe('publishPost', () => {
  it('puts the new post at the top of the feed', async () => {
    mockFetch((url) =>
      url.includes('post/list')
        ? { body: { posts: [makePost(1), makePost(2)] } }
        : { body: { post_view: makePost(9, { name: 'My first post' }) } },
    )
    const store = makeStore(loggedIn())
    await store.dispatch(fetchHomePosts())

    await store.dispatch(publishPost({ community_id: 3, name: 'My first post' }))
    expect(store.getState().posts.items.map((item) => item.post.id)).toEqual([9, 1, 2])
  })

  it('needs a login', async () => {
    const result = await makeStore().dispatch(publishPost({ community_id: 3, name: 'Hi' }))
    expect(result).toMatchObject({ error: { message: 'not_logged_in' } })
  })
})

describe('new comments', () => {
  it('bump the post’s comment count', async () => {
    mockFetch((url) =>
      url.includes('post/list') ? { body: { posts: [makePost(1)] } } : { body: { comment_view: makeComment(5, '0.5') } },
    )
    const store = makeStore(loggedIn())
    await store.dispatch(fetchHomePosts())

    await store.dispatch(postComment({ postId: 1, content: 'Nice' }))
    expect(store.getState().posts.items[0].counts.comments).toBe(3)
  })

  it('leave the feed alone if the post isn’t in it', async () => {
    mockFetch(() => ({ body: { comment_view: makeComment(5, '0.5') } }))
    const store = makeStore(loggedIn())

    await store.dispatch(postComment({ postId: 1, content: 'Nice' }))
    expect(store.getState().posts.items).toEqual([])
  })
})
