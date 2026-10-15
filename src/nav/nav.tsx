import styles from './nav.module.css'

const communities = ['c/technology', 'c/programming', 'c/linux', 'c/webdev']

function Nav() {
  return (
    <nav className={styles.nav} aria-label="Communities">
      <ul className={styles.list}>
        {communities.map((community, i) => (
          <li key={community}>
            <a
              href="#"
              className={i === 0 ? `${styles.pill} ${styles.active}` : styles.pill}
              aria-current={i === 0 ? 'page' : undefined}
            >
              {community}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Nav
