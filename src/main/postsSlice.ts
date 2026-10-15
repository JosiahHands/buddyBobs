import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getHomePosts, type PostView } from '../lemmy/lemmy.tsx'
import type { RootState } from '../store.ts'

type PostsState = {
  items: PostView[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: PostsState = { 
  items: [],
  status: 'idle',
  error: null,
}

export const fetchHomePosts = createAsyncThunk('posts/fetchHome', getHomePosts, {
  // StrictMode runs effects twice in dev; skip the second request
  condition: (_, { getState }) => (getState() as RootState).posts.status !== 'loading',
})

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomePosts.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchHomePosts.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.items = action.payload
      })
      .addCase(fetchHomePosts.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Something went wrong'
      })
  },
})

export default postsSlice.reducer
