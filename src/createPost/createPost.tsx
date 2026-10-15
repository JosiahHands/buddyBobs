import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../store.ts'
import { publishPost } from '../main/postsSlice.ts'
import { searchCommunities, type CommunityView } from '../lemmy/createPost.ts'
import { actionError } from '../lemmy/errors.ts'
import styles from './createPost.module.css'

// c/name for lemmy.world communities, c/name@instance for ones hosted elsewhere
function communityLabel({ community }: CommunityView) {
  if (community.local) return `c/${community.name}`
  return `c/${community.name}@${new URL(community.actor_id).host}`
}

type PickerProps = {
  selected: CommunityView | null
  onSelect: (community: CommunityView | null) => void
}

function CommunityPicker({ selected, onSelect }: PickerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CommunityView[]>([])
  const [error, setError] = useState<string | null>(null)

  // Search once the user pauses typing, not on every key; ignore replies that arrive late
  useEffect(() => {
    const search = query.trim()
    if (!search) return
    let current = true
    const timer = setTimeout(() => {
      searchCommunities(search)
        .then((found) => {
          if (!current) return
          setResults(found)
          setError(null)
        })
        .catch(() => {
          if (current) setError('Couldn’t search communities. Try again.')
        })
    }, 300)
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [query])

  if (selected) {
    return (
      <div className={styles.field}>
        <span className={styles.fieldLabel}>Community</span>
        <div className={styles.chosen}>
          <span>
            Posting to <strong>{communityLabel(selected)}</strong>
          </span>
          <button type="button" className={styles.link} onClick={() => onSelect(null)}>
            Change
          </button>
        </div>
      </div>
    )
  }

  const shown = query.trim() ? results : []

  return (
    <div className={styles.field}>
      <label>
        Community
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search, e.g. technology"
          autoComplete="off"
        />
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {shown.length > 0 && (
        <ul className={styles.results} aria-label="Matching communities">
          {shown.map((view) => {
            const modsOnly = view.community.posting_restricted_to_mods
            return (
              <li key={view.community.id}>
                <button
                  type="button"
                  className={styles.result}
                  disabled={modsOnly}
                  onClick={() => onSelect(view)}
                >
                  <span className={styles.resultName}>{communityLabel(view)}</span>
                  <span className={styles.resultMeta}>
                    {view.counts.subscribers.toLocaleString()} members{modsOnly ? ' · mods only' : ''}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PostForm({ onDone }: { onDone: () => void }) {
  const dispatch = useAppDispatch()
  const [community, setCommunity] = useState<CommunityView | null>(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [body, setBody] = useState('')
  const [nsfw, setNsfw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (!community) {
      setError('Pick a community to post in.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await dispatch(
        publishPost({
          community_id: community.community.id,
          name: title.trim(),
          url: url.trim() || undefined,
          body: body.trim() || undefined,
          nsfw: nsfw || undefined,
        }),
      ).unwrap()
      onDone()
    } catch (err) {
      setError(actionError((err as Error).message))
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <CommunityPicker selected={community} onSelect={setCommunity} />
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
      </label>
      <label>
        Link (optional)
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
      </label>
      <label>
        Text (optional)
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} />
      </label>
      <label className={styles.check}>
        <input type="checkbox" checked={nsfw} onChange={(e) => setNsfw(e.target.checked)} />
        Mark as NSFW
      </label>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={styles.submit} disabled={busy}>
        {busy ? 'Posting…' : 'Post'}
      </button>
    </form>
  )
}

function CreatePost() {
  const loggedIn = useAppSelector((state) => Boolean(state.auth.jwt))
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function start() {
    if (!loggedIn) {
      setNote('Log in to create a post.')
      return
    }
    setNote(null)
    setOpen(true)
  }

  return (
    <div className={styles.createPost}>
      {note && (
        <span className={styles.note} role="alert">
          {note}
        </span>
      )}
      <button type="button" className={styles.button} onClick={start}>
        Create post
      </button>
      <dialog
        ref={ref}
        className={styles.dialog}
        onClose={() => setOpen(false)}
        aria-labelledby="create-post-title"
      >
        {open && (
          <>
            <div className={styles.top}>
              <h2 id="create-post-title" className={styles.title}>
                Create a post
              </h2>
              <button type="button" className={styles.link} onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <PostForm onDone={() => setOpen(false)} />
          </>
        )}
      </dialog>
    </div>
  )
}

export default CreatePost
