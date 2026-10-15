import { useState } from 'react'
import { useAppSelector } from '../store.ts'
import { actionError } from '../lemmy/errors.ts'
import styles from './votes.module.css'

type VotesProps = {
  score: number
  // 1 upvoted, -1 downvoted, 0 or missing for no vote
  myVote?: number
  // Gets 1, -1, or 0 to take the vote back
  onVote: (score: number) => Promise<unknown>
}

function Votes({ score, myVote = 0, onVote }: VotesProps) {
  const loggedIn = useAppSelector((state) => Boolean(state.auth.jwt))
  const allowDownvotes = useAppSelector((state) => state.site.view?.local_site.enable_downvotes ?? true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function vote(direction: 1 | -1) {
    if (!loggedIn) {
      setError('Log in to vote.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      // Clicking the same arrow again takes the vote back
      await onVote(myVote === direction ? 0 : direction)
    } catch (err) {
      setError(actionError((err as Error).message))
    }
    setBusy(false)
  }

  return (
    <div className={styles.votes}>
      <button
        type="button"
        className={myVote === 1 ? `${styles.arrow} ${styles.up}` : styles.arrow}
        aria-label="Upvote"
        aria-pressed={myVote === 1}
        disabled={busy}
        onClick={() => vote(1)}
      >
        ▲
      </button>
      <span className={styles.score}>{score}</span>
      {allowDownvotes && (
        <button
          type="button"
          className={myVote === -1 ? `${styles.arrow} ${styles.down}` : styles.arrow}
          aria-label="Downvote"
          aria-pressed={myVote === -1}
          disabled={busy}
          onClick={() => vote(-1)}
        >
          ▼
        </button>
      )}
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export default Votes
