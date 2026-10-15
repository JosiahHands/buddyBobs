import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import { useAppDispatch, useAppSelector } from '../store.ts'
import { logIn, signUp } from './authSlice.ts'
import { getCaptcha, type Captcha } from '../lemmy/account.ts'
import { friendlyError } from '../lemmy/errors.ts'
import styles from './login.module.css'

// Lemmy.World's moderators look for this exact answer to the sign-up question
const tosAnswer = 'I agree to the TOS'

// The sign-up question is Markdown; show it as readable plain text
function plainText(markdown: string) {
  return markdown
    .replace(/```\w*\n?/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\*\*|__|`/g, '')
    // The checkbox types the answer for them, so don't tell them to type it
    .replace(`by typing ${tosAnswer} in the form below`, 'by ticking “I agree” below')
    .trim()
}

function LoginForm({ onDone }: { onDone: () => void }) {
  const dispatch = useAppDispatch()
  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totp, setTotp] = useState('')
  const [needsTotp, setNeedsTotp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await dispatch(logIn({ usernameOrEmail, password, totp })).unwrap()
      onDone()
    } catch (err) {
      const code = (err as Error).message
      if (code === 'missing_totp_token') setNeedsTotp(true)
      setError(friendlyError(code))
      setBusy(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label>
        Username or email
        <input
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      {needsTotp && (
        <label>
          Two-factor code
          <input
            value={totp}
            onChange={(e) => setTotp(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
        </label>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="submit" className={styles.submit} disabled={busy}>
        {busy ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  )
}

function SignupForm({ onDone }: { onDone: () => void }) {
  const dispatch = useAppDispatch()
  const rules = useAppSelector((state) => state.site.view?.local_site)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVerify, setPasswordVerify] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [captcha, setCaptcha] = useState<Captcha | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState<string[] | null>(null)

  const needsCaptcha = rules?.captcha_enabled ?? false

  // Each captcha can only be tried once, so this also runs after a failed sign-up
  function loadCaptcha() {
    setCaptchaAnswer('')
    getCaptcha()
      .then(setCaptcha)
      .catch(() => setError('Couldn’t load the captcha. Try again in a moment.'))
  }

  useEffect(() => {
    if (!needsCaptcha) return
    getCaptcha()
      .then(setCaptcha)
      .catch(() => setError('Couldn’t load the captcha. Try again in a moment.'))
  }, [needsCaptcha])

  async function submit(e: SubmitEvent) {
    e.preventDefault()
    if (password !== passwordVerify) {
      setError(friendlyError('passwords_do_not_match'))
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await dispatch(
        signUp({
          username,
          password,
          password_verify: passwordVerify,
          email: email || undefined,
          answer: agreed ? tosAnswer : undefined,
          captcha_uuid: captcha?.uuid,
          captcha_answer: captchaAnswer || undefined,
        }),
      ).unwrap()
      if (result.jwt) {
        onDone()
        return
      }
      const steps: string[] = []
      if (result.verifyEmailSent) steps.push('We sent a confirmation link to your email. Click it first.')
      if (result.applicationCreated) {
        steps.push('A Lemmy.World moderator reviews every new account. You’ll get an email once yours is approved.')
      }
      steps.push('After that, come back and log in.')
      setFinished(steps)
    } catch (err) {
      setError(friendlyError((err as Error).message))
      if (needsCaptcha) loadCaptcha()
    }
    setBusy(false)
  }

  if (!rules) return <p className={styles.note}>Loading sign-up rules…</p>
  if (rules.registration_mode === 'Closed') return <p className={styles.note}>{friendlyError('registration_closed')}</p>

  if (finished) {
    return (
      <div className={styles.finished} role="status">
        <p className={styles.finishedTitle}>Almost there, @{username}.</p>
        {finished.map((step) => (
          <p key={step}>{step}</p>
        ))}
      </div>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label>
        Username
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          pattern={`[A-Za-z0-9_]{3,${rules.actor_name_max_length}}`}
          title={`3 to ${rules.actor_name_max_length} letters, numbers or underscores`}
          required
        />
      </label>
      <label>
        Email{rules.require_email_verification ? '' : ' (optional)'}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required={rules.require_email_verification}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={10}
          maxLength={60}
          required
        />
      </label>
      <label>
        Password again
        <input
          type="password"
          value={passwordVerify}
          onChange={(e) => setPasswordVerify(e.target.value)}
          autoComplete="new-password"
          required
        />
      </label>
      {rules.registration_mode === 'RequireApplication' && (
        <div className={styles.terms}>
          <p className={styles.termsTitle}>Terms</p>
          {rules.application_question && (
            <p className={styles.question}>{plainText(rules.application_question)}</p>
          )}
          <label className={styles.agree}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
            I agree
          </label>
        </div>
      )}
      {needsCaptcha && (
        <div className={styles.captcha}>
          {captcha ? (
            <img src={`data:image/png;base64,${captcha.png}`} alt="Captcha: type the letters shown" />
          ) : (
            <p className={styles.note}>Loading captcha…</p>
          )}
          <div className={styles.captchaActions}>
            <button type="button" className={styles.link} onClick={loadCaptcha}>
              New image
            </button>
            {captcha && (
              <button
                type="button"
                className={styles.link}
                onClick={() => new Audio(`data:audio/wav;base64,${captcha.wav}`).play()}
              >
                Listen instead
              </button>
            )}
          </div>
          <label>
            Captcha answer
            <input
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              autoComplete="off"
              required
            />
          </label>
        </div>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="submit" className={styles.submit} disabled={busy}>
        {busy ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}

function LoginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={ref} className={styles.dialog} onClose={onClose} aria-labelledby="login-title">
      {open && (
        <>
          <div className={styles.top}>
            <h2 id="login-title" className={styles.title}>
              {mode === 'login' ? 'Log in' : 'Create an account'}
            </h2>
            <button type="button" className={styles.link} onClick={onClose}>
              Close
            </button>
          </div>
          <p className={styles.note}>
            BuddyBobs uses your Lemmy.World account. {mode === 'login' ? 'New here? ' : 'Already have one? '}
            <button
              type="button"
              className={styles.link}
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Create an account' : 'Log in'}
            </button>
          </p>
          {mode === 'login' ? <LoginForm onDone={onClose} /> : <SignupForm onDone={onClose} />}
        </>
      )}
    </dialog>
  )
}

export default LoginDialog
