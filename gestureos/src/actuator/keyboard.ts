// On-screen keyboard for typing without a physical keyboard, docked at the bottom of the page.
// Keys are large targets so a pinch, a mouth-click or a dwell can hit them reliably.

export type KeyAction =
  | { type: 'char'; value: string }
  | { type: 'backspace' }
  | { type: 'enter' }
  | { type: 'space' }
  | { type: 'left' }
  | { type: 'right' }
  | { type: 'suggest'; value: string }

const LETTERS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'back'],
  ['123', 'left', 'space', 'right', '.', 'enter', 'close'],
]
const SYMBOLS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['@', '#', '₹', '&', '-', '+', '(', ')', '/'],
  ['=', '*', '"', "'", ':', ';', '!', '?', 'back'],
  ['abc', 'left', 'space', 'right', ',', 'enter', 'close'],
]
const LABELS: Record<string, string> = {
  shift: '⇧',
  back: '⌫',
  space: 'space',
  enter: 'return',
  close: 'hide',
  left: '←',
  right: '→',
  '123': '123',
  abc: 'ABC',
}

// Common English words, roughly by frequency, for next-word completion.
const WORDS = `the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is was are been has had were said did made find here thing many where right through long down should call world school still try last ask need too feel three state never become between high really something another family own leave put old while mean keep student why let great same big group begin seem country help talk turn problem every start hand might show part against place such again few case week company system each program question during government number night point home water room mother area money story young fact month lot study book eye job word business issue side kind head house service friend father power hour game line end member law car city community name president team minute idea kid body information nothing ago lead social understand whether watch together follow around parent stop face anything create public already speak others read level allow add office spend door health person art sure war history party within grow result open change morning walk reason low win research girl guy early food moment himself air teacher force offer enough education across although remember foot second boy maybe toward able age policy everything love process music including consider appear actually buy probably human wait serve market die send expect sense build stay fall oh nation plan cut college interest death course someone experience behind reach local kill six remain effect yeah suggest class control raise care perhaps late hard field else pass former sell major sometimes require along development themselves report role better economic effort decide rate strong possible heart drug show leader light voice wife whole police mind finally pull return free military price less according decision explain son hope develop view relationship carry town road drive arm true federal break difference thank receive value international building action full model join season society tax director position player agree especially record pick wear paper special space ground form support event official whose matter everyone center couple site project hit base activity star table need court produce eat american oil half situation easy cost industry figure street image itself phone either data cover quite picture clear practice piece land recent describe product doctor wall patient worker news test movie certain north personal simply third technology catch step baby computer type attention draw film tree source red nearly organization choose cause hair century evidence window difficult listen soon culture billion chance brother energy period summer realize hundred available plant likely opportunity term short letter condition choice single rule daughter administration south husband floor campaign material population economy medical hospital church close thousand risk current fire future wrong involve defense anyone increase security bank myself certainly west sport board seek per subject officer private rest behavior deal performance fight throw top quickly past goal bed order author fill represent focus foreign drop blood upon agency push nature color recently store reduce sound note fine near movement page enter share common poor natural race concern series significant similar hot language each usually response dead rise animal factor decade article shoot east save seven artist away scene stock career despite central eight thus treatment beyond happy exactly protect approach lie size dog fund serious occur media ready sign thought list individual simple quality pressure accept answer resource identify left meeting determine prepare disease whatever success argue cup particularly amount ability staff recognize indicate character growth loss degree wonder attack herself region television box training pretty trade election everybody physical lay general feeling standard bill message fail outside arrive analysis benefit sex forward lawyer present section environmental glass skill sister professor operation financial crime stage ok compare authority miss design sort act ten knowledge gun station blue strategy clearly discuss indeed truth song example democratic check environment leg dark various rather laugh guess executive prove hang entire rock forget claim remove manager enjoy network legal religious cold final main science green memory card above seat cell establish nice trial expert spring firm radio visit management avoid imagine tonight huge ball finish yourself theory impact respond statement maintain charge popular traditional onto reveal direction weapon employee cultural contain peace pain apply play measure wide shake fly interview manage chair fish particular camera structure politics perform bit weight suddenly discover candidate production treat trip evening affect inside conference unit style adult worry range mention deep edge specific writer trouble necessary throughout challenge fear shoulder institution middle sea dream bar beautiful property instead improve stuff hello thanks please search email video recipe weather tomorrow today`.split(' ')

export class Keyboard {
  readonly el: HTMLElement
  private root: ShadowRoot
  private layer: 'letters' | 'symbols' = 'letters'
  private shift = false
  private suggestions: string[] = []
  private onKey: (k: KeyAction) => void
  private onClose: () => void
  visible = false

