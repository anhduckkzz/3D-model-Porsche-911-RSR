import * as T from 'three';
import type {ModelData,Part} from './model-types';

export type MountAnchor={partId:number;code:string;hole:number;world:[number,number,number];local:[number,number,number]};
export type MountInstallation={origin:[number,number,number];rotation:[number,number,number,number];forward:[number,number,number];right:[number,number,number];anchors:[MountAnchor,MountAnchor,MountAnchor,MountAnchor];leftPartId:number;rightPartId:number;railLayerMode:-1|1;crossCode:string;crossSpan:number;confidence:number};

const LEFT_RAIL=338,RIGHT_RAIL=337,HOLES=15,ANCHOR_INTERVALS=8;
const tuple=(v:T.Vector3)=>v.toArray() as [number,number,number];
const matrixOf=(p:Part)=>new T.Matrix4().fromArray(p.matrix);
const originOf=(p:Part)=>new T.Vector3().setFromMatrixPosition(matrixOf(p));
const holeWorld=(p:Part,hole:number)=>new T.Vector3(0,0,(hole-(HOLES-1)/2)*20).applyMatrix4(matrixOf(p));
const axisWorld=(p:Part,axis:T.Vector3)=>axis.clone().transformDirection(matrixOf(p)).normalize();

function groupCenter(model:ModelData,group:string){
 const parts=model.parts.filter(p=>p.group===group);if(!parts.length)return null;
 const center=new T.Vector3();for(const p of parts)center.add(originOf(p));return center.multiplyScalar(1/parts.length);
}

function partWorldBox(model:ModelData,p:Part){
 const bounds=model.geometries[p.geo]?.bounds;if(!bounds?.[0]||!bounds?.[1])return null;
 const lo=bounds[0],hi=bounds[1];
 const min=new T.Vector3(lo[0]??0,lo[1]??0,lo[2]??0),max=new T.Vector3(hi[0]??0,hi[1]??0,hi[2]??0),m=matrixOf(p),box=new T.Box3();
 for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z])box.expandByPoint(new T.Vector3(x,y,z).applyMatrix4(m));
 return box;
}

function holeOccupied(model:ModelData,rail:Part,hole:number){
 const point=holeWorld(rail,hole),axis=axisWorld(rail,new T.Vector3(0,1,0));
 return model.parts.some(p=>{
  if(p.id===rail.id||!/Pin |Axle /i.test(model.geometries[p.geo]?.description??''))return false;
  const d=originOf(p).sub(point),along=d.dot(axis);
  return Math.abs(along)<.4&&d.addScaledVector(axis,-along).length()<.06;
 });
}

/**
 * Conservative add-on clearance test.  We only inspect the outward insertion
 * corridor used by the new anchor pin/base rail.  It intentionally refuses a
 * candidate if intact cockpit/body geometry occupies that corridor instead of
 * hiding/removing the stock piece to make the render work.
 */
function outwardBlocked(model:ModelData,rail:Part,hole:number,outward:T.Vector3){
 const point=holeWorld(rail,hole),groups=new Set(['cockpit','doors','roof','front','rear']);
 const blockers=model.parts.filter(p=>p.id!==rail.id&&groups.has(p.group)).map(p=>partWorldBox(model,p)).filter((b):b is T.Box3=>!!b);
 for(const distance of [.14,.2,.28,.36]){
  const sample=point.clone().addScaledVector(outward,distance);
  if(blockers.some(box=>box.clone().expandByScalar(.012).containsPoint(sample)))return true;
 }
 return false;
}

/**
 * Resolve a zero-removal mounting window on the two authored 15L chassis rails.
 * The rail identity is fixed to the real structural pair; only the 9L hole
 * window is allowed to move.  Every selected hole must be empty and reachable
 * from the outside on the intact model.  If no such set exists, return null —
 * never guess a prettier xyz or silently remove stock bodywork.
 */
export function resolvePhoneMountInstallation(model:ModelData):MountInstallation|null{
 const left=model.parts.find(p=>p.id===LEFT_RAIL),rightRail=model.parts.find(p=>p.id===RIGHT_RAIL);
 if(!left||!rightRail||left.group!=='chassis'||rightRail.group!=='chassis')return null;
 if(model.geometries[left.geo]?.name!=='32278.dat'||model.geometries[rightRail.geo]?.name!=='32278.dat')return null;

 const leftCenter=originOf(left),rightCenter=originOf(rightRail),right=rightCenter.clone().sub(leftCenter).normalize();
 let forward=axisWorld(left,new T.Vector3(0,0,1));
 const front=groupCenter(model,'front'),rear=groupCenter(model,'rear');if(front&&rear&&forward.dot(front.clone().sub(rear))<0)forward.negate();
 const up=forward.clone().cross(right).normalize();right.copy(up).cross(forward).normalize();
 const leftBore=axisWorld(left,new T.Vector3(0,1,0)),rightBore=axisWorld(rightRail,new T.Vector3(0,1,0));
 if(Math.abs(leftBore.dot(right))<.995||Math.abs(rightBore.dot(right))<.995)return null;

 const candidates:{start:number;score:number}[]=[];
 for(let start=0;start+ANCHOR_INTERVALS<HOLES;start++){
  const end=start+ANCHOR_INTERVALS,holes=[[left,start,-1],[left,end,-1],[rightRail,start,1],[rightRail,end,1]] as const;
  if(holes.some(([rail,h])=>holeOccupied(model,rail,h)))continue;
  if(holes.some(([rail,h,side])=>outwardBlocked(model,rail,h,right.clone().multiplyScalar(side))))continue;
  candidates.push({start,score:Math.abs(start-5)});
 }
 if(!candidates.length)return null;
 candidates.sort((a,b)=>a.score-b.score||a.start-b.start);
 const start=candidates[0].start,end=start+ANCHOR_INTERVALS;
 const selected=[[left,start],[left,end],[rightRail,start],[rightRail,end]] as const;
 const points=selected.map(([rail,hole])=>holeWorld(rail,hole));
 const origin=points.reduce((sum,p)=>sum.add(p),new T.Vector3()).multiplyScalar(.25);
 const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward)),inverse=q.clone().invert();
 const anchors=selected.map(([rail,hole],i)=>({partId:rail.id,code:'32278',hole,world:tuple(points[i]),local:tuple(points[i].clone().sub(origin).applyQuaternion(inverse))})) as MountInstallation['anchors'];

 // A 9L add-on base uses exactly eight 8 mm intervals.  The structural rails
 // should therefore resolve to ±1.0 laterally and ±0.8 longitudinally.
 for(let i=0;i<anchors.length;i++){
  const a=anchors[i].local,side=i<2?-1:1;
  if(Math.abs(a[0]-side)>.025||Math.abs(a[1])>.025||Math.abs(Math.abs(a[2])-.8)>.025)return null;
 }
 const confidence=Math.max(.72,1-candidates[0].score*.06);
 return {origin:tuple(origin),rotation:q.toArray() as [number,number,number,number],forward:tuple(forward),right:tuple(right),anchors,leftPartId:left.id,rightPartId:rightRail.id,railLayerMode:1,crossCode:'41239',crossSpan:4.4,confidence};
}
