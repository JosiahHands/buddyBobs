import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { fireEvent, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import LoginDialog from '../../src/login/login.tsx'
import { deferred, mockFetch, renderWithStore, requestTo, withSite } from '../testUtils.ts'
import type { RootState } from '../../src/store.ts'

const captcha = { png: 'cGln', wav: 'd2F2', uuid: 'captcha-1' }

afterEach(() => {
  jest.restoreAllMocks()
})

function renderDialog(state: Partial<RootState> = withSite(), open = true) {
  const onClose = jest.fn()
  const result = renderWithStore(<LoginDialog open={open} onClose={onClose} />, state)
  return { ...result, onClose }
}

async function openSignup(state: Partial<RootState> = withSite()) {
  const result = renderDialog(state)
  await result.user.click(screen.getByRole('button', { name: 'Create an account' }))
  return result
}

describe('LoginDialog', () => {
  it('stays empty while closed', () => {
    const { container } = renderDialog(withSite(), false)
    expect(container.querySelector('dialog')).not.toHaveAttribute('open')
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('opens as a modal and closes when told to', () => {
    const { container, store, rerender, onClose } = renderDialog()
    const dialog = container.querySelector('dialog') as HTMLDialogElement
    expect(dialog.open).toBe(true)
    expect(screen.getByText(/BuddyBobs uses your Lemmy.World account/)).toBeInTheDocument()

    rerender(
      <Provider store={store}>
        <LoginDialog open={false} onClose={onClose} />
      </Provider>,
    )
    expect(dialog.open).toBe(false)
  })

  it('reports Escape (the dialog’s close event) to its parent', () => {
    const { container, onClose } = renderDialog()
    fireEvent(container.querySelector('dialog') as HTMLDialogElement, new Event('close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('switches between logging in and signing up', async () => {
    const { user } = await openSignup()
    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })
})

describe('logging in', () => {
  async function fillLogin(user: ReturnType<typeof renderDialog>['user']) {
    await user.type(screen.getByLabelText('Username or email'), 'bob')
    await user.type(screen.getByLabelText('Password'), 'secret-password')
  }

  it('logs in and closes', async () => {
    mockFetch((url) => {
      if (url.includes('user/login')) return { body: { jwt: 'abc' } }
      return { body: { my_user: { local_user_view: { person: { name: 'bob' } } } } }
    })
    const { user, store, onClose } = renderDialog()

    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(onClose).toHaveBeenCalled()
    expect(store.getState().auth).toEqual({ jwt: 'abc', username: 'bob' })
  })

  it('shows progress, then explains a wrong password', async () => {
    const reply = deferred()
    mockFetch(() => ({ status: 401, body: { error: 'incorrect_login' }, wait: reply.promise }))
    const { user, onClose } = renderDialog()

    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled()

    reply.release()
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password.')
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('asks for a two-factor code when the account has one', async () => {
    const fetchMock = mockFetch((url, init) => {
      if (url.endsWith('/site')) return { body: {} }
      const body = JSON.parse(String(init?.body))
      return body.totp_2fa_token ? { body: { jwt: 'abc' } } : { status: 400, body: { error: 'missing_totp_token' } }
    })
    const { user, onClose } = renderDialog()

    await fillLogin(user)
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('two-factor')

    await user.type(screen.getByLabelText('Two-factor code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(onClose).toHaveBeenCalled()
    const logins = fetchMock.mock.calls.filter(([url]) => String(url).includes('user/login'))
    expect(JSON.parse(String(logins[1][1]?.body)).totp_2fa_token).toBe('123456')
  })
})

describe('signing up', () => {
  async function fillSignup(user: ReturnType<typeof renderDialog>['user'], passwordAgain = 'secret-password') {
    await user.type(screen.getByLabelText('Username'), 'bob')
    await user.type(screen.getByLabelText('Email'), 'bob@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret-password')
    await user.type(screen.getByLabelText('Password again'), passwordAgain)
  }

  function lemmyWith(registerReply: object) {
    return mockFetch((url) => {
      if (url.includes('get_captcha')) return { body: { ok: captcha } }
      if (url.includes('user/register')) return registerReply
    })
  }

  it('waits for the sign-up rules', async () => {
    await openSignup({})
    expect(screen.getByText('Loading sign-up rules…')).toBeInTheDocument()
  })

  it('says when sign-ups are closed', async () => {
    await openSignup(withSite({ registration_mode: 'Closed' }))
    expect(screen.getByText('Lemmy.World isn’t taking new sign-ups right now.')).toBeInTheDocument()
  })

  it('sends the terms answer and captcha, then explains the next steps', async () => {
    const fetchMock = lemmyWith({ body: { verify_email_sent: true, registration_created: true } })
    const { user } = await openSignup()

    // The question is shown as plain text, reworded to match the checkbox
    expect(screen.getByText(/by ticking “I agree” below/)).toBeInTheDocument()
    expect(await screen.findByRole('img', { name: /Captcha/ })).toHaveAttribute('src', 'data:image/png;base64,cGln')

    await fillSignup(user)
    await user.click(screen.getByLabelText('I agree'))
    await user.type(screen.getByLabelText('Captcha answer'), 'xk3p')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Almost there, @bob.')
    expect(screen.getByText(/confirmation link/)).toBeInTheDocument()
    expect(screen.getByText(/moderator reviews every new account/)).toBeInTheDocument()
    expect(requestTo(fetchMock, 'user/register')?.body).toEqual({
      username: 'bob',
      password: 'secret-password',
      password_verify: 'secret-password',
      email: 'bob@example.com',
      answer: 'I agree to the TOS',
      captcha_uuid: 'captcha-1',
      captcha_answer: 'xk3p',
    })
  })

  it('logs straight in and closes when the instance is open', async () => {
    const fetchMock = mockFetch(() => ({ body: { jwt: 'abc' } }))
    const { user, store, onClose } = await openSignup(
      withSite({ registration_mode: 'Open', captcha_enabled: false, require_email_verification: false }),
    )

    expect(screen.getByLabelText('Email (optional)')).not.toBeRequired()
    expect(screen.queryByLabelText('I agree')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Captcha answer')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Username'), 'bob')
    await user.type(screen.getByLabelText('Password'), 'secret-password')
    await user.type(screen.getByLabelText('Password again'), 'secret-password')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(onClose).toHaveBeenCalled()
    expect(store.getState().auth.jwt).toBe('abc')
    expect(requestTo(fetchMock, 'user/register')?.body).toEqual({
      username: 'bob',
      password: 'secret-password',
      password_verify: 'secret-password',
    })
  })

  it('still says to log in when nothing else is needed', async () => {
    lemmyWith({ body: { verify_email_sent: false, registration_created: false } })
    const { user } = await openSignup()

    await fillSignup(user)
    await user.click(screen.getByLabelText('I agree'))
    await user.type(screen.getByLabelText('Captcha answer'), 'xk3p')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('After that, come back and log in.')
    expect(status).not.toHaveTextContent('confirmation link')
  })

  it('catches mismatched passwords before sending anything', async () => {
    const fetchMock = lemmyWith({ body: {} })
    const { user } = await openSignup()

    await fillSignup(user, 'different-password')
    await user.click(screen.getByLabelText('I agree'))
    await user.type(screen.getByLabelText('Captcha answer'), 'xk3p')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(screen.getByRole('alert')).toHaveTextContent('The passwords don’t match.')
    expect(requestTo(fetchMock, 'user/register')).toBeUndefined()
  })

  it('shows progress, then explains errors and loads a fresh captcha', async () => {
    const reply = deferred()
    const fetchMock = lemmyWith({ status: 400, body: { error: 'captcha_incorrect' }, wait: reply.promise })
    const { user } = await openSignup()

    await fillSignup(user)
    await user.click(screen.getByLabelText('I agree'))
    await user.type(screen.getByLabelText('Captcha answer'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(screen.getByRole('button', { name: 'Creating account…' })).toBeDisabled()

    reply.release()
    expect(await screen.findByRole('alert')).toHaveTextContent('The captcha answer didn’t match.')
    expect(screen.getByLabelText('Captcha answer')).toHaveValue('')
    const captchaLoads = fetchMock.mock.calls.filter(([url]) => String(url).includes('get_captcha'))
    expect(captchaLoads).toHaveLength(2)
  })

  it('offers a new captcha image and an audio version', async () => {
    const play = jest.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve())
    const fetchMock = lemmyWith({ body: {} })
    const { user } = await openSignup()
    await screen.findByRole('img', { name: /Captcha/ })

    await user.click(screen.getByRole('button', { name: 'New image' }))
    await user.click(screen.getByRole('button', { name: 'Listen instead' }))

    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('get_captcha'))).toHaveLength(2)
    expect(play).toHaveBeenCalled()
  })

  it('says when the captcha can’t load', async () => {
    mockFetch(() => ({ status: 500 }))
    const { user } = await openSignup()

    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load the captcha.')
    expect(screen.getByText('Loading captcha…')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New image' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load the captcha.')
  })
})
