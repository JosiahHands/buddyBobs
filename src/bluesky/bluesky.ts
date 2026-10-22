import {
  authorize,
  authorizeNewAccount,
  fetchNetworkStats,
  fetchPosts,
  fetchProfile,
  restoreSession,
  revokeSession,
} from './complex'
import type { RawEmbed, RawPost } from './complex'

// Display-ready shapes for the components.

export type Image = {
  src: string
  alt: string
  width?: number
  height?: number
}

export type LinkCard = {
  url: string
  domain: string
  title: string
  description: string
  thumb?: string
}

export type Post = {
  id: string
  author: {
    name: string
    handle: string
    avatar?: string
  }
  createdAt: string
  text: string
  image?: Image
  link?: LinkCard
  replies: number
  reposts: number
  likes: number
}

export type PostPage = {
  posts: Post[]
  cursor?: string
}

// Bluesky's adult and graphic labels, the older "nsfw" some posters still
// self-apply, and "!hide" for posts Bluesky's moderators hid.
const ADULT_LABELS = new Set([
  'porn',
  'sexual',
  'sexual-figurative',
  'nudity',
  'graphic-media',
  'nsfw',
  '!hide',
])

// For adult posts nobody labeled. Deliberately broad: a few safe posts may be
// hidden too.
const ADULT_TAGS = /#(nsfw\w*|porn\w*|xxx\w*|onlyfans|fansly|lewd\w*)\b/i
const ADULT_DOMAINS =
  /porn|xxx|onlyfans|fansly|fanvue|manyvids|xvideos|xhamster|xnxx|chaturbate|redtube/i

// Checks the post, its author's account, the poster's own content warnings,
// hashtags and the linked site.
function isAdult(post: RawPost) {
  const labels = [
    ...(post.labels ?? []),
    ...(post.author.labels ?? []),
    ...(post.record.labels?.values ?? []),
  ]
  if (labels.some((label) => ADULT_LABELS.has(label.val))) return true

  const tags = (post.record.tags ?? []).map((tag) => `#${tag}`)
  if (ADULT_TAGS.test([post.record.text, ...tags].join(' '))) return true

  const domain = toLinkCard(post.embed)?.domain
  return domain !== undefined && ADULT_DOMAINS.test(domain)
}

// People can ask Bluesky not to show their posts to logged-out viewers. The
// feed is the same for everyone here, so they're always hidden.
function isLoggedInOnly(post: RawPost) {
  return post.author.labels?.some((label) => label.val === '!no-unauthenticated') ?? false
}

function toImage(embed?: RawEmbed): Image | undefined {
  if (!embed) return undefined

  if (embed.$type === 'app.bsky.embed.images#view' && embed.images?.length) {
    const first = embed.images[0]
    return {
      src: first.fullsize,
      alt: first.alt,
      width: first.aspectRatio?.width,
      height: first.aspectRatio?.height,
    }
  }

  if (embed.$type === 'app.bsky.embed.video#view' && embed.thumbnail) {
    return {
      src: embed.thumbnail,
      alt: embed.alt ?? '',
      width: embed.aspectRatio?.width,
      height: embed.aspectRatio?.height,
    }
  }

  if (embed.$type === 'app.bsky.embed.recordWithMedia#view') {
    return toImage(embed.media)
  }

  return undefined
}

function toLinkCard(embed?: RawEmbed): LinkCard | undefined {
  if (embed?.$type === 'app.bsky.embed.recordWithMedia#view') {
    return toLinkCard(embed.media)
  }
  if (embed?.$type !== 'app.bsky.embed.external#view' || !embed.external) {
    return undefined
  }
  const { uri, title, description, thumb } = embed.external
  // Any URI scheme is allowed in a post, so only keep real web links.
  let url: URL
  try {
    url = new URL(uri)
  } catch {
    return undefined
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined
  return { url: uri, domain: url.hostname, title, description, thumb }
}

function toPost(raw: RawPost): Post {
  return {
    id: raw.uri,
    author: {
      name: raw.author.displayName || raw.author.handle,
      handle: raw.author.handle,
      avatar: raw.author.avatar,
    },
    createdAt: raw.indexedAt,
    text: raw.record.text,
    image: toImage(raw.embed),
    link: toLinkCard(raw.embed),
    replies: raw.replyCount ?? 0,
    reposts: raw.repostCount ?? 0,
    likes: raw.likeCount ?? 0,
  }
}

export async function getPosts(cursor?: string): Promise<PostPage> {
  const page = await fetchPosts(cursor)
  return {
    posts: page.feed
      .map((item) => item.post)
      .filter((post) => !isAdult(post) && !isLoggedInOnly(post))
      .map(toPost),
    cursor: page.cursor,
  }
}

export type Tribute = {
  // When Bluesky's own account was created.
  since?: string
  // From the network stats service.
  users?: number
}

// Either source can fail on its own; only give up if neither has its stat.
export async function getTribute(): Promise<Tribute> {
  const [profile, network] = await Promise.allSettled([
    fetchProfile('bsky.app'),
    fetchNetworkStats(),
  ])

  const tribute: Tribute = {}

  if (profile.status === 'fulfilled' && profile.value.createdAt) {
    tribute.since = new Date(profile.value.createdAt).toLocaleDateString(
      'en-US',
      { month: 'long', year: 'numeric' },
    )
  }

  if (network.status === 'fulfilled') {
    tribute.users = network.value.total_users
  }

  if (!tribute.since && tribute.users === undefined) {
    throw new Error('No Bluesky stats available')
  }
  return tribute
}

export type Account = {
  did: string
  name: string
  handle?: string
  avatar?: string
}

// Undefined when signed out. A brand-new account may not be indexed by the
// AppView yet, so the profile is optional.
export async function getAccount(): Promise<Account | undefined> {
  const did = await restoreSession()
  if (!did) return undefined
  try {
    const profile = await fetchProfile(did)
    return {
      did,
      name: profile.displayName || profile.handle,
      handle: profile.handle,
      avatar: profile.avatar,
    }
  } catch {
    return { did, name: 'Your account' }
  }
}

// "@alice" -> "alice.bsky.social"; full handles and DIDs pass through.
function normalizeHandle(input: string) {
  const handle = input.trim().replace(/^@/, '')
  if (handle.includes('.') || handle.includes(':')) return handle
  return `${handle}.bsky.social`
}

export function logIn(handle: string) {
  return authorize(normalizeHandle(handle))
}

export function signUp() {
  return authorizeNewAccount()
}

export function logOut(account: Account) {
  return revokeSession(account.did)
}

// 47125738 -> "47.1M"
export function compact(n: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n)
}

// "now", "5m", "3h", "2d"
export function timeAgo(date: string) {
  const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  // Also covers a clock that's slightly behind the server's.
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}
