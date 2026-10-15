import Header from './header/header.tsx'
import Nav from './nav/nav.tsx'
import Ad from './ad/ad.tsx'
import Main from './main/main.tsx'
import Aside from './aside/aside.tsx'
import Footer from './footer/footer.tsx'
import styles from './App.module.css'

function App() {
  return (
    <div className={styles.app}>
      <Header>
        <Nav />
      </Header>
      <Ad />
      <Main />
      <Aside />
      <Footer />
    </div>
  )
}

export default App
