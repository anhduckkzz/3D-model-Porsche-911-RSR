import * as T from 'three';
import type {ModelData} from './model-types';
export type MountAnchor={partId:number;code:string;hole:number;socket:[number,number,number];world:[number,number,number];local:[number,number,number]};
export type MountInstallation={origin:[number,number,number];rotation:[number,number,number,number];forward:[number,number,number];right:[number,number,number];anchors:[MountAnchor,MountAnchor,MountAnchor,MountAnchor];leftPartId:number;rightPartId:number;railLayerMode:-1|1;crossCode:string;crossSpan:number;confidence:number};
const tuple=(v:T.Vector3)=>v.toArray() as [number,number,number];
/** Four unoccupied downward-facing corner holes in the two stock 5×7 frames.
 * Geometry: 64179 connhole at raw (±40,0,-60). No original pieces removed.
 */
export function resolvePhoneMountInstallation(model:ModelData):MountInstallation|null{
 const rails=[110,118].map(id=>model.parts.find(p=>p.id===id));
 if(rails.some(p=>!p||model.geometries[p.geo].name!=='64179.dat'))return null;
 const matrices=rails.map(p=>new T.Matrix4().fromArray(p!.matrix));
 const origin=new T.Vector3().setFromMatrixPosition(matrices[0]).add(new T.Vector3().setFromMatrixPosition(matrices[1])).multiplyScalar(.5);
 const right=new T.Vector3(1,0,0).transformDirection(matrices[0]),up=new T.Vector3(0,-1,0).transformDirection(matrices[0]),forward=right.clone().cross(up).normalize();
 const q=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward)),inverse=q.clone().invert();
 const anchors=rails.flatMap((p,i)=>[-40,40].map((x,hole)=>{const socket:[number,number,number]=[x,0,-60],world=new T.Vector3(...socket).applyMatrix4(matrices[i]);return {partId:p!.id,code:'64179',hole,socket,world:tuple(world),local:tuple(world.clone().sub(origin).applyQuaternion(inverse))}}));
 const expected=[-1.8,-1,1,1.8];
 if(anchors.some((a,i)=>Math.abs(a.local[0]-expected[i])>.003||Math.abs(a.local[1])>.003||Math.abs(a.local[2]-.6)>.003))return null;
 return {origin:tuple(origin),rotation:q.toArray() as [number,number,number,number],forward:tuple(forward),right:tuple(right),anchors:anchors as MountInstallation['anchors'],leftPartId:110,rightPartId:118,railLayerMode:1,crossCode:'32278',crossSpan:7.6,confidence:1};
}
