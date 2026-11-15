import {CatmullRomCurve3,Vector3} from 'three';
export const routePoints = [
 [110,66,155],[75,43,80],[49,31,16],[3,17,4],[-8,10,-13],
 [110,45,15],[290,100,80],[537,44,68],[505,21,9],[635,89,-60],
 [1050,88,-20],[1077,35,-145],[1014,20,-246],[1100,158,36],
];
const targets=[[-32,13,-35],[12,18,-13],[30,25,-7],[30,20,-7],[9,3,-12],
 [140,5,-25],[430,5,-25],[480,10,-30],[480,8,-30],[810,15,-130],
 [1000,28,-180],[1000,29,-180],[1000,22,-180],[1000,20,-180]];
export const cameraPath=new CatmullRomCurve3(routePoints.map(p=>new Vector3(...p as [number,number,number])),false,'centripetal');
export const targetPath=new CatmullRomCurve3(targets.map(p=>new Vector3(...p as [number,number,number])),false,'centripetal');
