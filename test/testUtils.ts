// Shared helpers for tests; the app never imports this file
import { createElement, type ReactElement } from 'react'
import { jest } from '@jest/globals'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { makeStore, type RootState } from '../src/store.ts'
import type { PostView } from '../src/lemmy/homePost.ts'
import type { CommentView } from '../src/lemmy/postComments.ts'
import type { SiteView } from '../src/lemmy/siteInfo.ts'

// Render inside a fresh Redux store, optionally starting from some state
export function renderWithStore(ui: ReactElement, preloadedState?: Partial<RootState>) {
  const store = makeStore(preloadedState)
  const user = userEvent.setup()
  return { store, user, ...render(createElement(Provider, { store, children: ui })) }
}

type Reply = {
  status?: number
  body?: unknown
  // Simulates a response that isn't JSON (e.g. an HTML error page)
  invalidJson?: boolean
  // Holds the reply back until this settles, to catch loading states
  wait?: Promise<unknown>
}

// Replaces fetch with a fake Lemmy; route() picks a reply for each request
export function mockFetch(route: (url: string, init?: RequestInit) => Reply | undefined = () => undefined) {
  const fetchMock = jest.fn<typeof fetch>(async (input, init) => {
    const reply = route(String(input), init) ?? {}
    await reply.wait
    const status = reply.status ?? 200
    return {
      ok: status < 400,
      status,
      json: () => (reply.invalidJson ? Promise.reject(new SyntaxError('Not JSON')) : Promise.resolve(reply.body ?? {})),
    } as Response
  })
  globalThis.fetch = fetchMock
  return fetchMock
}

// A promise the test resolves when it's ready, for Reply.wait
export function deferred() {
  let release = () => {}
  const promise = new Promise<void>((resolve) => (release = resolve))
  return { promise, release }
}

// The first request whose path ends with path (e.g. "comment" but not "comment/list"),
// with its JSON body parsed
export function requestTo(fetchMock: ReturnType<typeof mockFetch>, path: string) {
  const call = fetchMock.mock.calls.find(([url]) => String(url).split('?')[0].endsWith(path))
  if (!call) return undefined
  const [url, init] = call
  return {
    url: String(url),
    init,
    headers: (init?.headers ?? {}) as Record<string, string>,
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  }
}

export function makePost(id: number, overrides: Partial<PostView['post']> = {}): PostView {
  return {
    post: { id, name: `Post ${id}`, nsfw: false, published: new Date().toISOString(), ...overrides },
    creator: { name: `poster${id}` },
    community: { name: 'memes' },
    counts: { score: 10, comments: 2 },
  }
}

export function makeComment(id: number, path: string, overrides: Partial<CommentView['comment']> = {}): CommentView {
  return {
    comment: {
      id,
      content: `Comment ${id}`,
      path,
      published: new Date().toISOString(),
      deleted: false,
      removed: false,
      ...overrides,
    },
    creator: { name: `commenter${id}` },
    counts: { score: 1, child_count: 0 },
  }
}

export const siteView: SiteView = {
  site: {
    name: 'Lemmy.World',
    description: 'A generic Lemmy server for everyone to use.',
    icon: 'https://lemmy.world/icon.png',
    published: '2023-06-01T07:01:46Z',
    actor_id: 'https://lemmy.world/',
  },
  counts: { users: 199885, communities: 13651, comments: 7166942, users_active_month: 12574 },
  local_site: {
    registration_mode: 'RequireApplication',
    captcha_enabled: true,
    require_email_verification: true,
    application_question:
      'Please agree to our [Terms](https://legal.lemmy.world) by typing `I agree to the TOS` in the form below.',
    enable_downvotes: true,
    actor_name_max_length: 26,
  },
}

// Preloaded state pieces for renderWithStore / makeStore
export function loggedIn(username = 'bob'): Partial<RootState> {
  return { auth: { jwt: 'test-token', username } }
}

export function withSite(localSite: Partial<SiteView['local_site']> = {}): Partial<RootState> {
  return {
    site: {
      view: { ...siteView, local_site: { ...siteView.local_site, ...localSite } },
      status: 'succeeded',
      error: null,
    },
  }
}
