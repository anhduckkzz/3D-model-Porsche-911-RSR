import * as T from 'three';
import type {ModelData} from './model-types';
export type MountAnchor={partId:number;code:string;hole:number;world:[number,number,number];local:[number,number,number]};
export type MountInstallation={origin:[number,number,number];rotation:[number,number,number,number];forward:[number,number,number];right:[number,number,number];anchors:[MountAnchor,MountAnchor,MountAnchor,MountAnchor];leftPartId:number;rightPartId:number;railLayerMode:-1|1;crossCode:string;crossSpan:number;confidence:number};
const tuple=(v:T.Vector3)=>v.toArray() as [number,number,number];
/** A designed installation on the stock 42096, not a best-looking runtime guess.
 * IDs identify the paired 15L chassis rails in the authored MPD conversion.
 * Refuse a different chassis instead of silently moving the rig to other holes.
 */
export function resolvePhoneMountInstallation(model:ModelData):MountInstallation|null{
 const rails=[338,337].map(id=>model.parts.find(p=>p.id===id));
 if(rails.some(p=>!p||p.group!=='chassis'||model.geometries[p.geo].name!=='32278.dat'))return null;
 const raw=rails.flatMap(p=>[5,13].map(hole=>({partId:p!.id,code:'32278',hole,point:new T.Vector3(0,0,(hole-7)*20).applyMatrix4(new T.Matrix4().fromArray(p!.matrix))})));
 const right=raw[2].point.clone().sub(raw[0].point).normalize();
 const forward=raw[1].point.clone().sub(raw[0].point).normalize();if(forward.z<0)forward.negate();
 const up=forward.clone().cross(right).normalize();right.copy(up).cross(forward).normalize();
 const origin=raw.reduce((v,a)=>v.add(a.point),new T.Vector3()).multiplyScalar(.25);
 const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward)),inverse=q.clone().invert();
 const anchors=raw.map(a=>({partId:a.partId,code:a.code,hole:a.hole,world:tuple(a.point),local:tuple(a.point.clone().sub(origin).applyQuaternion(inverse))}));
 for(let i=0;i<4;i++){const a=anchors[i].local;if(Math.abs(a[0]-(i<2?-1:1))>.003||Math.abs(a[1])>.003||Math.abs(Math.abs(a[2])-.8)>.003)return null;
  const bore=new T.Vector3(0,1,0).transformDirection(new T.Matrix4().fromArray(rails[i<2?0:1]!.matrix));if(Math.abs(bore.dot(right))<.9995)return null;
 }
 return {origin:tuple(origin),rotation:q.toArray() as [number,number,number,number],forward:tuple(forward),right:tuple(right),anchors:anchors as MountInstallation['anchors'],leftPartId:338,rightPartId:337,railLayerMode:1,crossCode:'41239',crossSpan:4.4,confidence:1};
}
