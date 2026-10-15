import styles from './nav.module.css'

const subreddits = ['r/popular', 'r/all', 'r/reactjs', 'r/webdev']

function Nav() {
  return (
    <nav className={styles.nav} aria-label="Subreddits">
      <ul className={styles.list}>
        {subreddits.map((subreddit, i) => (
          <li key={subreddit}>
            <a
              href="#"
              className={i === 0 ? `${styles.pill} ${styles.active}` : styles.pill}
              aria-current={i === 0 ? 'page' : undefined}
            >
              {subreddit}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Nav
