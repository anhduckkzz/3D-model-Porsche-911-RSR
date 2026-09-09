import * as T from 'three';
import type {MountInstallation} from './phone-mount-install';
/** Existing LDraw moulds, uniformly scaled; dimensions below are hole centres. */
export const mountCatalog={
 '41239':{name:'Beam 13L',color:'#1b2a34'},
 '40490':{name:'Beam 9L',color:'#f4f4f4'},
 '32525':{name:'Beam 11L',color:'#969696'},
 '32524':{name:'Beam 7L',color:'#1b2a34'},
 '32316':{name:'Beam 5L',color:'#1b2a34'},
 '15100':{name:'Pin vuông góc có lỗ',color:'#f4f4f4'},
 '18654':{name:'Beam 1L / spacer',color:'#1b2a34'},
 '2780':{name:'Pin ma sát 2L',color:'#1b2a34'},
 '6558':{name:'Pin ma sát 3L',color:'#1e5aa8'},
} as const;
export type MountCode=keyof typeof mountCatalog;
export type MountPart={code:MountCode;stage:number;position:[number,number,number];quaternion:[number,number,number,number];role:string};
const X=new T.Vector3(1,0,0),Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1);
const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
const quat=(x:T.Vector3,y:T.Vector3)=>new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,x.clone().cross(y)));
const spans:Partial<Record<MountCode,number>>={'41239':2.4,'40490':1.6,'32525':2,'32524':1.2,'32316':.8};
export const phoneEnvelope={width:3.91375,height:1.904375,depth:.26775,bottom:.89,back:1.125};
export function buildMountParts(install:MountInstallation){
 if(install.leftPartId!==338||install.rightPartId!==337)throw new Error('Unsupported chassis installation');
 const parts:MountPart[]=[];
 const add=(code:MountCode,stage:number,p:T.Vector3,q:T.Quaternion,role:string)=>parts.push({code,stage,position:p.toArray() as [number,number,number],quaternion:q.toArray() as [number,number,number,number],role});
 const beam=(code:MountCode,stage:number,a:T.Vector3,b:T.Vector3,bore:T.Vector3,role:string)=>{if(Math.abs(a.distanceTo(b)-spans[code]!)>.00001)throw new Error('Invalid stock beam span '+role);const z=b.clone().sub(a).normalize();add(code,stage,a.clone().add(b).multiplyScalar(.5),quat(bore.clone().cross(z),bore),role)};
 const pin=(code:'2780'|'6558',stage:number,p:T.Vector3,axis:T.Vector3,role:string)=>add(code,stage,p,new T.Quaternion().setFromUnitVectors(X,axis),role);
 const spacer=(stage:number,p:T.Vector3,bore:T.Vector3,role:string)=>add('18654',stage,p,new T.Quaternion().setFromUnitVectors(Y,bore),role);
 for(const s of [-1,1]){
  beam('40490',0,v(s*1.2,0,-.8),v(s*1.2,0,.8),X,'base rail · chassis holes 6 / 14');
  for(const z of [-.8,.8])pin('2780',0,v(s*1.1,0,z),X,'chassis hardpoint');
  // 6–8–10 intervals: exact Pythagorean triangle using 9L and 11L.
  beam('40490',1,v(s*1.4,0,.6),v(s*1.4,1.6,.6),X,'vertical truss leg 9L');
  beam('32525',1,v(s*1.6,0,-.6),v(s*1.6,1.6,.6),X,'diagonal truss leg 11L');
  pin('2780',1,v(s*1.3,0,.6),X,'base / vertical');
  spacer(1,v(s*1.4,0,-.6),X,'diagonal foot spacer');
  pin('6558',1,v(s*1.4,0,-.6),X,'base / spacer / diagonal');
  pin('2780',1,v(s*1.5,1.6,.6),X,'triangle apex');
  for(const y of [.8,1.2]){
   add('15100',2,v(s*1.2,y,.6),quat(v(s,0,0),Z),'bridge adapter into vertical leg');
   if(s<0)pin('2780',2,v(-1.2,y,.7),Z,'left bridge / adapter');
   else{spacer(2,v(1.2,y,.8),Z,'right bridge depth spacer');pin('6558',2,v(1.2,y,.8),Z,'right bridge / spacer / adapter')}
  }
 }
 for(const y of [.8,1.2]){
  beam('41239',2,v(-2.2,y,.8),v(.2,y,.8),Z,'left crossbar 13L');
  beam('41239',2,v(-.2,y,1),v(2.2,y,1),Z,'right crossbar 13L');
  for(const x of [-.2,.2])pin('2780',2,v(x,y,.9),Z,'crossbar lap joint');
  beam('32524',3,v(-1.8,y,1),v(-.6,y,1),Z,'flush backrest spacer 7L');
  for(const x of [-1.8,-.6])pin('2780',3,v(x,y,.9),Z,'backrest / crossbar');
 }
 for(const s of [-1,1]){
  const crossZ=s<0?.8:1,uprightZ=crossZ+.2;
  beam('32525',3,v(s*2.2,.8,uprightZ),v(s*2.2,2.8,uprightZ),Z,'cradle side upright');
  for(const y of [.8,1.2])pin('2780',3,v(s*2.2,y,crossZ+.1),Z,'two-point upright lock');
  add('15100',3,v(s*.8,.8,1.2),quat(Z.clone().negate(),X),'ledge adapter into crossbar');
  add('15100',3,v(s*1.4,.8,1.2),quat(Z.clone().negate(),X),'second weight-bearing ledge');
  for(const y of [1.4,2.4]){
   add('15100',3,v(s*2.2,y,uprightZ+.2),quat(Z.clone().negate(),Y),'side stop adapter');
   beam('32316',3,v(s*2.2,y+.2,uprightZ+.2),v(s*2.2,y+.2,uprightZ+1),Y,'padded side stop');
   pin('2780',3,v(s*2.2,y+.1,uprightZ+.2),Y,'side stop / adapter');
  }
 }
 const e=phoneEnvelope;
 return {parts,phonePose:{position:[0,e.bottom+e.height/2,e.back+e.depth/2] as [number,number,number],tilt:0},bridge:{leftX:-1.2,rightX:1.2,y:1.2,z:.8}};
}
export function mountInventory(parts:ReadonlyArray<MountPart>,stage?:number){return Object.entries(mountCatalog).map(([code,spec])=>({...spec,code:code as MountCode,quantity:parts.filter(p=>p.code===code&&(stage===undefined||p.stage===stage)).length})).filter(x=>x.quantity>0)}
