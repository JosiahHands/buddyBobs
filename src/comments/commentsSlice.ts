import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { addComment, getPostComments, voteComment, type CommentView } from '../lemmy/postComments.ts'
import { logIn, logOut, requireJwt, signUp } from '../login/authSlice.ts'
import type { RootState } from '../store.ts'

type ThreadState = {
  items: CommentView[]
  status: 'loading' | 'succeeded' | 'failed'
  error: string | null
}

type CommentsState = {
  byPostId: Record<number, ThreadState>
}

const initialState: CommentsState = {
  byPostId: {},
}

export const fetchPostComments = createAsyncThunk(
  'comments/fetchForPost',
  (postId: number, { getState }) => getPostComments(postId, (getState() as RootState).auth.jwt),
  {
    // Skip if this post's comments are already loading or loaded
    condition: (postId, { getState }) => {
      const status = (getState() as RootState).comments.byPostId[postId]?.status
      return status !== 'loading' && status !== 'succeeded'
    },
  },
)

export const postComment = createAsyncThunk(
  'comments/post',
  ({ postId, content, parentId }: { postId: number; content: string; parentId?: number }, { getState }) =>
    addComment(requireJwt(getState()), postId, content, parentId),
)

export const voteOnComment = createAsyncThunk(
  'comments/vote',
  ({ commentId, score }: { postId: number; commentId: number; score: number }, { getState }) =>
    voteComment(requireJwt(getState()), commentId, score),
)

const commentsSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPostComments.pending, (state, action) => {
        state.byPostId[action.meta.arg] = { items: [], status: 'loading', error: null }
      })
      .addCase(fetchPostComments.fulfilled, (state, action) => {
        state.byPostId[action.meta.arg] = { items: action.payload, status: 'succeeded', error: null }
      })
      .addCase(fetchPostComments.rejected, (state, action) => {
        state.byPostId[action.meta.arg] = {
          items: [],
          status: 'failed',
          error: action.error.message ?? 'Something went wrong',
        }
      })
      .addCase(postComment.fulfilled, (state, action) => {
        const thread = state.byPostId[action.meta.arg.postId]
        // Newest first, so it shows up right under the comment box
        if (thread) thread.items.unshift(action.payload)
      })
      .addCase(voteOnComment.fulfilled, (state, action) => {
        const thread = state.byPostId[action.meta.arg.postId]
        if (!thread) return
        const index = thread.items.findIndex((item) => item.comment.id === action.payload.comment.id)
        if (index !== -1) thread.items[index] = action.payload
      })
      // Votes shown depend on who is logged in, so reload threads after a change
      .addCase(logIn.fulfilled, () => initialState)
      .addCase(signUp.fulfilled, () => initialState)
      .addCase(logOut.fulfilled, () => initialState)
  },
})

export default commentsSlice.reducer
