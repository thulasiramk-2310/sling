// Scroll is story time. The vehicle remains parked during the greeting, bridge
// flight and introduction; road distance only advances during riding chapters.
import { clamp, smooth } from './util.js'
export const STORY_STOPS=[.245,.49,.635,.725,.815,.915]
export const ROAD_STOPS=[.07,.27,.47,.64,.79,.96]
const TRAVEL=[[0,.07],[.32,.07],[.50,.27],[.64,.47],[.73,.64],[.85,.83],[.92,.96],[1,.96]]
export function storyAt(progress) {
  const p=clamp(progress,0,1)
  let i=0
  while(i<TRAVEL.length-2 && p>TRAVEL[i+1][0]) i++
  const [a,u0]=TRAVEL[i],[b,u1]=TRAVEL[i+1]
  const road=u0+(u1-u0)*smooth(a,b,p)
  const stage=p<.08?'greeting':p<.195?'bridge-flight':p<.32?'introduction':p<.50?'skills':p<.64?'projects':p<.73?'experience':p<.85?'rameswaram':p<.92?'kanyakumari':p<.975?'ascent':'connections'
  return {progress:p,road,stage,boarding:smooth(.285,.325,p),ascent:smooth(.92,.99,p),intro:smooth(.185,.215,p)*(1-smooth(.285,.325,p))}
}
export function chapterAt(progress) {
  const p=clamp(progress,0,1)
  if(p<.32)return 0
  if(p<.50)return 1
  if(p<.64)return 2
  if(p<.73)return 3
  if(p<.85)return 4
  return 5
}
