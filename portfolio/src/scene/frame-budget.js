// Render cadence is measured before simulation delta is clamped. Long visible
// frames are evidence of overload; filtering them out hides the slowest GPUs.
export function createFrameBudget(startTime) {
  let windowStart=startTime,total=0,count=0,skipNext=false
  const reset=now=>{windowStart=now;total=0;count=0;skipNext=true}
  return {
    reset,
    sample(deltaSeconds,now,visible=true) {
      if(!visible){reset(now);return null}
      if(skipNext){skipNext=false;windowStart=now;return null}
      if(!Number.isFinite(deltaSeconds) || deltaSeconds<=0)return null
      total+=deltaSeconds;count++
      if(now-windowStart<2500 || (count<4 && deltaSeconds<.5))return null
      const fps=count/total
      windowStart=now;total=0;count=0
      return fps
    },
  }
}
