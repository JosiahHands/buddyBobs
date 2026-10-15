import { describe, expect, it } from '@jest/globals'
import { getSiteInfo } from '../../src/lemmy/siteInfo.ts'
import { mockFetch, siteView } from '../testUtils.ts'

describe('getSiteInfo', () => {
  it('returns the site details', async () => {
    mockFetch(() => ({ body: { site_view: siteView } }))
    await expect(getSiteInfo()).resolves.toEqual(siteView)
  })

  it('throws when the request fails', async () => {
    mockFetch(() => ({ status: 500 }))
    await expect(getSiteInfo()).rejects.toThrow('Lemmy request failed: 500')
  })
})
