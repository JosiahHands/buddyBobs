// CSS modules in tests: styles.post returns "post", so class names stay readable
export default new Proxy({}, { get: (_, key) => key })
