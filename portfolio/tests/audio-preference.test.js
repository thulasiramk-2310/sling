import {it,expect,vi,afterEach} from 'vitest'
afterEach(()=>vi.unstubAllGlobals())
it('starts quietly and remembers an explicit sound preference without requiring storage',async()=>{
  for(const [stored,expected] of [[null,true],['1',true],['0',false]]){
    vi.resetModules();vi.stubGlobal('localStorage',{getItem:()=>stored,setItem:vi.fn()})
    const {audio}=await import('../src/audio.js')
    expect(audio.isMuted()).toBe(expected)
    audio.setMuted(!expected)
    expect(audio.isMuted()).toBe(!expected)
    expect(localStorage.setItem).toHaveBeenCalledWith('ram.muted',expected?'0':'1')
  }
  vi.resetModules();vi.stubGlobal('localStorage',{getItem(){throw new Error('Disabled')}})
  const {audio}=await import('../src/audio.js');expect(audio.isMuted()).toBe(true)
})
