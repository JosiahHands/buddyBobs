import { useEffect, useMemo, useState, type ReactNode, type SubmitEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../store.ts'
import { fetchPostComments, postComment, voteOnComment } from './commentsSlice.ts'
import type { CommentView } from '../lemmy/postComments.ts'
import { actionError } from '../lemmy/errors.ts'
import { timeAgo } from '../utils/timeAgo.ts'
import Votes from '../votes/votes.tsx'
import styles from './comments.module.css'

type CommentNode = CommentView & { replies: CommentNode[] }

// Lemmy sends a flat list; rebuild the reply tree from each comment's path
function buildTree(comments: CommentView[]) {
  const nodes = new Map<number, CommentNode>()
  comments.forEach((c) => nodes.set(c.comment.id, { ...c, replies: [] }))

  const roots: CommentNode[] = []
  nodes.forEach((node) => {
    const ids = node.comment.path.split('.')
    const parent = nodes.get(Number(ids[ids.length - 2]))
    if (parent) parent.replies.push(node)
    else roots.push(node)
  })
  return roots
}

function CommentItem({ node, postId }: { node: CommentNode; postId: number }) {
  const dispatch = useAppDispatch()
  const loggedIn = useAppSelector((state) => Boolean(state.auth.jwt))
  const [replying, setReplying] = useState(false)
  const { comment, creator, counts } = node

  let content = comment.content
  if (comment.deleted) content = '[deleted]'
  if (comment.removed) content = '[removed]'
  const canReply = loggedIn && !comment.deleted && !comment.removed

  return (
    <li>
      <div className={styles.comment}>
        <p className={styles.meta}>
          @{creator.name} · {timeAgo(comment.published)}
        </p>
        <p className={styles.content}>{content}</p>
        <div className={styles.actions}>
          <Votes
            score={counts.score}
            myVote={node.my_vote}
            onVote={(score) => dispatch(voteOnComment({ postId, commentId: comment.id, score })).unwrap()}
          />
          {canReply && (
            <button
              type="button"
              className={styles.replyButton}
              aria-expanded={replying}
              onClick={() => setReplying(!replying)}
            >
              Reply
            </button>
          )}
        </div>
        {replying && (
          <CommentForm
            postId={postId}
            parentId={comment.id}
            label={`Reply to @${creator.name}`}
            onDone={() => setReplying(false)}
          />
        )}
      </div>
      {node.replies.length > 0 && (
        <ul className={styles.replies}>
          {node.replies.map((reply) => (
            <CommentItem key={reply.comment.id} node={reply} postId={postId} />
          ))}
        </ul>
      )}
    </li>
  )
}

type CommentFormProps = {
  postId: number
  // Set when replying to a comment instead of the post
  parentId?: number
  label?: string
  // Replies close their box once posted or cancelled
  onDone?: () => void
}

function CommentForm({ postId, parentId, label = 'Add a comment', onDone }: CommentFormProps) {
  const dispatch = useAppDispatch()
  const loggedIn = useAppSelector((state) => Boolean(state.auth.jwt))
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    const text = content.trim()
    if (!text) return
    setBusy(true)
    setError(null)
    try {
      await dispatch(postComment({ postId, content: text, parentId })).unwrap()
      setContent('')
      onDone?.()
    } catch (err) {
      setError(actionError((err as Error).message))
    }
    setBusy(false)
  }

  if (!loggedIn) return <p className={styles.status}>Log in to join the conversation.</p>

  return (
    <form className={styles.form} onSubmit={submit}>
      <textarea
        className={styles.input}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={label}
        aria-label={label}
        rows={2}
        // Replies open because the user just clicked Reply, so jump straight in
        autoFocus={parentId !== undefined}
      />
      <div className={styles.formRow}>
        {error && (
          <span className={styles.formError} role="alert">
            {error}
          </span>
        )}
        {onDone && (
          <button type="button" className={styles.replyButton} onClick={onDone}>
            Cancel
          </button>
        )}
        <button type="submit" className={styles.toggle} disabled={busy || !content.trim()}>
          {busy ? 'Posting…' : parentId ? 'Post reply' : 'Post'}
        </button>
      </div>
    </form>
  )
}

// children sit beside the toggle button, e.g. the post's vote buttons
function Comments({ postId, count, children }: { postId: number; count: number; children?: ReactNode }) {
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(false)
  const thread = useAppSelector((state) => state.comments.byPostId[postId])
  const items = thread?.items
  const tree = useMemo(() => buildTree(items ?? []), [items])

  // Threads are cleared on login/logout so votes reload; refetch if one is open
  useEffect(() => {
    if (open && !thread) dispatch(fetchPostComments(postId))
  }, [open, thread, postId, dispatch])

  function toggle() {
    if (!open) dispatch(fetchPostComments(postId))
    setOpen(!open)
  }

  return (
    <div className={styles.comments}>
      <div className={styles.bar}>
        {children}
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={toggle}>
          {open ? 'Hide comments' : `View comments (${count})`}
        </button>
      </div>
      {open && (
        <>
          <CommentForm postId={postId} />
          {thread?.status === 'loading' && <p className={styles.status}>Loading comments…</p>}
          {thread?.status === 'failed' && (
            <p className={styles.status}>Couldn’t load comments: {thread.error}</p>
          )}
          {thread?.status === 'succeeded' && tree.length === 0 && (
            <p className={styles.status}>No comments yet</p>
          )}
          {tree.length > 0 && (
            <ul className={styles.thread}>
              {tree.map((node) => (
                <CommentItem key={node.comment.id} node={node} postId={postId} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

export default Comments
