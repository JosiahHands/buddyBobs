import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../store.ts'
import { fetchHomePosts, fetchMorePosts, voteOnPost } from './postsSlice.ts'
import Comments from '../comments/comments.tsx'
import Votes from '../votes/votes.tsx'
import CreatePost from '../createPost/createPost.tsx'
import { getPostImage } from '../lemmy/postImage.ts'
import { timeAgo } from '../utils/timeAgo.ts'
import styles from './main.module.css'

function Main() {
  const dispatch = useAppDispatch()
  const { items: posts, nextPage, status, moreStatus, error } = useAppSelector(
    (state) => state.posts,
  )
  const jwt = useAppSelector((state) => state.auth.jwt)
  const [hasLoadedMore, setHasLoadedMore] = useState(false)

  // Reload on login/logout so the feed shows that user's votes
  useEffect(() => {
    dispatch(fetchHomePosts())
  }, [dispatch, jwt])

  function viewMore() {
    if (!nextPage) return
    dispatch(fetchMorePosts(nextPage))
    setHasLoadedMore(true)
  }

  function backToTop() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  let feedStatus = null
  if (status === 'loading') feedStatus = 'Loading…'
  if (status === 'failed') feedStatus = `Couldn’t load posts: ${error}`

  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Latest posts</h1>
          {feedStatus && <p className={styles.subtitle}>{feedStatus}</p>}
        </div>
        <CreatePost />
      </div>
      <ul className={styles.feed}>
        {posts.map((postView) => {
          const { post, creator, community, counts } = postView
          const image = getPostImage(postView)
          return (
            <li key={post.id}>
              <article className={styles.post}>
                <p className={styles.meta}>
                  c/{community.name} · @{creator.name} · {timeAgo(post.published)}
                </p>
                <h2 className={styles.postTitle}>{post.name}</h2>
                {image && (
                  <img
                    className={styles.image}
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    loading="lazy"
                    // Some images live on other servers that may be down
                    onError={(e) => (e.currentTarget.hidden = true)}
                  />
                )}
                {post.body && <p className={styles.text}>{post.body}</p>}
                <Comments postId={post.id} count={counts.comments}>
                  <Votes
                    score={counts.score}
                    myVote={postView.my_vote}
                    onVote={(score) => dispatch(voteOnPost({ postId: post.id, score })).unwrap()}
                  />
                </Comments>
              </article>
            </li>
          )
        })}
      </ul>
      {status === 'succeeded' && (
        <div className={styles.more}>
          {nextPage && (
            <button
              type="button"
              className={styles.control}
              onClick={viewMore}
              disabled={moreStatus === 'loading'}
            >
              {moreStatus === 'loading' ? 'Loading…' : 'View more'}
            </button>
          )}
          {hasLoadedMore && (
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

export default Main
