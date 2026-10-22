import { useState } from 'react'
import styles from './Notice.module.css'

const LEMMY_URL = 'https://lemmy.world'
const DISMISSED_KEY = 'buddybobs:lemmy-notice-dismissed'

// Storage can be unavailable (private windows, blocked site data).
function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

// buddybobs.com used to be a Lemmy app, so accounts made there live on lemmy.world.
function Notice() {
  const [dismissed, setDismissed] = useState(wasDismissed)

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Still hidden for this visit.
    }
  }

  if (dismissed) return null

  return (
    <div className={styles.wrap}>
      <aside className={styles.notice} aria-labelledby="notice-title">
        <div className={styles.body}>
          <h2 id="notice-title" className={styles.title}>
            Made a BuddyBobs account before?
          </h2>
          <p className={styles.text}>
            BuddyBobs used to run on Lemmy, so any account made here back then
            was created on lemmy.world. Your account and everything you posted
            or sent are still there. BuddyBobs now uses Bluesky, so that login
            won’t work here.
          </p>
        </div>
        <div className={styles.actions}>
          <a className={styles.link} href={LEMMY_URL} target="_blank" rel="noopener noreferrer">
            Go to lemmy.world
          </a>
          <button type="button" className={styles.dismiss} onClick={dismiss} aria-label="Dismiss notice">
            ×
          </button>
        </div>
      </aside>
    </div>
  )
}

export default Notice
