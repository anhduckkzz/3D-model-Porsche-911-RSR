import * as T from 'three';
import type {ModelData,Part} from './model-types';

const STRAIGHT_BEAMS:Record<string,number>={
 '32524':7,'40490':9,'32525':11,'41239':13,'32278':15,'32316':5,'32523':3
};
const CROSS_BEAMS=[
 {code:'32524',holes:7,span:1.2},
 {code:'40490',holes:9,span:1.6},
 {code:'32525',holes:11,span:2.0},
 {code:'41239',holes:13,span:2.4},
 {code:'32278',holes:15,span:2.8},
] as const;
const STUD=.2;
const BASE_INTERVALS=6; // a 7L beam between two real chassis holes
const LAYER=STUD;

type RailCandidate={
 part:Part;code:string;holes:number;side:number;
 a:T.Vector3;b:T.Vector3;mid:T.Vector3;
 longitudinal:number;lateral:number;height:number;
 axisScore:number;boreScore:number;
};
export type MountAnchor={
 partId:number;code:string;hole:number;world:[number,number,number];local:[number,number,number];
};
export type MountInstallation={
 origin:[number,number,number];rotation:[number,number,number,number];
 forward:[number,number,number];right:[number,number,number];
 anchors:[MountAnchor,MountAnchor,MountAnchor,MountAnchor];
 leftPartId:number;rightPartId:number;
 railLayerMode:-1|1;crossCode:string;crossSpan:number;
 confidence:number;
};

function partOrigin(part:Part){return new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(part.matrix))}
function groupCenter(model:ModelData,group:string){
 const parts=model.parts.filter(p=>p.group===group);if(!parts.length)return null;
 const out=new T.Vector3();for(const p of parts)out.add(partOrigin(p));return out.multiplyScalar(1/parts.length);
}
function range(values:number[]){return {min:Math.min(...values),max:Math.max(...values)}}
function codeOf(model:ModelData,p:Part){return model.geometries[p.geo]?.name.replace(/\.dat$/i,'')??''}
function holeWorld(part:Part,index:number,holes:number){
 const z=(index-(holes-1)/2)*20;
 return new T.Vector3(0,0,z).applyMatrix4(new T.Matrix4().fromArray(part.matrix));
}
function transformedAxis(part:Part,axis:T.Vector3){return axis.clone().transformDirection(new T.Matrix4().fromArray(part.matrix)).normalize()}
function nearestCross(span:number){return CROSS_BEAMS.map(b=>({...b,error:Math.abs(b.span-span)})).sort((a,b)=>a.error-b.error)[0]}

/**
 * Resolve four mounting hardpoints from authored Technic beam holes in the
 * chassis group. No guessed xyz mount position is returned: every anchor is a
 * transformed hole center of a real beam instance from model.json.
 */
