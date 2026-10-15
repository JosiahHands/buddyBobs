import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store.ts'
import { fetchSiteInfo } from './siteSlice.ts'
import styles from './aside.module.css'

const donateUrl = 'https://ko-fi.com/fhfworld'

function Aside() {
  const dispatch = useAppDispatch()
  const { view, status } = useAppSelector((state) => state.site)

  useEffect(() => {
    dispatch(fetchSiteInfo())
  }, [dispatch])

  return (
    <aside className={styles.aside} aria-label="About Lemmy.World">
      <p className={styles.label}>With thanks to</p>
      {status === 'loading' && <p className={styles.note}>Loading…</p>}
      {status === 'failed' && <p className={styles.note}>Couldn’t reach Lemmy.World right now.</p>}
      {view && (
        <>
          <div className={styles.name}>
            {view.site.icon && (
              <img className={styles.icon} src={view.site.icon} alt="" width={28} height={28} />
            )}
            <h2>{view.site.name}</h2>
          </div>
          {view.site.description && <p className={styles.description}>{view.site.description}</p>}
          <p className={styles.text}>
            Every post on BuddyBobs comes from {view.site.name}. It’s run by the FediHosting
            Foundation and kept online by donations.
          </p>
          <dl className={styles.stats}>
            <div>
              <dt>Members</dt>
              <dd>{view.counts.users.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Active this month</dt>
              <dd>{view.counts.users_active_month.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Communities</dt>
              <dd>{view.counts.communities.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Comments</dt>
              <dd>{view.counts.comments.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Since</dt>
              <dd>
                {new Date(view.site.published).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
          <p className={styles.links}>
            <a href={view.site.actor_id} target="_blank" rel="noopener noreferrer">
              Visit the site
            </a>
            {' · '}
            <a href={donateUrl} target="_blank" rel="noopener noreferrer">
              Chip in
            </a>
          </p>
        </>
      )}
    </aside>
  )
}

export default Aside
