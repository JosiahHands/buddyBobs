import { useEffect, useRef, useState } from 'react'
import type { Ref, SubmitEvent } from 'react'
import { logIn, signUp } from '../../bluesky/bluesky'
import styles from './LoginDialog.module.css'

type Status = 'idle' | 'loading' | 'failed'

function LoginDialog({ ref }: { ref: Ref<HTMLDialogElement> }) {
  const [handle, setHandle] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string>()
  const attempt = useRef(0)

  // Pressing back on Bluesky restores this page as it was, stuck on
  // "Redirecting…", and the abandoned attempt rejects a few seconds later.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (!e.persisted) return
      attempt.current++
      setStatus('idle')
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  // Either one redirects to Bluesky; it only returns here if that fails.
  async function redirect(go: () => Promise<unknown>) {
    const id = ++attempt.current
    setStatus('loading')
    try {
      await go()
    } catch (e) {
      if (id !== attempt.current) return
      setError((e as Error).message)
      setStatus('failed')
    }
  }

  function submit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    redirect(() => logIn(handle))
  }

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby="login-title"
      onClose={() => setStatus('idle')}
    >
      <form className={styles.form} onSubmit={submit}>
        <h2 id="login-title" className={styles.title}>
          Log in with Bluesky
        </h2>
        <p className={styles.text}>
          BuddyBobs uses your Bluesky account. You’ll confirm on Bluesky, then
          come right back.
        </p>

        <label className={styles.label}>
          Handle
          <input
            className={styles.input}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="alice.bsky.social"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
        </label>

        {status === 'failed' && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={(e) => e.currentTarget.closest('dialog')?.close()}
          >
            Cancel
          </button>
          <button type="submit" className={styles.primary} disabled={status === 'loading'}>
            {status === 'loading' ? 'Redirecting…' : 'Log in'}
          </button>
        </div>

        <p className={styles.footnote}>
          New to Bluesky?{' '}
          <button
            type="button"
            className={styles.link}
            onClick={() => redirect(signUp)}
            disabled={status === 'loading'}
          >
            Create an account
          </button>
        </p>
      </form>
    </dialog>
  )
}

export default LoginDialog
