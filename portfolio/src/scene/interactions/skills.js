import { SKILLS } from '../../content.js'
export const SKILL_MARKERS=SKILLS.map((name,index)=>({name,u:.087+index*.0155}))

export function createSkillCollection() {
  const collected=new Set()
  let previous=.07
  return {
    seek(road){previous=road},
    update(road) {
      if(road>previous) for(const marker of SKILL_MARKERS) {
        if(previous<marker.u && road>=marker.u)collected.add(marker.name)
      }
      previous=road
      return SKILLS.filter(name=>collected.has(name))
    },
    next(road){return (SKILL_MARKERS.find(marker=>marker.u>=road)??SKILL_MARKERS.at(-1)).name},
    has:name=>collected.has(name),
  }
}
