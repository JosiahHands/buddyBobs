import styles from './ad.module.css'

function Ad() {
  return (
    <aside className={styles.ad} aria-label="Sponsored">
      <p className={styles.label}>Sponsored</p>
    </aside>
  )
}

export default Ad
