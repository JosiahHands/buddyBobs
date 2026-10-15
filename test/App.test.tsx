import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from '../src/store.ts'
import App from '../src/App.tsx'

const post = {
  post: {
    id: 1,
    name: 'Pigs be like',
    body: 'Oink',
    nsfw: false,
    published: new Date().toISOString(),
  },
  creator: { name: 'inari' },
  community: { name: 'memes' },
  counts: { score: 1114, comments: 45 },
}

const siteView = {
  site: {
    name: 'Lemmy.World',
    description: 'A generic Lemmy server for everyone to use.',
    published: '2023-06-01T07:01:46Z',
    actor_id: 'https://lemmy.world/',
  },
  counts: { users: 199885, communities: 13651, comments: 7166942, users_active_month: 12574 },
  local_site: {
    registration_mode: 'RequireApplication',
    captcha_enabled: true,
    require_email_verification: true,
    enable_downvotes: true,
    actor_name_max_length: 26,
  },
}

// Answers the app's Lemmy requests without touching the network
function fakeLemmy(input: RequestInfo | URL) {
  const url = String(input)
  let data: unknown = {}
  if (url.includes('post/list')) data = { posts: [post] }
  if (url.endsWith('/site')) data = { site_view: siteView }
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response)
}

describe('App', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn(fakeLemmy) as typeof fetch
  })

  it('renders every section of the page', async () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    )

    // Header and the feed heading are there straight away
    expect(screen.getByText('BuddyBobs')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Latest posts' })).toBeInTheDocument()

    // Ad and footer are static
    expect(screen.getByRole('heading', { name: 'Awesome Pirates' })).toBeInTheDocument()
    expect(screen.getByText(/Built on the Lemmy API/)).toBeInTheDocument()

    // The feed and the tribute fill in once their requests finish
    expect(await screen.findByRole('heading', { name: 'Pigs be like' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Lemmy.World' })).toBeInTheDocument()
    expect(screen.getByText('199,885')).toBeInTheDocument()
  })
})
