import Notice from './components/Notice/Notice'
import Header from './components/Header/Header'
import Ad from './components/Ad/Ad'
import Feed from './components/Feed/Feed'
import About from './components/About/About'
import Footer from './components/Footer/Footer'
import styles from './App.module.css'

function App() {
  return (
    <>
      <Notice />
      <div className={styles.app}>
        <Header />
        <Ad />
        <Feed />
        <About />
        <Footer />
      </div>
    </>
  )
}

export default App
