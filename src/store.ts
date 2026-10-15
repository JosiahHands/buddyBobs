import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import postsReducer from './main/postsSlice.ts'
import commentsReducer from './comments/commentsSlice.ts'
import siteReducer from './aside/siteSlice.ts'
import authReducer, { saveAuth } from './login/authSlice.ts'

const rootReducer = combineReducers({
  posts: postsReducer,
  comments: commentsReducer,
  site: siteReducer,
  auth: authReducer,
})

export type RootState = ReturnType<typeof rootReducer>

// Tests build a fresh store each time; the app uses the single store below
export function makeStore(preloadedState?: Partial<RootState>) {
  return configureStore({ reducer: rootReducer, preloadedState })
}

export const store = makeStore()

// Remember the login between visits; only write when it actually changes
let lastJwt = store.getState().auth.jwt
store.subscribe(() => {
  const { auth } = store.getState()
  if (auth.jwt === lastJwt) return
  lastJwt = auth.jwt
  saveAuth(auth)
})

export type AppStore = ReturnType<typeof makeStore>
export type AppDispatch = AppStore['dispatch']

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