export function resolvePhoneMountInstallation(model:ModelData):MountInstallation|null{
 const front=groupCenter(model,'front'),rear=groupCenter(model,'rear');if(!front||!rear)return null;
 const forward=front.clone().sub(rear);forward.y=0;if(forward.lengthSq()<1e-6)return null;forward.normalize();
 const right=new T.Vector3(forward.z,0,-forward.x).normalize(),up=new T.Vector3(0,1,0);
 const origins=model.parts.map(partOrigin),center=origins.reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(1/Math.max(1,origins.length));
 const longitudinalRange=range(origins.map(p=>p.clone().sub(center).dot(forward))),lateralRange=range(origins.map(p=>p.clone().sub(center).dot(right)));
 const carLength=Math.max(.1,longitudinalRange.max-longitudinalRange.min),carWidth=Math.max(.1,lateralRange.max-lateralRange.min);
 const targetLong=-carLength*.06;
 const chassis=model.parts.filter(p=>p.group==='chassis');
 const raw:RailCandidate[]=[];
 for(const part of chassis){
  const code=codeOf(model,part),holes=STRAIGHT_BEAMS[code];if(!holes||holes<BASE_INTERVALS+1)continue;
  const axis=transformedAxis(part,new T.Vector3(0,0,1)),bore=transformedAxis(part,new T.Vector3(0,1,0));
  const axisScore=Math.abs(axis.dot(forward)),boreScore=Math.abs(bore.dot(right));
  if(axisScore<.76||boreScore<.7)continue;
  for(let i=0;i+BASE_INTERVALS<holes;i++){
   const a=holeWorld(part,i,holes),b=holeWorld(part,i+BASE_INTERVALS,holes),mid=a.clone().add(b).multiplyScalar(.5),d=mid.clone().sub(center);
   const lateral=d.dot(right),longitudinal=d.dot(forward),height=mid.y;
   if(Math.abs(lateral)<carWidth*.1||Math.abs(lateral)>carWidth*.48)continue;
   raw.push({part,code,holes,side:lateral<0?-1:1,a,b,mid,longitudinal,lateral,height,axisScore,boreScore});
  }
 }
 if(!raw.length)return null;
 const heights=raw.map(r=>r.height).sort((a,b)=>a-b),highTarget=heights[Math.floor((heights.length-1)*.72)]??0;
 let best:{left:RailCandidate;right:RailCandidate;mode:-1|1;cross:ReturnType<typeof nearestCross>;score:number}|null=null;
 const lefts=raw.filter(r=>r.side<0),rights=raw.filter(r=>r.side>0);
 for(const left of lefts)for(const rightRail of rights){
  const dz=Math.abs(left.longitudinal-rightRail.longitudinal),dy=Math.abs(left.height-rightRail.height);if(dz>.45||dy>.35)continue;
  const rawSep=Math.abs(rightRail.lateral-left.lateral);if(rawSep<carWidth*.22||rawSep>carWidth*.8)continue;
  for(const mode of [-1,1] as const){
   // mode -1 = one Technic layer inward on both sides; +1 = outward.
   const span=rawSep+mode*2*LAYER,cross=nearestCross(span);if(cross.error>.075)continue;
   const symmetry=Math.abs(left.lateral+rightRail.lateral)/carWidth;
   const longitudinal=Math.abs((left.longitudinal+rightRail.longitudinal)/2-targetLong)/carLength;
   const targetHeight=Math.abs((left.height+rightRail.height)/2-highTarget)/Math.max(.2,carLength*.2);
   const spread=Math.abs(rawSep-carWidth*.48)/carWidth;
   const score=left.axisScore+rightRail.axisScore+left.boreScore+rightRail.boreScore
    -symmetry*2.2-longitudinal*1.5-targetHeight*.65-spread*.45-dz*.8-dy*.8-cross.error*10;
   if(!best||score>best.score)best={left,right:rightRail,mode,cross,score};
  }
 }
 if(!best)return null;
 const left=best.left,rightRail=best.right;
 const ordered=(r:RailCandidate)=>r.a.clone().sub(center).dot(forward)<=r.b.clone().sub(center).dot(forward)?[r.a,r.b] as const:[r.b,r.a] as const;
 const [lf,lr]=ordered(left),[rf,rr]=ordered(rightRail);
 const anchorWorld=[lf,lr,rf,rr] as const;
 const origin=anchorWorld.reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(.25);
 const basis=new T.Matrix4().makeBasis(right,up,forward),rotation=new T.Quaternion().setFromRotationMatrix(basis);
 const toLocal=(p:T.Vector3)=>{const d=p.clone().sub(origin);return [d.dot(right),d.dot(up),d.dot(forward)] as [number,number,number]};
 const findHole=(r:RailCandidate,p:T.Vector3)=>{let bi=0,bd=Infinity;for(let i=0;i<r.holes;i++){const d=holeWorld(r.part,i,r.holes).distanceToSquared(p);if(d<bd){bd=d;bi=i}}return bi};
 const anchors:[MountAnchor,MountAnchor,MountAnchor,MountAnchor]=[
  {partId:left.part.id,code:left.code,hole:findHole(left,lf),world:lf.toArray() as [number,number,number],local:toLocal(lf)},
  {partId:left.part.id,code:left.code,hole:findHole(left,lr),world:lr.toArray() as [number,number,number],local:toLocal(lr)},
  {partId:rightRail.part.id,code:rightRail.code,hole:findHole(rightRail,rf),world:rf.toArray() as [number,number,number],local:toLocal(rf)},
  {partId:rightRail.part.id,code:rightRail.code,hole:findHole(rightRail,rr),world:rr.toArray() as [number,number,number],local:toLocal(rr)},
 ];
 const normalized=Math.max(0,Math.min(1,(best.score-1.5)/2.5));
 return {origin:origin.toArray() as [number,number,number],rotation:rotation.toArray() as [number,number,number,number],forward:forward.toArray() as [number,number,number],right:right.toArray() as [number,number,number],anchors,leftPartId:left.part.id,rightPartId:rightRail.part.id,railLayerMode:best.mode,crossCode:best.cross.code,crossSpan:best.cross.span,confidence:normalized};
}
