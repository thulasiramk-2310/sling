import {it,expect,vi,afterEach} from 'vitest'
import {startTyping} from '../src/typing.js'
afterEach(()=>vi.useRealTimers())
it('shows the complete role immediately for reduced motion and cancels an active typing loop',async()=>{
  vi.useFakeTimers()
  const element={textContent:''},phrase='CS (AI & ML) student'
  const typing=startTyping(element,()=>[phrase],{reduced:true})
  typing.restart();expect(element.textContent).toBe(phrase)
  await vi.advanceTimersByTimeAsync(2000);expect(element.textContent).toBe(phrase)
  typing.setReducedMotion(false);expect(element.textContent).toBe('C')
  await vi.advanceTimersByTimeAsync(200);expect(element.textContent).not.toBe(phrase)
  typing.setReducedMotion(true);expect(element.textContent).toBe(phrase)
  await vi.advanceTimersByTimeAsync(4000);expect(element.textContent).toBe(phrase)
})
