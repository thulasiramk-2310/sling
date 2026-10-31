import {smooth} from './util.js'
import {ROAD_DECK_HEIGHT} from './route.js'

// The station driveway descends from its stone apron to the asphalt across the
// footway. Both the mesh and vehicle support use this same physical surface.
export const arrivalApronHeight=.145
export const arrivalSupportHeight=lateral=>ROAD_DECK_HEIGHT+(arrivalApronHeight-ROAD_DECK_HEIGHT)*smooth(4.35,8.6,Math.abs(lateral))
export const arrivalDrivewayWeight=u=>smooth(.068,.073,u)*(1-smooth(.093,.098,u))
export const arrivalFootwayHeight=(u,lateral)=>.19+(arrivalSupportHeight(lateral)-.19)*arrivalDrivewayWeight(u)
