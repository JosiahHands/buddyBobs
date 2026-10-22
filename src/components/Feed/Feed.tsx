import { useEffect, useState } from 'react'
import { getPosts } from '../../bluesky/bluesky'
import type { Post as PostData } from '../../bluesky/bluesky'
import Post from '../Post/Post'
import styles from './Feed.module.css'

type Status = 'loading' | 'succeeded' | 'failed'

function Feed() {
  const [posts, setPosts] = useState<PostData[]>([])
  const [cursor, setCursor] = useState<string>()
  const [status, setStatus] = useState<Status>('loading')
  const [moreStatus, setMoreStatus] = useState<Status>('succeeded')
  const [error, setError] = useState<string>()
  const [loadedMore, setLoadedMore] = useState(false)

  useEffect(() => {
    let ignore = false
    getPosts().then(
      (page) => {
        if (ignore) return
        setPosts(page.posts)
        setCursor(page.cursor)
        setStatus('succeeded')
      },
      (e: Error) => {
        if (ignore) return
        setError(e.message)
        setStatus('failed')
      },
    )
    return () => {
      ignore = true
    }
  }, [])

  async function loadMore() {
    setMoreStatus('loading')
    try {
      const page = await getPosts(cursor)
      // Discover can repeat posts across pages.
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...page.posts.filter((p) => !seen.has(p.id))]
      })
      setCursor(page.cursor)
      setMoreStatus('succeeded')
      setLoadedMore(true)
    } catch (e) {
      setError((e as Error).message)
      setMoreStatus('failed')
    }
  }

  function backToTop() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }

  let subtitle = null
  if (status === 'loading') subtitle = 'Loading…'
  if (status === 'failed') subtitle = `Couldn’t load posts: ${error}`
  if (status === 'succeeded' && posts.length === 0) subtitle = 'No posts yet.'

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Top posts</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
      </div>

      <ul className={styles.feed}>
        {posts.map((post) => (
          <li key={post.id}>
            <Post post={post} />
          </li>
        ))}
      </ul>

      {status === 'succeeded' && (
        <div className={styles.more}>
          {cursor && (
            <button
              type="button"
              className={styles.control}
              onClick={loadMore}
              disabled={moreStatus === 'loading'}
            >
              {moreStatus === 'loading' ? 'Loading…' : 'View more'}
            </button>
          )}
          {loadedMore && (
            <button type="button" className={styles.control} onClick={backToTop}>
              Back to top
            </button>
          )}
          {moreStatus === 'failed' && (
            <p className={styles.subtitle}>Couldn’t load more posts: {error}</p>
          )}
        </div>
      )}
    </main>
  )
}

export default Feed
