import { BrowserOAuthClient } from '@atproto/oauth-client-browser'

// Public AppView: serves feeds, profiles and threads without logging in.
const API = 'https://public.api.bsky.app/xrpc'

// Bluesky's PDS entryway. It resolves handles for OAuth (so typed handles are
// sent to Bluesky) and hosts sign-up for new accounts.
const ENTRYWAY = 'https://bsky.social'

// In production, set this to the URL of the hosted client-metadata.json.
// Without it the app runs as a "loopback" client, which only works from
// 127.0.0.1 and needs no hosted metadata.
const CLIENT_ID: string | undefined = import.meta.env.VITE_OAUTH_CLIENT_ID

// Bluesky's own moderation service (moderation.bsky.app). Asking for it makes
// sure its labels, like "porn", come back on posts and accounts.
const BSKY_LABELER = 'did:plc:ar7c4by46qjdydhdevvrndac'

// Bluesky's "Discover" feed.
export const DISCOVER_FEED =
  'at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot'

// Raw shapes from app.bsky.feed.getFeed, trimmed to the fields we read.

// From a labeler, or self-applied by the poster.
export type RawLabel = {
  val: string
}

export type RawAuthor = {
  handle: string
  displayName?: string
  avatar?: string
  labels?: RawLabel[]
}

export type RawEmbed = {
  $type: string
  images?: { fullsize: string; alt: string; aspectRatio?: { width: number; height: number } }[]
  external?: { uri: string; title: string; description: string; thumb?: string }
  thumbnail?: string
  alt?: string
  aspectRatio?: { width: number; height: number }
  media?: RawEmbed
}

export type RawPost = {
  uri: string
  author: RawAuthor
  record: {
    text: string
    // Hashtags that aren't in the text.
    tags?: string[]
    // The poster's own content warnings.
    labels?: { values?: RawLabel[] }
  }
  embed?: RawEmbed
  replyCount?: number
  repostCount?: number
  likeCount?: number
  labels?: RawLabel[]
  // When the AppView saw the post. createdAt is set by the poster's app and
  // can be in the future or backdated, so Bluesky shows this instead.
  indexedAt: string
}

export type RawFeedItem = {
  post: RawPost
}

export type RawFeedPage = {
  feed: RawFeedItem[]
  cursor?: string
}

export type RawProfile = RawAuthor & {
  createdAt?: string
}

// Network-wide counts from Jaz's stats service (bsky-search.jazco.io), not
// Bluesky itself. Bluesky has no public user count. Fetched through the /jazco
// proxy in vite.config.ts because the service doesn't allow cross-origin calls.
export type RawNetworkStats = {
  total_users: number
}

async function getJson<T>(url: string, headers?: HeadersInit): Promise<T> {
  const res = await fetch(url, { headers })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.message ?? `Request failed (${res.status})`)
  }
  return res.json()
}

export function fetchProfile(actor: string): Promise<RawProfile> {
  const params = new URLSearchParams({ actor })
  return getJson(`${API}/app.bsky.actor.getProfile?${params}`)
}

export function fetchNetworkStats(): Promise<RawNetworkStats> {
  return getJson('/jazco/stats')
}

export async function fetchPosts(
  cursor?: string,
  feed = DISCOVER_FEED,
  limit = 20,
): Promise<RawFeedPage> {
  const params = new URLSearchParams({ feed, limit: String(limit) })
  if (cursor) params.set('cursor', cursor)
  return getJson(`${API}/app.bsky.feed.getFeed?${params}`, {
    'atproto-accept-labelers': BSKY_LABELER,
  })
}

// OAuth. Tokens are kept in IndexedDB by the client.

let client: Promise<BrowserOAuthClient> | undefined

function getClient() {
  client ??= CLIENT_ID
    ? BrowserOAuthClient.load({ clientId: CLIENT_ID, handleResolver: ENTRYWAY })
    : Promise.resolve(new BrowserOAuthClient({ handleResolver: ENTRYWAY }))
  return client
}

let session: Promise<string | undefined> | undefined

// The signed-in DID, from the last session or a login redirect. The client's
// init() must only run once per page load, so the result is shared.
export function restoreSession() {
  session ??= getClient()
    .then((c) => c.init())
    .then((result) => result?.session.sub)
  return session
}

// Both redirect to Bluesky and come back to restoreSession(). The promise only
// settles if that fails or the user navigates back.
export async function authorize(handle: string) {
  return (await getClient()).signIn(handle)
}

export async function authorizeNewAccount() {
  return (await getClient()).signIn(ENTRYWAY, { prompt: 'create' })
}

// The local tokens are deleted even if Bluesky can't be reached to revoke them.
export async function revokeSession(did: string) {
  try {
    await (await getClient()).revoke(did)
  } finally {
    session = Promise.resolve(undefined)
  }
}
