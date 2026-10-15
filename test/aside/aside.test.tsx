import { describe, expect, it } from '@jest/globals'
import { screen } from '@testing-library/react'
import Aside from '../../src/aside/aside.tsx'
import { deferred, mockFetch, renderWithStore, siteView } from '../testUtils.ts'

describe('Aside', () => {
  it('shows loading, then the Lemmy.World tribute', async () => {
    const reply = deferred()
    mockFetch(() => ({ body: { site_view: siteView }, wait: reply.promise }))
    renderWithStore(<Aside />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()

    reply.release()
    expect(await screen.findByRole('heading', { name: 'Lemmy.World' })).toBeInTheDocument()
    expect(screen.getByText(siteView.site.description as string)).toBeInTheDocument()
    expect(screen.getByText('199,885')).toBeInTheDocument()
    expect(screen.getByText('12,574')).toBeInTheDocument()
    expect(screen.getByText('June 2023')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Visit the site' })).toHaveAttribute('href', 'https://lemmy.world/')
    expect(screen.getByRole('link', { name: 'Chip in' })).toHaveAttribute('href', 'https://ko-fi.com/fhfworld')
  })

  it('leaves out the icon and description when the site has none', async () => {
    const plainSite = { ...siteView, site: { ...siteView.site, icon: undefined, description: undefined } }
    mockFetch(() => ({ body: { site_view: plainSite } }))
    const { container } = renderWithStore(<Aside />)

    await screen.findByRole('heading', { name: 'Lemmy.World' })
    expect(container.querySelector('img')).toBeNull()
    expect(screen.queryByText(siteView.site.description as string)).not.toBeInTheDocument()
  })

  it('says when the site can’t be reached', async () => {
    mockFetch(() => ({ status: 500 }))
    renderWithStore(<Aside />)
    expect(await screen.findByText('Couldn’t reach Lemmy.World right now.')).toBeInTheDocument()
  })
})
