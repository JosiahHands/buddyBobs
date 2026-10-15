import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getHomePosts, votePost, type PostView } from '../lemmy/homePost.ts'
import { postComment } from '../comments/commentsSlice.ts'
import { requireJwt } from '../login/authSlice.ts'
import type { RootState } from '../store.ts'

type PostsState = {
  items: PostView[]
  // Cursor for the next 20 posts; null when there are no more
  nextPage: string | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  moreStatus: 'idle' | 'loading' | 'failed'
  error: string | null
}

const initialState: PostsState = {
  items: [],
  nextPage: null,
  status: 'idle',
  moreStatus: 'idle',
  error: null,
}

// Sending the login token makes Lemmy include the user's own votes
export const fetchHomePosts = createAsyncThunk(
  'posts/fetchHome',
  (_: void, { getState }) => getHomePosts(undefined, (getState() as RootState).auth.jwt),
  {
    // StrictMode runs effects twice in dev; skip the second request
    condition: (_, { getState }) => (getState() as RootState).posts.status !== 'loading',
  },
)

export const fetchMorePosts = createAsyncThunk(
  'posts/fetchMore',
  (pageCursor: string, { getState }) => getHomePosts(pageCursor, (getState() as RootState).auth.jwt),
  {
    // Ignore extra clicks while a page is already loading
    condition: (_, { getState }) => (getState() as RootState).posts.moreStatus !== 'loading',
  },
)

export const voteOnPost = createAsyncThunk(
  'posts/vote',
  ({ postId, score }: { postId: number; score: number }, { getState }) =>
    votePost(requireJwt(getState()), postId, score),
)

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
        state.items = action.payload.posts
        state.nextPage = action.payload.nextPage ?? null
      })
      .addCase(fetchHomePosts.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Something went wrong'
      })
      .addCase(fetchMorePosts.pending, (state) => {
        state.moreStatus = 'loading'
        state.error = null
      })
      .addCase(fetchMorePosts.fulfilled, (state, action) => {
        state.moreStatus = 'idle'
        // Rankings shift between requests, so skip any post we already have
        const seen = new Set(state.items.map((item) => item.post.id))
        state.items.push(...action.payload.posts.filter((item) => !seen.has(item.post.id)))
        state.nextPage = action.payload.nextPage ?? null
      })
      .addCase(fetchMorePosts.rejected, (state, action) => {
        state.moreStatus = 'failed'
        state.error = action.error.message ?? 'Something went wrong'
      })
      // Lemmy sends back the post with its new score and the user's vote
      .addCase(voteOnPost.fulfilled, (state, action) => {
        const index = state.items.findIndex((item) => item.post.id === action.payload.post.id)
        if (index !== -1) state.items[index] = action.payload
      })
      .addCase(postComment.fulfilled, (state, action) => {
        const item = state.items.find((item) => item.post.id === action.meta.arg.postId)
        if (item) item.counts.comments += 1
      })
  },
})

export default postsSlice.reducer
