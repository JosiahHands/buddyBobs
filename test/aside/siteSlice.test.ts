import { describe, expect, it } from '@jest/globals'
import { fetchSiteInfo } from '../../src/aside/siteSlice.ts'
import { makeStore } from '../../src/store.ts'
import { mockFetch, siteView } from '../testUtils.ts'

describe('fetchSiteInfo', () => {
  it('stores the site details', async () => {
    mockFetch(() => ({ body: { site_view: siteView } }))
    const store = makeStore()

    await store.dispatch(fetchSiteInfo())
    expect(store.getState().site).toEqual({ view: siteView, status: 'succeeded', error: null })
  })

  it('records the error when loading fails', async () => {
    mockFetch(() => ({ status: 500 }))
    const store = makeStore()

    await store.dispatch(fetchSiteInfo())
    expect(store.getState().site).toMatchObject({ status: 'failed', error: 'Lemmy request failed: 500' })
  })

  it('doesn’t start a second request while one is loading', async () => {
    const fetchMock = mockFetch(() => ({ body: { site_view: siteView } }))
    const store = makeStore()

    await Promise.all([store.dispatch(fetchSiteInfo()), store.dispatch(fetchSiteInfo())])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
