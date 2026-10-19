// Typing animation for the role line: types a phrase, waits, deletes it, moves on to the next.
export function startTyping(el, getPhrases, { reduced = false } = {}) {
  let run = 0
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  async function loop(id) {
    let i = 0
    while (id === run) {
      const phrase = getPhrases()[i % getPhrases().length]
      for (let n = 1; n <= phrase.length && id === run; n++) {
        el.textContent = phrase.slice(0, n)
        await sleep(55 + Math.random() * 45)
      }
      if (reduced) return
      await sleep(1700)
      for (let n = phrase.length; n >= 0 && id === run; n--) {
        el.textContent = phrase.slice(0, n)
        await sleep(28)
      }
      await sleep(260)
      i++
    }
  }

  return {
    // Starts over, for example after the language changes.
    restart() {
      run++
      el.textContent = ''
      loop(run)
    },
  }
}
