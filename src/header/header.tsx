import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store.ts'
import { logOut } from '../login/authSlice.ts'
import LoginDialog from '../login/login.tsx'
import styles from './header.module.css'

function Header() {
  const dispatch = useAppDispatch()
  const { jwt, username } = useAppSelector((state) => state.auth)
  const [dialogOpen, setDialogOpen] = useState(false)
  const loggedIn = Boolean(jwt)

  return (
    <header className={styles.header}>
      <a className={styles.brand} href="/">
        <span className={styles.logo}>b</span>
        <span className={styles.title}>BuddyBobs</span>
      </a>
      <div className={styles.account}>
        {loggedIn && username && <span className={styles.user}>@{username}</span>}
        <button
          type="button"
          className={styles.button}
          onClick={() => (loggedIn ? dispatch(logOut()) : setDialogOpen(true))}
        >
          {loggedIn ? 'Logout' : 'Login'}
        </button>
      </div>
      <LoginDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </header>
  )
}

export default Header
