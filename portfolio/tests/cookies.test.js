import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('gsap',()=>({default:{fromTo:vi.fn(),to:vi.fn((_target,options)=>options.onComplete?.())}}))

function page() {
  const data=new Map(),handlers=new Map(),scripts=[]
  const buttons=Object.fromEntries(['accept','reject','settings'].map(name=>[name,{addEventListener:(_event,callback)=>handlers.set(name,callback),focus(){document.activeElement=this}}]))
  const banner={hidden:true,querySelector:selector=>selector.includes('accept')?buttons.accept:buttons.reject,contains:node=>node===buttons.accept||node===buttons.reject}
  vi.stubGlobal('localStorage',{getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)})
  vi.stubGlobal('document',{querySelector:selector=>selector==='.cookie'?banner:buttons.settings,createElement:()=>({dataset:{}}),head:{append:script=>scripts.push(script)}})
  const location={href:'https://ram.example.test/',search:'',replace:vi.fn()}
  const replaceState=(_state,_title,url)=>{location.href=String(url);location.search=new URL(url).search}
  vi.stubGlobal('window',{location,history:{state:null,replaceState}})
  return {data,handlers,scripts,banner,location,buttons}
}

beforeEach(()=>{vi.resetModules();vi.stubEnv('VITE_PLAUSIBLE_DOMAIN','ram.example.test')})
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs()})

describe('analytics consent lifecycle',()=>{
  it('loads nothing before Accept, blocks subsequent events on Reject, and avoids duplicate SDKs on reaccept',async()=>{
    const p=page(),{initCookies}=await import('../src/cookies.js')
    initCookies().maybeShow()
    expect(p.scripts).toHaveLength(0)
    expect(p.banner.hidden).toBe(false)
    p.handlers.get('accept')()
    expect(p.scripts).toHaveLength(1)
    expect(p.scripts[0].dataset.domain).toBe('ram.example.test')
    expect(p.data.get('ram.cookies')).toBe('accepted')
    p.handlers.get('settings')();p.handlers.get('reject')()
    expect(p.data.get('ram.cookies')).toBe('rejected')
    expect(p.data.get('plausible_ignore')).toBe('true')
    p.handlers.get('accept')()
    expect(p.data.has('plausible_ignore')).toBe(false)
    expect(p.scripts).toHaveLength(1)
  })
  it('keeps a returning rejected visit free of the SDK',async()=>{
    const p=page();p.data.set('ram.cookies','rejected')
    const {initCookies}=await import('../src/cookies.js');initCookies().maybeShow()
    expect(p.scripts).toHaveLength(0);expect(p.banner.hidden).toBe(true)
  })
  it('waits for a chapter modal to restore, focuses a live choice and returns focus after withdrawal',async()=>{
    const p=page(),{initCookies}=await import('../src/cookies.js')
    let finish
    const restoredControl={focus(){document.activeElement=this}}
    initCookies({beforeSettings:()=>new Promise(resolve=>{finish=()=>{restoredControl.focus();resolve()}})})
    const opening=p.handlers.get('settings')()
    expect(p.banner.hidden).toBe(true)
    finish();await opening
    expect(p.banner.hidden).toBe(false)
    expect(document.activeElement).toBe(p.buttons.reject)
    p.handlers.get('reject')()
    expect(p.banner.hidden).toBe(true)
    expect(document.activeElement).toBe(restoredControl)
    expect(p.scripts).toHaveLength(0)
  })
  it('preserves withdrawal across a reload when storage is read-only',async()=>{
    const p=page(),{initCookies}=await import('../src/cookies.js');initCookies();p.handlers.get('accept')()
    vi.stubGlobal('localStorage',{getItem:key=>p.data.get(key)??null,setItem:()=>{throw new Error('Storage read-only')},removeItem:()=>{throw new Error('Storage read-only')}})
    p.handlers.get('reject')()
    expect(p.data.get('ram.cookies')).toBe('accepted')
    expect(window.location.replace).toHaveBeenCalledOnce()
    const cleanURL=window.location.replace.mock.calls[0][0]
    expect(new URL(cleanURL).searchParams.get('analytics')).toBe('off')
    const next=page();next.data.set('ram.cookies','accepted');next.location.href=cleanURL;next.location.search=new URL(cleanURL).search
    vi.resetModules()
    const clean=await import('../src/cookies.js');clean.initCookies()
    expect(next.scripts).toHaveLength(0)
    next.handlers.get('accept')()
    expect(next.scripts).toHaveLength(1)
    expect(new URL(next.location.href).searchParams.has('analytics')).toBe(false)
  })
})
