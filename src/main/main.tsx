import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store.ts'
import { fetchHomePosts } from './postsSlice.ts'
import styles from './main.module.css'

// Turns an ISO timestamp into a short age like "5m", "3h" or "2d"
function timeAgo(published: string) {
  const minutes = Math.floor((Date.now() - new Date(published).getTime()) / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function Main() {
  const dispatch = useAppDispatch()
  const { items: posts, status, error } = useAppSelector((state) => state.posts)

  useEffect(() => {
    dispatch(fetchHomePosts())
  }, [dispatch])

  let subtitle = 'Latest posts'
  if (status === 'loading') subtitle = 'Loading…'
  if (status === 'failed') subtitle = `Couldn’t load posts: ${error}`

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Home</h1>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.control}>Filter</button>
          <button type="button" className={styles.control}>Sort</button>
        </div>
      </div>
      <ul className={styles.feed}>
        {posts.map(({ post, creator, community }) => (
          <li key={post.id}>
            <article className={styles.post}>
              <p className={styles.meta}>
                c/{community.name} · @{creator.name} · {timeAgo(post.published)}
              </p>
              <h2 className={styles.postTitle}>{post.name}</h2>
              {post.body && <p className={styles.text}>{post.body}</p>}
            </article>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default Main
