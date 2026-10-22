import { useEffect, useRef, useState } from 'react'
import { getAccount, logOut, signUp } from '../../bluesky/bluesky'
import type { Account } from '../../bluesky/bluesky'
import LoginDialog from '../LoginDialog/LoginDialog'
import styles from './Header.module.css'

type Status = 'loading' | 'signedIn' | 'signedOut'

function Header() {
  const [account, setAccount] = useState<Account>()
  const [status, setStatus] = useState<Status>('loading')
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    let ignore = false
    getAccount().then(
      (data) => {
        if (ignore) return
        setAccount(data)
        setStatus(data ? 'signedIn' : 'signedOut')
      },
      // An expired session or a cancelled login just means signed out.
      () => {
        if (!ignore) setStatus('signedOut')
      },
    )
    return () => {
      ignore = true
    }
  }, [])

  // Redirects to Bluesky. It only rejects if that fails, or once the user comes
  // back without signing up.
  function handleSignUp() {
    signUp().catch((e) => console.warn('Sign up didn’t finish:', e))
  }

  // Signed out locally even if Bluesky couldn't be told.
  async function handleLogOut() {
    if (!account) return
    try {
      await logOut(account)
    } finally {
      setAccount(undefined)
      setStatus('signedOut')
    }
  }

  return (
    <header className={styles.header}>
      <a className={styles.brand} href="/">
        <span className={styles.logo}>B</span>
        <span className={styles.title}>BuddyBobs</span>
      </a>
      <div className={styles.account}>
        {status === 'signedOut' && (
          <>
            <button type="button" className={styles.secondary} onClick={handleSignUp}>
              Sign up
            </button>
            <button
              type="button"
              className={styles.button}
              onClick={() => dialog.current?.showModal()}
            >
              Login
            </button>
          </>
        )}
        {status === 'signedIn' && account && (
          <>
            <span className={styles.user}>
              {account.avatar && (
                <img className={styles.avatar} src={account.avatar} alt="" width={28} height={28} />
              )}
              <span className={styles.name}>{account.name}</span>
              {account.handle && <span className={styles.handle}>@{account.handle}</span>}
            </span>
            <button type="button" className={styles.secondary} onClick={handleLogOut}>
              Log out
            </button>
          </>
        )}
      </div>
      <LoginDialog ref={dialog} />
    </header>
  )
}

export default Header
