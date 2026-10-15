import { describe, expect, it, jest } from '@jest/globals'
import { screen, waitFor } from '@testing-library/react'
import Votes from '../../src/votes/votes.tsx'
import { deferred, loggedIn, renderWithStore, withSite } from '../testUtils.ts'

type OnVote = (score: number) => Promise<unknown>

function renderVotes(
  props: { myVote?: number; onVote?: OnVote } = {},
  state = { ...loggedIn(), ...withSite() },
) {
  const onVote = jest.fn<OnVote>(props.onVote ?? (() => Promise.resolve()))
  const result = renderWithStore(<Votes score={12} myVote={props.myVote} onVote={onVote} />, state)
  return { ...result, onVote }
}

describe('Votes', () => {
  it('shows the score and both arrows', () => {
    renderVotes()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upvote' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Downvote' })).toBeInTheDocument()
  })

  it('marks the current vote as pressed', () => {
    renderVotes({ myVote: 1 })
    expect(screen.getByRole('button', { name: 'Upvote' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Downvote' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('asks logged-out users to log in instead of voting', async () => {
    const { user, onVote } = renderVotes({}, {})
    await user.click(screen.getByRole('button', { name: 'Upvote' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Log in to vote.')
    expect(onVote).not.toHaveBeenCalled()
  })

  it('upvotes and downvotes', async () => {
    const { user, onVote } = renderVotes()
    await user.click(screen.getByRole('button', { name: 'Upvote' }))
    await user.click(screen.getByRole('button', { name: 'Downvote' }))
    expect(onVote.mock.calls).toEqual([[1], [-1]])
  })

  it('takes the vote back when the same arrow is clicked again', async () => {
    const { user, onVote } = renderVotes({ myVote: -1 })
    await user.click(screen.getByRole('button', { name: 'Downvote' }))
    expect(onVote).toHaveBeenCalledWith(0)
  })

  it('locks the arrows while a vote is being saved', async () => {
    const saving = deferred()
    const { user } = renderVotes({ onVote: () => saving.promise })

    await user.click(screen.getByRole('button', { name: 'Upvote' }))
    expect(screen.getByRole('button', { name: 'Upvote' })).toBeDisabled()

    saving.release()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Upvote' })).toBeEnabled())
  })

  it('explains why a vote failed', async () => {
    const onVote = jest.fn<OnVote>(() => Promise.reject(new Error('incorrect_login')))
    const { user } = renderVotes({ onVote })

    await user.click(screen.getByRole('button', { name: 'Upvote' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Your login expired. Log in again.')
  })

  it('hides the downvote arrow when the instance turns downvotes off', () => {
    renderVotes({}, { ...loggedIn(), ...withSite({ enable_downvotes: false }) })
    expect(screen.queryByRole('button', { name: 'Downvote' })).not.toBeInTheDocument()
  })
})
