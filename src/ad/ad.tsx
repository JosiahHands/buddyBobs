import piratesImage from '../media/pics/pirates.png'
import styles from './ad.module.css'

const gameUrl = 'https://flashmuseum.net/game/awesome-pirates-ic8/'

function Ad() {
  return (
    <aside className={styles.ad} aria-label="Sponsored">
      <a className={styles.card} href={gameUrl} target="_blank" rel="noopener noreferrer sponsored">
        <img
          className={styles.image}
          src={piratesImage}
          alt="Awesome Pirates game logo"
          width={422}
          height={319}
        />
        <div className={styles.body}>
          <h2 className={styles.title}>Awesome Pirates</h2>
          <p className={styles.text}>A gang of pirates wants your island’s treasure. Hold the fort.</p>
          <p className={styles.small}>Free · plays in your browser</p>
          <span className={styles.button}>Play now</span>
          <p className={styles.domain}>flashmuseum.net</p>
        </div>
      </a>
    </aside>
  )
}

export default Ad
