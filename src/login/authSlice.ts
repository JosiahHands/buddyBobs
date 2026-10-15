import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getMyUsername, login, logout, register, type RegisterForm } from '../lemmy/account.ts'
import type { RootState } from '../store.ts'

const storageKey = 'buddybobs-auth'

type AuthState = {
  jwt: string | null
  username: string | null
}

// Storage can be blocked (private windows, strict settings), so never let it throw
function loadAuth(): AuthState {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (saved?.jwt) return { jwt: saved.jwt, username: saved.username ?? null }
  } catch {
    // Fall through to logged out
  }
  return { jwt: null, username: null }
}

export function saveAuth({ jwt, username }: AuthState) {
  try {
    if (jwt) localStorage.setItem(storageKey, JSON.stringify({ jwt, username }))
    else localStorage.removeItem(storageKey)
  } catch {
    // Login still works for this visit
  }
}

// Votes and comments need a login; fail early with the code Lemmy would send
export function requireJwt(state: unknown) {
  const { jwt } = (state as RootState).auth
  if (!jwt) throw new Error('not_logged_in')
  return jwt
}

export const logIn = createAsyncThunk(
  'auth/logIn',
  async ({ usernameOrEmail, password, totp }: { usernameOrEmail: string; password: string; totp?: string }) => {
    const response = await login(usernameOrEmail, password, totp)
    // No token means the account isn't ready yet
    if (!response.jwt) {
      throw new Error(response.verify_email_sent ? 'email_not_verified' : 'registration_application_is_pending')
    }
    const username = (await getMyUsername(response.jwt)) ?? usernameOrEmail
    return { jwt: response.jwt, username }
  },
)

// Returns a token only when the instance lets new accounts in right away
export const signUp = createAsyncThunk('auth/signUp', async (form: RegisterForm) => {
  const response = await register(form)
  return {
    jwt: response.jwt ?? null,
    username: form.username,
    verifyEmailSent: response.verify_email_sent,
    applicationCreated: response.registration_created,
  }
})

export const logOut = createAsyncThunk('auth/logOut', async (_, { getState }) => {
  const { jwt } = (getState() as RootState).auth
  // Log out locally even if Lemmy can't be reached
  if (jwt) await logout(jwt).catch(() => {})
})

const authSlice = createSlice({
  name: 'auth',
  initialState: loadAuth(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(logIn.fulfilled, (state, action) => {
        state.jwt = action.payload.jwt
        state.username = action.payload.username
      })
      .addCase(signUp.fulfilled, (state, action) => {
        if (!action.payload.jwt) return
        state.jwt = action.payload.jwt
        state.username = action.payload.username
      })
      .addCase(logOut.fulfilled, (state) => {
        state.jwt = null
        state.username = null
      })
  },
})

export default authSlice.reducer
