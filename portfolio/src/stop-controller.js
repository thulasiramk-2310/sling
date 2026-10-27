import { STORY_STOPS } from './scene/story.js'

// A scroll gesture may request the end, but it cannot acknowledge a stop.
// Leaving the reading band (or choosing a navigation shortcut) releases it.
export function createStopController(stops=STORY_STOPS) {
  let next=0,held=null,direction=1,explicit=false
  return {
    target(requested,position) {
      if(held!==null)return stops[held]
      if(!explicit && Number.isFinite(position) && Math.abs(requested-position)>.001) {
        const intent=Math.sign(requested-position)
        if(intent!==direction) {
          direction=intent
          if(direction>0) {
            next=stops.findIndex(stop=>stop>position+.0004)
            if(next<0)next=stops.length
          }else next=stops.findLastIndex(stop=>stop<position-.0004)
        }
      }
      return direction>0?Math.min(requested,stops[next]??1):Math.max(requested,stops[next]??0)
    },
    arrive(position) {
      if(held!==null || next<0 || next>=stops.length || Math.abs(position-stops[next])>.0004)return null
      held=next;explicit=false;return held
    },
    release(leaving=1){if(held===null)return false;direction=leaving<0?-1:1;next=held+direction;held=null;explicit=false;return true},
    visit(index,position){next=Math.max(0,Math.min(stops.length-1,index));held=null;explicit=true;direction=Number.isFinite(position)?Math.sign(stops[next]-position)||direction:1},
    state:()=>({next,held,direction}),
  }
}
