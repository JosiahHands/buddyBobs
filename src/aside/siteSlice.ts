import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { getSiteInfo, type SiteView } from '../lemmy/siteInfo.ts'
import type { RootState } from '../store.ts'

type SiteState = {
  view: SiteView | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: SiteState = {
  view: null,
  status: 'idle',
  error: null,
}

export const fetchSiteInfo = createAsyncThunk('site/fetch', getSiteInfo, {
  // StrictMode runs effects twice in dev; skip the second request
  condition: (_, { getState }) => (getState() as RootState).site.status !== 'loading',
})

const siteSlice = createSlice({
  name: 'site',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSiteInfo.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchSiteInfo.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.view = action.payload
      })
      .addCase(fetchSiteInfo.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.error.message ?? 'Something went wrong'
      })
  },
})

export default siteSlice.reducer
