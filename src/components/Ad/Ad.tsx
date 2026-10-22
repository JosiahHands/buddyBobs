import piratesImg from './pirates.webp'
import styles from './Ad.module.css'

const GAME_URL = 'https://flashmuseum.net/game/awesome-pirates-ic8/'

function Ad() {
  return (
    <aside className={styles.ad} aria-label="Sponsored">
      <a
        className={styles.card}
        href={GAME_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
      >
        <img
          className={styles.image}
          src={piratesImg}
          alt="Awesome Pirates game logo"
          width={422}
          height={319}
        />
        <div className={styles.body}>
          <h2 className={styles.title}>Awesome Pirates</h2>
          <p className={styles.text}>
            Defend your fortress from a gang of unruly buccaneers out to pillage
            your island’s treasure.
          </p>
          <p className={styles.small}>Action · Artillery · ★ 4.5</p>
          <span className={styles.button}>Play now</span>
          <p className={styles.domain}>flashmuseum.net</p>
        </div>
      </a>
    </aside>
  )
}

export default Ad
