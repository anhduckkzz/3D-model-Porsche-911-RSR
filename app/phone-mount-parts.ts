import * as T from 'three';
import type {MountInstallation} from './phone-mount-install';
export const mountCatalog={
 '32278':{name:'Beam 15L',color:'#969696'},'41239':{name:'Beam 13L',color:'#1b2a34'},
 '40490':{name:'Beam 9L',color:'#f4f4f4'},'32525':{name:'Beam 11L',color:'#969696'},
 '32524':{name:'Beam 7L',color:'#1b2a34'},'32316':{name:'Beam 5L',color:'#1b2a34'},
 '15100':{name:'Pin vuông góc có lỗ',color:'#f4f4f4'},'18654':{name:'Beam 1L / spacer',color:'#1b2a34'},
 '2780':{name:'Pin ma sát 2L',color:'#1b2a34'},'6558':{name:'Pin ma sát 3L',color:'#1e5aa8'},
 '32073':{name:'Axle 5L',color:'#969696'},'3706':{name:'Axle 6L',color:'#b40000'},'3707':{name:'Axle 8L',color:'#1b2a34'},
 '3713':{name:'Bush hai vành',color:'#969696'},'32123b':{name:'Half-bush',color:'#fac80a'},
} as const;
export type MountCode=keyof typeof mountCatalog;
export type MountPart={code:MountCode;stage:number;position:[number,number,number];quaternion:[number,number,number,number];role:string};
const X=new T.Vector3(1,0,0),Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1);
const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z);
const quat=(x:T.Vector3,y:T.Vector3)=>new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,x.clone().cross(y)));
const spans:Partial<Record<MountCode,number>>={'32278':2.8,'41239':2.4,'40490':1.6,'32525':2,'32524':1.2,'32316':.8};
export const phoneEnvelope={width:3.91375,height:1.904375,depth:.26775,bottom:3.29,back:1.5};
export function buildMountParts(install:MountInstallation){
 if(install.leftPartId!==110||install.rightPartId!==118)throw new Error('Unsupported chassis installation');
 const parts:MountPart[]=[];
 const add=(code:MountCode,stage:number,p:T.Vector3,q:T.Quaternion,role:string)=>parts.push({code,stage,position:p.toArray() as [number,number,number],quaternion:q.toArray() as [number,number,number,number],role});
 const beam=(code:MountCode,stage:number,a:T.Vector3,b:T.Vector3,bore:T.Vector3,role:string)=>{if(Math.abs(a.distanceTo(b)-spans[code]!)>.00001)throw new Error('Invalid beam span '+role);const z=b.clone().sub(a).normalize();add(code,stage,a.clone().add(b).multiplyScalar(.5),quat(bore.clone().cross(z),bore),role)};
 const shaft=(code:'2780'|'6558'|'32073'|'3706'|'3707',stage:number,p:T.Vector3,axis:T.Vector3,role:string)=>add(code,stage,p,new T.Quaternion().setFromUnitVectors(X,axis),role);
 const spacer=(stage:number,p:T.Vector3,bore:T.Vector3)=>add('18654',stage,p,new T.Quaternion().setFromUnitVectors(Y,bore),'round-hole spacer');
 const bush=(code:'3713'|'32123b',stage:number,p:T.Vector3,axis:T.Vector3,role:string)=>add(code,stage,p,new T.Quaternion().setFromUnitVectors(Z,axis),role);
 for(const s of [-1,1]){
  beam('32278',0,v(s*1,-.2,.6),v(s*3.8,-.2,.6),Y,'underframe outrigger 15L');
  for(const x of [1,1.8])shaft('2780',0,v(s*x,-.1,.6),Y,'chassis hardpoint');
  for(const x of [2.6,3.8])add('15100',1,v(s*x,0,.6),quat(Y.clone().negate(),Z),'truss foot into outrigger');
  beam('32278',1,v(s*3.8,0,.8),v(s*3.8,2.8,.8),Z,'outer upright 15L');
  beam('32525',1,v(s*2.6,0,1),v(s*3.8,1.6,1),Z,'6–8–10 diagonal');
  spacer(1,v(s*2.6,0,.8),Z);shaft('6558',1,v(s*2.6,0,.8),Z,'diagonal foot / spacer / adapter');
  shaft('2780',1,v(s*3.8,0,.7),Z,'upright foot');
  beam('40490',1,v(s*3.8,2.4,1),v(s*3.8,4,1),Z,'upper upright 9L');
  // Staggered backing beams bridge the original splice without moving the car.
  beam('32278',1,v(s*3.8,.2,.6),v(s*3.8,3,.6),Z,'upright backing 15L');
  beam('32524',1,v(s*3.8,3,.8),v(s*3.8,4.2,.8),Z,'upper backing 7L');
  for(const y of [.4,1.2,2])shaft('2780',1,v(s*3.8,y,.7),Z,'lower backing tie');
  for(const y of [2.4,2.8,3])shaft('6558',1,v(s*3.8,y,.8),Z,'staggered three-layer splice');
  for(const y of [3.4,3.8])shaft('2780',1,v(s*3.8,y,.9),Z,'upper backing tie');
  // A retained axle joins the backing, upright and lower diagonal at their knee.
  spacer(1,v(s*3.8,1.6,1.2),Z);
  shaft('3707',1,v(s*3.8,1.6,1),Z,'retained knee axle');
  bush('3713',1,v(s*3.8,1.6,.4),Z,'knee rear retention');
  bush('3713',2,v(s*3.8,1.6,1.6),Z,'knee front retention');
  beam('32525',2,v(s*3.8,1.6,1.4),v(s*2.6,3.2,1.4),Z,'upper 6–8–10 knee brace');
  shaft('2780',2,v(s*2.6,3.2,1.3),Z,'knee / bridge');
 }
 for(const y of [3.2,3.6]){
  for(const s of [-1,1]){
   beam('32278',2,v(s*1,y,1.2),v(s*3.8,y,1.2),Z,'outer bridge 15L');
   shaft('6558',2,v(s*3.8,y,1),Z,'bridge / doubled upright');
   for(const x of [1,1.4])shaft('2780',2,v(s*x,y,1.3),Z,'bridge overlap pin');
  }
  beam('32278',2,v(-1.4,y,1.4),v(1.4,y,1.4),Z,'central bridge 15L');
 }
 // Rigid back datum and four short stock connector ledges.
 beam('32525',3,v(0,3.2,1.2),v(0,5.2,1.2),Z,'back datum spine');
 for(const y of [3.2,3.6])shaft('2780',3,v(0,y,1.3),Z,'back spine / bridge');
 for(const y of [4.4,5]){spacer(3,v(0,y,1.4),Z);shaft('2780',3,v(0,y,1.3),Z,'back datum pin')}
 for(const x of [-1.2,-.6,.6,1.2])add('15100',3,v(x,3.2,1.6),quat(Z.clone().negate(),X),'phone bottom ledge');
 for(const s of [-1,1]){
  beam('32278',3,v(s*2.6,3.2,1.6),v(s*2.6,6,1.6),X,'cage side guide');
  for(const y of [3.2,3.6]){
   add('15100',3,v(s*2.4,y,1.6),quat(v(s,0,0),Z),'guide adapter');
   spacer(3,v(s*2.4,y,1.4),Z);shaft('6558',3,v(s*2.4,y,1.4),Z,'guide / spacer / bridge');
  }
  // Two adjustable axles per side. Bushes lock against both guide faces;
  // the inner full bush is the movable LEGO contact face, not an EVA pad.
  const contact=phoneEnvelope.width/2+.005;
  for(const y of [4,4.8]){
   shaft('32073',3,v(s*(contact+.5),y,1.6),X,'adjustable side jaw axle');
   bush('3713',3,v(s*(contact+.1),y,1.6),X,'side contact bush');
   for(const x of [2.45,2.75])bush('32123b',3,v(s*x,y,1.6),X,'side guide lock bush');
  }
 }
 // Top crossbars and adjustable downward stops: no strap or non-LEGO pad.
 for(const s of [-1,1]){
  const y=s<0?5.8:6;
  add('15100',4,v(s*2.4,y-.2,1.6),quat(Y,X),'top rail adapter');
  shaft('2780',4,v(s*2.5,y-.2,1.6),X,'top rail / side guide');
  beam('32278',4,v(s*2.4,y,1.6),v(-s*.4,y,1.6),Y,'removable top rail');
  const contact=phoneEnvelope.bottom+phoneEnvelope.height+.005;
  shaft('3706',4,v(s*.8,contact+.6,1.6),Y,'adjustable top stop axle');
  bush('3713',4,v(s*.8,contact+.1,1.6),Y,'top contact bush');
  for(const h of [y-.15,y+.15])bush('32123b',4,v(s*.8,h,1.6),Y,'top guide lock bush');
 }
 for(const x of [-.2,.2])shaft('2780',4,v(x,5.9,1.6),Y,'top rail overlap');
 for(const y of [3.8,5]){
  for(const s of [-1,1]){
   // Outer adapters are outside the phone envelope; long axles capture the
   // spacer stack with bushes at both ends, so nothing passes through the phone.
   add('15100',4,v(s*2.4,y,1.6),quat(v(s,0,0),Z),'front rail adapter');
   const z=s<0?2.2:2.4;
   beam('32278',4,v(s*2.4,y,z),v(-s*.4,y,z),Z,'removable front rail');
   shaft('3707',4,v(s*2.4,y,2),Z,'front rail retained axle');
   for(let h=1.8;h<z-.01;h+=.2)spacer(4,v(s*2.4,y,h),Z);
   bush('3713',4,v(s*2.4,y,1.4),Z,'rear axle retention');bush('3713',4,v(s*2.4,y,z+.2),Z,'front axle retention');
   const contact=phoneEnvelope.back+phoneEnvelope.depth+.005;
   shaft('32073',4,v(s*.8,y,contact+.5),Z,'adjustable front stop axle');
   bush('3713',4,v(s*.8,y,contact+.1),Z,'front contact bush');
   for(const h of [z-.15,z+.15])bush('32123b',4,v(s*.8,y,h),Z,'front guide lock bush');
  }
  for(const x of [-.2,.2])shaft('2780',4,v(x,y,2.3),Z,'front rail overlap');
 }
 const e=phoneEnvelope;
 return {parts,phonePose:{position:[0,e.bottom+e.height/2,e.back+e.depth/2] as [number,number,number],tilt:0},bridge:{leftX:-3.8,rightX:3.8,y:3.6,z:1.4}};
}
export function mountInventory(parts:ReadonlyArray<MountPart>,stage?:number){return Object.entries(mountCatalog).map(([code,spec])=>({...spec,code:code as MountCode,quantity:parts.filter(p=>p.code===code&&(stage===undefined||p.stage===stage)).length})).filter(x=>x.quantity>0)}
