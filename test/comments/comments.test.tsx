import { describe, expect, it } from '@jest/globals'
import { act, fireEvent, screen, within } from '@testing-library/react'
import Comments from '../../src/comments/comments.tsx'
import { logOut } from '../../src/login/authSlice.ts'
import { deferred, loggedIn, makeComment, mockFetch, renderWithStore, requestTo } from '../testUtils.ts'

const thread = [
  makeComment(1, '0.1'),
  makeComment(2, '0.1.2'),
  makeComment(3, '0.3', { deleted: true }),
  makeComment(4, '0.4', { removed: true }),
]

function commentsReply(comments = thread) {
  return (url: string) => (url.includes('comment/list') ? { body: { comments } } : undefined)
}

describe('Comments', () => {
  it('shows the count and anything passed in beside the button', () => {
    renderWithStore(
      <Comments postId={7} count={3}>
        <span>votes here</span>
      </Comments>,
    )
    expect(screen.getByRole('button', { name: 'View comments (3)' })).toBeInTheDocument()
    expect(screen.getByText('votes here')).toBeInTheDocument()
  })

  it('opens into threads with replies nested under their parent', async () => {
    mockFetch(commentsReply())
    const { user } = renderWithStore(<Comments postId={7} count={4} />)

    await user.click(screen.getByRole('button', { name: 'View comments (4)' }))
    const first = (await screen.findByText('Comment 1')).closest('li') as HTMLElement
    expect(within(first).getByText('Comment 2')).toBeInTheDocument()
    expect(screen.getByText('[deleted]')).toBeInTheDocument()
    expect(screen.getByText('[removed]')).toBeInTheDocument()
    expect(screen.getByText(/@commenter1/)).toBeInTheDocument()
  })

  it('closes again', async () => {
    mockFetch(commentsReply())
    const { user } = renderWithStore(<Comments postId={7} count={4} />)

    await user.click(screen.getByRole('button', { name: 'View comments (4)' }))
    await screen.findByText('Comment 1')
    await user.click(screen.getByRole('button', { name: 'Hide comments' }))
    expect(screen.queryByText('Comment 1')).not.toBeInTheDocument()
  })

  it('says when there are no comments', async () => {
    mockFetch(commentsReply([]))
    const { user } = renderWithStore(<Comments postId={7} count={0} />)

    await user.click(screen.getByRole('button', { name: 'View comments (0)' }))
    expect(await screen.findByText('No comments yet')).toBeInTheDocument()
  })

  it('shows loading, then an error if comments can’t load', async () => {
    const reply = deferred()
    mockFetch(() => ({ status: 500, wait: reply.promise }))
    const { user } = renderWithStore(<Comments postId={7} count={4} />)

    await user.click(screen.getByRole('button', { name: 'View comments (4)' }))
    expect(screen.getByText('Loading comments…')).toBeInTheDocument()

    reply.release()
    expect(await screen.findByText('Couldn’t load comments: Lemmy request failed: 500')).toBeInTheDocument()
  })

  it('asks logged-out users to log in before commenting', async () => {
    mockFetch(commentsReply())
    const { user } = renderWithStore(<Comments postId={7} count={4} />)

    await user.click(screen.getByRole('button', { name: 'View comments (4)' }))
    expect(screen.getByText('Log in to join the conversation.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Add a comment' })).not.toBeInTheDocument()
  })

  it('lets logged-in users post a comment', async () => {
    const fetchMock = mockFetch((url) =>
      url.includes('comment/list')
        ? { body: { comments: thread } }
        : { body: { comment_view: makeComment(5, '0.5', { content: 'Great post' }) } },
    )
    const { user } = renderWithStore(<Comments postId={7} count={4} />, loggedIn())
    await user.click(screen.getByRole('button', { name: 'View comments (4)' }))
    await screen.findByText('Comment 1')

    const box = screen.getByRole('textbox', { name: 'Add a comment' })
    expect(screen.getByRole('button', { name: 'Post' })).toBeDisabled()
    await user.type(box, '  Great post  ')
    await user.click(screen.getByRole('button', { name: 'Post' }))

    expect(await screen.findByText('Great post')).toBeInTheDocument()
    expect(box).toHaveValue('')
    expect(requestTo(fetchMock, 'comment')?.body).toEqual({ post_id: 7, content: 'Great post' })
  })

  it('ignores a comment that is only spaces', async () => {
    const fetchMock = mockFetch(commentsReply())
    const { user } = renderWithStore(<Comments postId={7} count={4} />, loggedIn())
    await user.click(screen.getByRole('button', { name: 'View comments (4)' }))

    const box = screen.getByRole('textbox', { name: 'Add a comment' })
    await user.type(box, '   ')
    fireEvent.submit(box.closest('form') as HTMLFormElement)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('explains why a comment couldn’t be posted', async () => {
    mockFetch((url) =>
      url.includes('comment/list') ? { body: { comments: thread } } : { status: 400, body: { error: 'locked' } },
    )
    const { user } = renderWithStore(<Comments postId={7} count={4} />, loggedIn())
    await user.click(screen.getByRole('button', { name: 'View comments (4)' }))

    await user.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Post' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('This post is locked')
  })

  it('votes on a comment', async () => {
    const fetchMock = mockFetch((url) =>
      url.includes('comment/list')
        ? { body: { comments: [makeComment(1, '0.1')] } }
        : { body: { comment_view: { ...makeComment(1, '0.1'), counts: { score: 2, child_count: 0 }, my_vote: 1 } } },
    )
    const { user } = renderWithStore(<Comments postId={7} count={1} />, loggedIn())
    await user.click(screen.getByRole('button', { name: 'View comments (1)' }))
    await screen.findByText('Comment 1')

    await user.click(screen.getByRole('button', { name: 'Upvote' }))
    expect(await screen.findByText('2')).toBeInTheDocument()
    expect(requestTo(fetchMock, 'comment/like')?.body).toEqual({ comment_id: 1, score: 1 })
  })

  it('reloads an open thread after logging out so votes are right', async () => {
    const fetchMock = mockFetch(commentsReply())
    const { user, store } = renderWithStore(<Comments postId={7} count={4} />, loggedIn())
    await user.click(screen.getByRole('button', { name: 'View comments (4)' }))
    await screen.findByText('Comment 1')

    act(() => {
      store.dispatch(logOut.fulfilled(undefined, 'r1'))
    })
    await screen.findByText('Comment 1')
    const loads = fetchMock.mock.calls.filter(([url]) => String(url).includes('comment/list'))
    expect(loads).toHaveLength(2)
  })
})
