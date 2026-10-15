import styles from './main.module.css'

const posts = [
  {
    subreddit: 'r/pics',
    author: 'u/foggymornings',
    age: '2h',
    title: 'Sunrise over the fog in the valley this morning',
    text: 'Woke up early on a hunch and it paid off. Shot on my phone, no edits.',
  },
  {
    subreddit: 'r/reactjs',
    author: 'u/hooked_on_hooks',
    age: '3h',
    title: 'What finally made hooks click for you?',
    text: 'I understand the rules, but I still reach for classes in my head. Looking for the mental model that worked for you.',
  },
  {
    subreddit: 'r/askscience',
    author: 'u/stargazer42',
    age: '4h',
    title: 'Why do some stars appear to twinkle more than others?',
    text: 'Noticed last night that stars near the horizon flicker way more than the ones overhead.',
  },
  {
    subreddit: 'r/webdev',
    author: 'u/plainhtml',
    age: '5h',
    title: 'I rebuilt my portfolio with zero JavaScript',
    text: 'Just HTML and CSS. It loads instantly and I honestly don’t miss anything.',
  },
  {
    subreddit: 'r/books',
    author: 'u/dogearedpages',
    age: '6h',
    title: 'Books you reread every year?',
    text: 'Mine is a worn copy of a fantasy series I first read in middle school. What are yours?',
  },
  {
    subreddit: 'r/cooking',
    author: 'u/slowdough',
    age: '7h',
    title: 'Tried a 72-hour pizza dough, worth it',
    text: 'Cold fermented for three days. The crust had way more flavor and the bubbles were unreal.',
  },
  {
    subreddit: 'r/space',
    author: 'u/junocam_fan',
    age: '8h',
    title: 'New images of Jupiter’s south pole',
    text: 'The cyclones look like brushstrokes. Full-resolution versions are linked in the comments.',
  },
  {
    subreddit: 'r/gaming',
    author: 'u/chiptune_heart',
    age: '9h',
    title: 'The most underrated soundtrack of all time',
    text: 'I still hum the title theme from a game almost nobody played. Share yours.',
  },
  {
    subreddit: 'r/todayilearned',
    author: 'u/cephalopod_facts',
    age: '10h',
    title: 'TIL octopuses have three hearts',
    text: 'Two pump blood to the gills and one pumps it to the rest of the body.',
  },
]

function Main() {
  return (
    <main className={styles.main}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>r/popular</h1>
          <p className={styles.subtitle}>Latest posts</p>
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.control}>Filter</button>
          <button type="button" className={styles.control}>Sort</button>
        </div>
      </div>
      <ul className={styles.feed}>
        {posts.map((post) => (
          <li key={post.title}>
            <article className={styles.post}>
              <p className={styles.meta}>
                {post.subreddit} · {post.author} · {post.age}
              </p>
              <h2 className={styles.postTitle}>{post.title}</h2>
              <p className={styles.text}>{post.text}</p>
            </article>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default Main
