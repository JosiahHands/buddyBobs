import type { ReactNode } from 'react'
import styles from './header.module.css'

const links = ['Home', 'Saved', 'Settings']

function Header({ children }: { children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <a className={styles.brand} href="/">
          <span className={styles.logo}>r</span>
          <span className={styles.title}>Reddit Client</span>
        </a>
        <ul className={styles.links}>
          {links.map((link) => (
            <li key={link}>
              <a href="#">{link}</a>
            </li>
          ))}
        </ul>
      </div>
      {children}
    </header>
  )
}

export default Header