  constructor(root: ShadowRoot, parent: HTMLElement, onKey: (k: KeyAction) => void, onClose: () => void) {
    this.root = root
    this.onKey = onKey
    this.onClose = onClose
    this.el = document.createElement('div')
    this.el.className = 'kbd'
    this.el.setAttribute('role', 'group')
    this.el.setAttribute('aria-label', 'On-screen keyboard')
    this.el.hidden = true
    // Keep focus in the page's text field when keys are clicked with a real mouse.
    this.el.addEventListener('mousedown', (e) => e.preventDefault())
    this.el.addEventListener('click', (e) => {
      const key = (e.target as Element).closest('[data-k]') as HTMLElement | null
      if (key) this.press(key)
    })
    parent.appendChild(this.el)
    this.render()
  }

  toggle(force?: boolean) {
    this.visible = force ?? !this.visible
    this.el.hidden = !this.visible
  }

  keyAt(x: number, y: number) {
    if (!this.visible) return null
    const hit = this.root.elementFromPoint(x, y)
    return (hit?.closest('[data-k]') as HTMLElement | null) ?? null
  }

  hover(key: HTMLElement | null) {
    this.el.querySelectorAll('.hot').forEach((k) => k !== key && k.classList.remove('hot'))
    key?.classList.add('hot')
  }

  contains(x: number, y: number) {
    if (!this.visible) return false
    const r = this.el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  }

  // Updates suggestions from the word being typed (text before the caret).
  setContext(before: string) {
    const m = /([a-zA-Z']+)$/.exec(before)
    const prefix = m ? m[1].toLowerCase() : ''
    this.suggestions = prefix.length ? WORDS.filter((w) => w.startsWith(prefix) && w !== prefix).slice(0, 3) : []
    const bar = this.el.querySelector('.sugg')
    if (bar)
      bar.innerHTML = this.suggestions.length
        ? this.suggestions.map((w) => `<button data-k="sugg:${w}">${w}</button>`).join('')
        : '<span>Suggestions appear as you type</span>'
  }

  press(key: HTMLElement) {
    const k = key.dataset.k!
    key.classList.add('down')
    setTimeout(() => key.classList.remove('down'), 140)
    if (k.startsWith('sugg:')) return this.onKey({ type: 'suggest', value: k.slice(5) })
    switch (k) {
      case 'shift':
        this.shift = !this.shift
        return this.render()
      case '123':
      case 'abc':
        this.layer = k === '123' ? 'symbols' : 'letters'
        return this.render()
      case 'close':
        this.toggle(false)
        return this.onClose()
      case 'back':
        return this.onKey({ type: 'backspace' })
      case 'enter':
        return this.onKey({ type: 'enter' })
      case 'space':
        return this.onKey({ type: 'space' })
      case 'left':
      case 'right':
        return this.onKey({ type: k })
      default: {
        const value = this.shift ? k.toUpperCase() : k
        if (this.shift) {
          this.shift = false
          this.render()
        }
        return this.onKey({ type: 'char', value })
      }
    }
  }

  private render() {
    const rows = this.layer === 'letters' ? LETTERS : SYMBOLS
    this.el.innerHTML =
      `<div class="sugg"><span>Suggestions appear as you type</span></div>` +
      rows
        .map(
          (row) =>
            `<div class="krow">${row
              .map((k) => {
                const label = LABELS[k] ?? (this.shift ? k.toUpperCase() : k)
                const wide = k === 'space' ? 'xwide' : ['shift', 'back', 'enter', '123', 'abc', 'close'].includes(k) ? 'wide' : ''
                const on = k === 'shift' && this.shift ? 'on' : ''
                return `<button class="key ${wide} ${on}" data-k="${k}" aria-label="${k}">${label}</button>`
              })
              .join('')}</div>`,
        )
        .join('')
  }
}

export const KEYBOARD_CSS = `
.kbd { position: fixed; left: 50%; bottom: 12px; transform: translateX(-50%); width: min(920px, calc(100vw - 24px)); padding: 10px; border-radius: 18px; background: rgba(14, 17, 28, .94); box-shadow: 0 20px 60px rgba(0,0,0,.4); pointer-events: auto; display: grid; gap: 8px; backdrop-filter: blur(12px); }
.kbd[hidden] { display: none; }
.sugg { display: flex; gap: 8px; min-height: 44px; align-items: center; padding: 0 4px; color: #8b93a7; font-size: 14px; }
.sugg button { flex: 1; min-height: 44px; border: 0; border-radius: 10px; background: rgba(91, 124, 255, .22); color: #fff; font: 600 17px system-ui, sans-serif; cursor: pointer; }
.krow { display: flex; gap: 8px; justify-content: center; }
.key { flex: 1; min-width: 0; min-height: 56px; border: 0; border-radius: 12px; background: #262b3b; color: #f3f5fb; font: 500 20px system-ui, sans-serif; cursor: pointer; transition: background .1s, transform .1s; }
.key.wide { flex: 1.6; font-size: 15px; }
.key.xwide { flex: 5; font-size: 15px; }
.key.on { background: #2f5bea; }
.key.hot, .sugg button.hot { background: #3a4466; box-shadow: 0 0 0 3px #5b7cff; }
.key.down, .sugg button.down { background: #2f5bea; transform: scale(.96); }
@media (max-width: 600px) { .key { min-height: 46px; font-size: 16px; } .krow { gap: 5px; } }
`
