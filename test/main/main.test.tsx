import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { act, fireEvent, screen } from '@testing-library/react'
import Main from '../../src/main/main.tsx'
import { logIn } from '../../src/login/authSlice.ts'
import { deferred, loggedIn, makePost, mockFetch, renderWithStore, requestTo } from '../testUtils.ts'

const scrollTo = jest.fn()

beforeEach(() => {
  window.scrollTo = scrollTo as typeof window.scrollTo
  scrollTo.mockClear()
})

afterEach(() => {
  jest.restoreAllMocks()
})

// jsdom has no matchMedia; pretend the user does (or doesn't) prefer less motion
function prefersReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({ matches: reduce, media: query })) as typeof window.matchMedia
}

// Page one has posts 1-2 and a cursor; page two has post 3 and no more pages
function twoPages(url: string) {
  if (!url.includes('post/list')) return undefined
  if (url.includes('page_cursor')) return { body: { posts: [makePost(3)] } }
  return { body: { posts: [makePost(1, { body: 'First post text' }), makePost(2)], next_page: 'cursor-2' } }
}

describe('Main', () => {
  it('shows loading, then the posts', async () => {
    const reply = deferred()
    mockFetch((url) => ({ ...twoPages(url), wait: reply.promise }))
    renderWithStore(<Main />)

    expect(screen.getByRole('heading', { name: 'Latest posts' })).toBeInTheDocument()
    expect(screen.getByText('Loading…')).toBeInTheDocument()

    reply.release()
    expect(await screen.findByRole('heading', { name: 'Post 1' })).toBeInTheDocument()
    expect(screen.getByText('First post text')).toBeInTheDocument()
    expect(screen.getByText(/c\/memes · @poster1/)).toBeInTheDocument()
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('says when the feed can’t load', async () => {
    mockFetch(() => ({ status: 500 }))
    renderWithStore(<Main />)
    expect(await screen.findByText('Couldn’t load posts: Lemmy request failed: 500')).toBeInTheDocument()
  })

  it('shows post images and hides ones that fail to load', async () => {
    mockFetch(() => ({
      body: { posts: [makePost(1, { url: 'https://img/pig.jpg', url_content_type: 'image/jpeg', alt_text: 'A pig' })] },
    }))
    renderWithStore(<Main />)

    const image = await screen.findByRole('img', { name: 'A pig' })
    expect(image).toHaveAttribute('src', 'https://img/pig.jpg')
    fireEvent.error(image)
    expect(image).not.toBeVisible()
  })

  it('loads 20 more posts, then offers a way back to the top', async () => {
    prefersReducedMotion(false)
    mockFetch(twoPages)
    const { user } = renderWithStore(<Main />)
    await screen.findByRole('heading', { name: 'Post 1' })
    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'View more' }))
    expect(await screen.findByRole('heading', { name: 'Post 3' })).toBeInTheDocument()
    // Page two was the last, so there's nothing more to load
    expect(screen.queryByRole('button', { name: 'View more' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to top' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('jumps to the top without animation for users who prefer less motion', async () => {
    prefersReducedMotion(true)
    mockFetch(twoPages)
    const { user } = renderWithStore(<Main />)
    await user.click(await screen.findByRole('button', { name: 'View more' }))

    await user.click(await screen.findByRole('button', { name: 'Back to top' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('shows progress and errors when loading more', async () => {
    const pageTwo = deferred()
    mockFetch((url) =>
      url.includes('page_cursor') ? { status: 500, wait: pageTwo.promise } : twoPages(url),
    )
    const { user } = renderWithStore(<Main />)
    await user.click(await screen.findByRole('button', { name: 'View more' }))

    expect(screen.getByRole('button', { name: 'Loading…' })).toBeDisabled()
    pageTwo.release()
    expect(await screen.findByText('Couldn’t load more posts: Lemmy request failed: 500')).toBeInTheDocument()
  })

  it('saves votes on posts', async () => {
    const fetchMock = mockFetch((url) =>
      url.includes('post/like')
        ? { body: { post_view: { ...makePost(1), counts: { score: 11, comments: 2 }, my_vote: 1 } } }
        : twoPages(url),
    )
    const { user } = renderWithStore(<Main />, loggedIn())
    await screen.findByRole('heading', { name: 'Post 1' })

    await user.click(screen.getAllByRole('button', { name: 'Upvote' })[0])
    expect(await screen.findByText('11')).toBeInTheDocument()
    expect(requestTo(fetchMock, 'post/like')?.body).toEqual({ post_id: 1, score: 1 })
  })

  it('reloads the feed after logging in so the user’s votes show', async () => {
    const fetchMock = mockFetch(twoPages)
    const { store } = renderWithStore(<Main />)
    await screen.findByRole('heading', { name: 'Post 1' })

    await act(async () => {
      store.dispatch(logIn.fulfilled({ jwt: 'abc', username: 'bob' }, 'r1', { usernameOrEmail: 'bob', password: 'x' }))
    })
    const loads = fetchMock.mock.calls.filter(([url]) => String(url).includes('post/list'))
    expect(loads).toHaveLength(2)
  })
})
