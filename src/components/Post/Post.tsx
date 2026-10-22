import { timeAgo } from '../../bluesky/bluesky'
import type { Post as PostData } from '../../bluesky/bluesky'
import styles from './Post.module.css'

function Post({ post }: { post: PostData }) {
  const { author, image, link } = post

  return (
    <article className={styles.post}>
      <p className={styles.meta}>
        {author.avatar && (
          <img className={styles.avatar} src={author.avatar} alt="" width={20} height={20} loading="lazy" />
        )}
        <span className={styles.name}>{author.name}</span>
        <span className={styles.handle}>{`· @${author.handle} · ${timeAgo(post.createdAt)}`}</span>
      </p>

      {post.text && <p className={styles.text}>{post.text}</p>}

      {image && (
        <img
          className={styles.image}
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          loading="lazy"
          onError={(e) => (e.currentTarget.hidden = true)}
        />
      )}

      {link && (
        <a className={styles.link} href={link.url} target="_blank" rel="noopener noreferrer">
          {link.thumb && <img className={styles.linkThumb} src={link.thumb} alt="" loading="lazy" />}
          <span className={styles.linkBody}>
            <span className={styles.linkTitle}>{link.title}</span>
            {link.description && <span className={styles.linkText}>{link.description}</span>}
            <span className={styles.linkDomain}>{link.domain}</span>
          </span>
        </a>
      )}

      <p className={styles.stats}>
        {`${post.likes.toLocaleString()} likes · ${post.reposts.toLocaleString()} reposts · ${post.replies.toLocaleString()} replies`}
      </p>
    </article>
  )
}

export default Post
