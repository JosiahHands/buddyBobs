import { useEffect, useState } from 'react'
import { compact, getTribute } from '../../bluesky/bluesky'
import type { Tribute } from '../../bluesky/bluesky'
import butterfly from './butterfly.png'
import styles from './About.module.css'

type Status = 'loading' | 'succeeded' | 'failed'

function Stat({ label, value }: { label: string; value?: number | string }) {
  if (value === undefined) return null
  return (
    <div>
      <dt>{label}</dt>
      <dd>{typeof value === 'number' ? compact(value) : value}</dd>
    </div>
  )
}

function About() {
  const [tribute, setTribute] = useState<Tribute>()
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let ignore = false
    getTribute().then(
      (data) => {
        if (ignore) return
        setTribute(data)
        setStatus('succeeded')
      },
      () => {
        if (!ignore) setStatus('failed')
      },
    )
    return () => {
      ignore = true
    }
  }, [])

  return (
    <aside className={styles.aside} aria-label="About Bluesky">
      <a
        className={styles.banner}
        href="https://bsky.app"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Bluesky"
      >
        <span className={styles.butterfly} style={{ maskImage: `url(${butterfly})` }} />
      </a>

      <div className={styles.body}>
        <p className={styles.label}>With thanks to</p>
        <h2 className={styles.name}>Bluesky</h2>
        <p className={styles.text}>
          Every post on BuddyBobs comes from Bluesky, an open social network
          built on the AT Protocol.
        </p>

        {status === 'loading' && <p className={styles.note}>Loading…</p>}
        {status === 'failed' && (
          <p className={styles.note}>Couldn’t reach Bluesky right now.</p>
        )}

        {tribute && (
          <dl className={styles.stats}>
            <Stat label="Since" value={tribute.since} />
            <Stat label="Users" value={tribute.users} />
          </dl>
        )}

        <p className={styles.links}>
          <a href="https://bsky.app" target="_blank" rel="noopener noreferrer">
            Join Bluesky
          </a>
          {' · '}
          <a href="https://atproto.com" target="_blank" rel="noopener noreferrer">
            AT Protocol
          </a>
        </p>
        {tribute?.users !== undefined && (
          <p className={styles.credit}>
            Network stats by{' '}
            <a href="https://bsky.app/profile/jaz.bsky.social" target="_blank" rel="noopener noreferrer">
              Jaz
            </a>
          </p>
        )}
      </div>
    </aside>
  )
}

export default About
