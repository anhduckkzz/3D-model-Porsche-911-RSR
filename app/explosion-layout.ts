import * as T from 'three';
import type {ModelData,Part} from './model-types';

export type PackedCell={id:number;x:number;y:number;width:number;height:number};
export type PiecePose={position:T.Vector3;quaternion:T.Quaternion;scale:T.Vector3;center:T.Vector3};
export const FLAT_ROTATION=new T.Quaternion().setFromEuler(new T.Euler(.45,.55,-.12));
const CORNERS=Array.from({length:8},(_,i)=>[i&1?1:0,i&2?1:0,i&4?1:0]);

/** Bounds after a canonical three-quarter rotation. Includes each piece's true scale. */
export function flatBounds(part:Part,data:ModelData){
 const info=data.geometries[part.geo];const matrix=new T.Matrix4().fromArray(part.matrix);
 const scale=new T.Vector3(),rotation=new T.Quaternion(),position=new T.Vector3();matrix.decompose(position,rotation,scale);
 const localCenter=new T.Vector3().fromArray(info.bounds[0]).add(new T.Vector3().fromArray(info.bounds[1])).multiplyScalar(.5);
 const bounds=new T.Box3();for(const c of CORNERS){const v=new T.Vector3(info.bounds[c[0]][0],info.bounds[c[1]][1],info.bounds[c[2]][2]);v.sub(localCenter).multiply(scale).applyQuaternion(FLAT_ROTATION);bounds.expandByPoint(v)}
 return {bounds,localCenter,scale};
}

/** Deterministic shelf packing: every physical model element has its own padded rectangle. */
export function createFlatLayout(parts:Part[],data:ModelData,aspect:number){
 const cards=parts.map(p=>{const {bounds}=flatBounds(p,data);const size=bounds.getSize(new T.Vector3());return {id:p.id,width:Math.max(.23,size.x)+.16,height:Math.max(.23,size.y)+.16,geo:p.geo}});
 const area=cards.reduce((sum,c)=>sum+c.width*c.height,0);
 const target=Math.max(.5,...cards.map(c=>c.width),Math.sqrt(area*Math.max(.3,Math.min(3,aspect)))*1.05);
 cards.sort((a,b)=>b.height-a.height||a.geo-b.geo||a.id-b.id);
 let x=0,y=0,rowHeight=0,width=0;const cells=new Map<number,PackedCell>();
 for(const c of cards){if(x>0&&x+c.width>target){x=0;y+=rowHeight;rowHeight=0}cells.set(c.id,{id:c.id,x:x+c.width/2,y:-(y+c.height/2),width:c.width,height:c.height});x+=c.width;rowHeight=Math.max(rowHeight,c.height);width=Math.max(width,x)}
 const height=y+rowHeight;for(const c of cells.values()){c.x-=width/2;c.y+=height/2}
 const poses=new Map<number,PiecePose>();for(const p of parts){const {bounds,localCenter,scale}=flatBounds(p,data);const c=cells.get(p.id)!;const offset=bounds.getCenter(new T.Vector3());const position=new T.Vector3(c.x-offset.x,c.y-offset.y,-offset.z).sub(localCenter.clone().multiply(scale).applyQuaternion(FLAT_ROTATION));poses.set(p.id,{position,quaternion:FLAT_ROTATION.clone(),scale,center:new T.Vector3(c.x,c.y,0)})}
 return {cells,poses,width,height};
}

/** Rigid group explosion, followed by interpolation to a camera-facing inventory plane. */
export function groupOffsets(data:ModelData){
 const map=new Map<string,T.Vector3>();const order=data.groups.filter(g=>g.id!=='chassis');map.set('chassis',new T.Vector3());
 order.forEach((g,i)=>{const angle=i/order.length*Math.PI*2;map.set(g.id,new T.Vector3(Math.cos(angle)*10,Math.sin(angle)*6.8,Math.sin(angle*2)*5))});return map;
}

/** Compute timing only: preserve the legacy path, but allocate time by its average travel distance. */
export function legacyExplosionSplit(parts:Part[],data:ModelData,layout:ReturnType<typeof createFlatLayout>,offsets:Map<string,T.Vector3>){
 let first=0,second=0;
 for(const part of parts){
  const base=new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(part.matrix));
  const offset=offsets.get(part.group)??new T.Vector3();
  const grouped=base.clone().add(offset),flat=layout.poses.get(part.id)?.position;
  if(!flat)continue;
  first+=base.distanceTo(grouped);second+=grouped.distanceTo(flat);
 }
 const total=first+second;
 return total>1e-6?Math.max(.25,Math.min(.75,first/total)):.4;
}

export function insertionOffset(part:Part,data:ModelData){
 const matrix=new T.Matrix4().fromArray(part.matrix),p=new T.Vector3().setFromMatrixPosition(matrix);const info=data.geometries[part.geo];
 const size=new T.Vector3().fromArray(info.bounds[1]).sub(new T.Vector3().fromArray(info.bounds[0])).multiplyScalar(.01);
 const isAxial=/\b(pin|axle)\b/i.test(info.description);const direction=isAxial?new T.Vector3().setFromMatrixColumn(matrix,1).normalize():p.clone().add(new T.Vector3(0,1.8,0)).normalize();
 if(direction.dot(p)<0)direction.negate();if(direction.lengthSq()<.01)direction.set(0,1,0);
 return direction.multiplyScalar(Math.max(.8,Math.min(2.8,size.length()+.65)));
}

