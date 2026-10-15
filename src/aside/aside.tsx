import styles from './aside.module.css'

function Aside() {
  return (
    <aside className={styles.aside} aria-label="About">
      <p className={styles.label}>About r/popular</p>
    </aside>
  )
}

export default Aside
