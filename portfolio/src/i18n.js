// English / Tamil switching. Elements marked data-i18n="key" get their text from content.js.
import { STRINGS } from './content.js'

const KEY = 'ram.lang'
let lang = 'en'

export function initLang() {
  try {
    lang = localStorage.getItem(KEY) === 'ta' ? 'ta' : 'en'
  } catch {
    lang = 'en'
  }
  apply()
}

export const getLang = () => lang

// Looks up one string in the current language, falling back to English.
export const t = (key) => STRINGS[lang][key] ?? STRINGS.en[key] ?? key

export function setLang(next) {
  lang = next === 'ta' ? 'ta' : 'en'
  try {
    localStorage.setItem(KEY, lang)
  } catch {
    // Private mode: the choice lasts for this visit.
  }
  apply()
  window.dispatchEvent(new CustomEvent('langchange', { detail: lang }))
}

// Writes the current language into the page.
export function apply(root = document) {
  document.documentElement.lang = lang === 'ta' ? 'ta' : 'en'
  root.querySelectorAll('[data-i18n]').forEach((el) => (el.textContent = t(el.dataset.i18n)))
  // data-i18n-attr="aria-label:key,title:key2"
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(',')) {
      const [attr, key] = pair.split(':')
      el.setAttribute(attr.trim(), t(key.trim()))
    }
  })
}