export type ExplosionPlan={base:Map<number,PiecePose>;grouped:Map<number,PiecePose>;flat:Map<number,PiecePose>;split:number;cells:Map<string,{x:number;y:number;width:number;height:number}>};
/** Groups own disjoint cells; their pieces remain inside those cells when flattened. */
export function createExplosionPlan(parts:Part[],data:ModelData,aspect:number):ExplosionPlan{
 const base=new Map<number,PiecePose>(),grouped=new Map<number,PiecePose>(),flat=new Map<number,PiecePose>();
 const groups=[...new Set(parts.map(p=>p.group))].map(id=>{
  const list=parts.filter(p=>p.group===id),bounds=new T.Box3();let radius=0;
  for(const p of list){const position=new T.Vector3(),quaternion=new T.Quaternion(),scale=new T.Vector3(),matrix=new T.Matrix4().fromArray(p.matrix);matrix.decompose(position,quaternion,scale);const info=data.geometries[p.geo];const box=new T.Box3(new T.Vector3().fromArray(info.bounds[0]),new T.Vector3().fromArray(info.bounds[1]));const center=box.getCenter(new T.Vector3()).applyMatrix4(matrix);base.set(p.id,{position,quaternion,scale,center});bounds.union(box.clone().applyMatrix4(matrix));radius=Math.max(radius,box.getSize(new T.Vector3()).multiply(scale).length())}
  const layout=createFlatLayout(list,data,aspect),size=bounds.getSize(new T.Vector3());return {id,list,bounds,layout,width:Math.max(size.x,layout.width)+radius+.7,height:Math.max(size.y,layout.height)+radius+.7};
 });
 const target=Math.max(1,...groups.map(g=>g.width),Math.sqrt(groups.reduce((a,g)=>a+g.width*g.height,0)*Math.max(.4,Math.min(3,aspect))));
 groups.sort((a,b)=>b.height-a.height||a.id.localeCompare(b.id));let x=0,y=0,row=0,width=0;
 const cells=new Map<string,{x:number;y:number;width:number;height:number}>();
 for(const g of groups){if(x&&x+g.width>target){x=0;y+=row;row=0}cells.set(g.id,{x:x+g.width/2,y:-(y+g.height/2),width:g.width,height:g.height});x+=g.width;row=Math.max(row,g.height);width=Math.max(width,x)}
 const height=y+row;for(const cell of cells.values()){cell.x-=width/2;cell.y+=height/2}
 let first=0,second=0;
 for(const g of groups){const c=cells.get(g.id)!,offset=new T.Vector3(c.x,c.y,0).sub(g.bounds.getCenter(new T.Vector3()));
  for(const p of g.list){const b=base.get(p.id)!,q={position:b.position.clone().add(offset),quaternion:b.quaternion.clone(),scale:b.scale.clone(),center:b.center.clone().add(offset)};grouped.set(p.id,q);const f=g.layout.poses.get(p.id)!;f.position.add(new T.Vector3(c.x,c.y,0));f.center.add(new T.Vector3(c.x,c.y,0));flat.set(p.id,f);first+=b.center.distanceTo(q.center);second+=q.center.distanceTo(f.center)}
 }
 return {base,grouped,flat,cells,split:first+second?first/(first+second):.5};
}
/** A single linear progress value drives positions, orientations and camera together. */
export function sampleExplosion(plan:ExplosionPlan,id:number,amount:number,out:PiecePose){
 const split=plan.split,a=amount<=split?plan.base.get(id)!:plan.grouped.get(id)!,b=amount<=split?plan.grouped.get(id)!:plan.flat.get(id)!;
 const t=Math.max(0,Math.min(1,amount<=split?amount/Math.max(split,1e-9):(amount-split)/Math.max(1-split,1e-9)));
 out.quaternion.copy(a.quaternion).slerp(b.quaternion,t);out.scale.copy(a.scale).lerp(b.scale,t);out.center.copy(a.center).lerp(b.center,t);
 // Rotate around the actual piece center rather than a remote LDraw origin.
 const local=a.center.clone().sub(a.position).applyQuaternion(a.quaternion.clone().invert()).divide(a.scale);
 out.position.copy(local).multiply(out.scale).applyQuaternion(out.quaternion).negate().add(out.center);return out;
}
/** Legacy Human Atlas-style explode: rigid group offsets, then one flat inventory plane. */
export function sampleLegacyExplosion(base:PiecePose,flat:PiecePose,offset:T.Vector3,amount:number,out:PiecePose,split=.4){
 const a=Math.max(0,Math.min(1,amount)),boundary=Math.max(.25,Math.min(.75,split));
 if(a<=boundary){
  const t=a/boundary;out.position.copy(base.position).addScaledVector(offset,t);out.quaternion.copy(base.quaternion);out.scale.copy(base.scale);out.center.copy(base.center).addScaledVector(offset,t);
 }else{
  const t=(a-boundary)/(1-boundary);out.position.copy(base.position).add(offset).lerp(flat.position,t);out.quaternion.copy(base.quaternion).slerp(flat.quaternion,t);out.scale.copy(base.scale).lerp(flat.scale,t);out.center.copy(base.center).add(offset).lerp(flat.center,t);
 }
 return out;
}

export function advanceExplosion(current:number,target:number,seconds:number){const distance=Math.max(0,Math.min(seconds,.05))*1.65;return current+Math.sign(target-current)*Math.min(Math.abs(target-current),distance)}
