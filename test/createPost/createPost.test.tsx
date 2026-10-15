import { describe, expect, it } from '@jest/globals'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import CreatePost from '../../src/createPost/createPost.tsx'
import {
  deferred,
  loggedIn,
  makeCommunity,
  makePost,
  mockFetch,
  renderWithStore,
  requestTo,
} from '../testUtils.ts'

const communities = [
  makeCommunity(1, 'technology'),
  makeCommunity(2, 'technology', { local: false, actor_id: 'https://lemmy.ml/c/technology' }),
  makeCommunity(3, 'announcements', { posting_restricted_to_mods: true }),
]

// Search finds the communities above; creating a post echoes back the title sent
function fakeLemmy(postReply?: object) {
  return mockFetch((url, init) => {
    if (url.includes('/search')) return { body: { communities } }
    if (url.split('?')[0].endsWith('/post')) {
      const sent = JSON.parse(String(init?.body))
      return postReply ?? { body: { post_view: makePost(9, { name: sent.name }) } }
    }
  })
}

async function openForm() {
  const result = renderWithStore(<CreatePost />, loggedIn())
  await result.user.click(screen.getByRole('button', { name: 'Create post' }))
  return result
}

async function pickCommunity(user: Awaited<ReturnType<typeof openForm>>['user'], name = 'c/technology') {
  await user.type(screen.getByRole('searchbox', { name: 'Community' }), 'tech')
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${name} `) }))
}

describe('CreatePost', () => {
  it('asks logged-out users to log in first', async () => {
    const { user } = renderWithStore(<CreatePost />)
    await user.click(screen.getByRole('button', { name: 'Create post' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Log in to create a post.')
    expect(screen.queryByRole('heading', { name: 'Create a post' })).not.toBeInTheDocument()
  })

  it('opens a form and closes it with Close or Escape', async () => {
    const { user, container } = await openForm()
    const dialog = container.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(screen.getByRole('heading', { name: 'Create a post' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(dialog.open).toBe(false)
    expect(screen.queryByRole('heading', { name: 'Create a post' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create post' }))
    fireEvent(dialog, new Event('close'))
    expect(screen.queryByRole('heading', { name: 'Create a post' })).not.toBeInTheDocument()
  })

  it('searches communities as you type', async () => {
    const fetchMock = fakeLemmy()
    const { user } = await openForm()

    await user.type(screen.getByRole('searchbox', { name: 'Community' }), 'tech')
    const results = await screen.findByRole('list', { name: 'Matching communities' })

    expect(results).toHaveTextContent('c/technology')
    expect(results).toHaveTextContent('c/technology@lemmy.ml')
    expect(results).toHaveTextContent('2,000 members')
    expect(screen.getByRole('button', { name: /c\/announcements .*mods only/ })).toBeDisabled()
    // Typing four letters quickly sends one search, not four
    const searches = fetchMock.mock.calls.filter(([url]) => String(url).includes('/search'))
    expect(searches).toHaveLength(1)
    expect(String(searches[0][0])).toContain('q=tech')
  })

  it('hides results when the search box is cleared', async () => {
    fakeLemmy()
    const { user } = await openForm()
    const search = screen.getByRole('searchbox', { name: 'Community' })

    await user.type(search, 'tech')
    await screen.findByRole('list', { name: 'Matching communities' })
    await user.clear(search)
    expect(screen.queryByRole('list', { name: 'Matching communities' })).not.toBeInTheDocument()
  })

  it('ignores search results that arrive after the user has typed more', async () => {
    const slow = deferred()
    mockFetch((url) => {
      if (url.includes('q=te&')) return { body: { communities: [makeCommunity(5, 'tea')] }, wait: slow.promise }
      return { body: { communities: [makeCommunity(1, 'technology')] } }
    })
    const { user } = await openForm()
    const search = screen.getByRole('searchbox', { name: 'Community' })

    await user.type(search, 'te')
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1))
    await user.type(search, 'ch')
    await screen.findByRole('button', { name: /^c\/technology / })

    slow.release()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText('c/tea')).not.toBeInTheDocument()
  })

  it('says when the search fails', async () => {
    mockFetch(() => ({ status: 500 }))
    const { user } = await openForm()

    await user.type(screen.getByRole('searchbox', { name: 'Community' }), 'tech')
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t search communities.')
  })

  it('lets you pick a community and change your mind', async () => {
    fakeLemmy()
    const { user } = await openForm()

    await pickCommunity(user, 'c/technology@lemmy.ml')
    expect(screen.getByText(/Posting to/)).toHaveTextContent('Posting to c/technology@lemmy.ml')

    await user.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByRole('searchbox', { name: 'Community' })).toBeInTheDocument()
  })

  it('needs a community before posting', async () => {
    const fetchMock = fakeLemmy()
    const { user } = await openForm()

    await user.type(screen.getByLabelText('Title'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Post' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Pick a community to post in.')
    expect(requestTo(fetchMock, 'post')).toBeUndefined()
  })

  it('creates the post, closes, and adds it to the top of the feed', async () => {
    const fetchMock = fakeLemmy()
    const { user, store, container } = await openForm()

    await pickCommunity(user)
    await user.type(screen.getByLabelText('Title'), '  My first post  ')
    await user.type(screen.getByLabelText('Link (optional)'), 'https://example.com')
    await user.type(screen.getByLabelText('Text (optional)'), 'Hello everyone')
    await user.click(screen.getByLabelText('Mark as NSFW'))
    await user.click(screen.getByRole('button', { name: 'Post' }))

    await waitFor(() => expect((container.querySelector('dialog') as HTMLDialogElement).open).toBe(false))
    expect(requestTo(fetchMock, 'post')?.body).toEqual({
      community_id: 1,
      name: 'My first post',
      url: 'https://example.com',
      body: 'Hello everyone',
      nsfw: true,
    })
    expect(store.getState().posts.items[0].post.name).toBe('My first post')
  })

  it('only sends the fields that were filled in', async () => {
    const fetchMock = fakeLemmy()
    const { user } = await openForm()

    await pickCommunity(user)
    await user.type(screen.getByLabelText('Title'), 'Just a title')
    await user.click(screen.getByRole('button', { name: 'Post' }))

    await waitFor(() => expect(requestTo(fetchMock, 'post')).toBeDefined())
    expect(requestTo(fetchMock, 'post')?.body).toEqual({ community_id: 1, name: 'Just a title' })
  })

  it('shows progress, then explains why a post failed and keeps the form open', async () => {
    const reply = deferred()
    fakeLemmy({ status: 400, body: { error: 'only_mods_can_post_in_community' }, wait: reply.promise })
    const { user } = await openForm()

    await pickCommunity(user)
    await user.type(screen.getByLabelText('Title'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Post' }))
    expect(screen.getByRole('button', { name: 'Posting…' })).toBeDisabled()

    reply.release()
    expect(await screen.findByRole('alert')).toHaveTextContent('Only moderators can post in this community.')
    expect(screen.getByRole('button', { name: 'Post' })).toBeEnabled()
    expect(screen.getByLabelText('Title')).toHaveValue('Hello')
  })
})
