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
const quat=(x:T.Vector3,y:T.Vector3)=>new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x.clone().normalize(),y.clone().normalize(),x.clone().cross(y).normalize()));
const spans:Partial<Record<MountCode,number>>={'41239':2.4,'40490':1.6,'32525':2,'32524':1.2,'32316':.8};

/** Exact Vsmart Aris envelope in the viewer's 40 mm/world-unit scale. */
export const phoneEnvelope={width:3.91375,height:1.904375,depth:.26775,bottom:1.045,back:1.27};

export function buildMountParts(install:MountInstallation){
 const parts:MountPart[]=[];
 const add=(code:MountCode,stage:number,p:T.Vector3,q:T.Quaternion,role:string)=>parts.push({code,stage,position:p.toArray() as [number,number,number],quaternion:q.toArray() as [number,number,number,number],role});
 const beam=(code:MountCode,stage:number,a:T.Vector3,b:T.Vector3,bore:T.Vector3,role:string)=>{
  const span=spans[code];if(span===undefined||Math.abs(a.distanceTo(b)-span)>.00001)throw new Error('Invalid stock beam span '+role);
  const z=b.clone().sub(a).normalize(),y=bore.clone().normalize();if(Math.abs(z.dot(y))>.00001)throw new Error('Beam bore must be perpendicular to span: '+role);
  add(code,stage,a.clone().add(b).multiplyScalar(.5),quat(y.clone().cross(z),y),role);
 };
 const pin=(code:'2780'|'6558',stage:number,p:T.Vector3,axis:T.Vector3,role:string)=>add(code,stage,p,new T.Quaternion().setFromUnitVectors(X,axis.clone().normalize()),role);
 const spacer=(stage:number,p:T.Vector3,bore:T.Vector3,role:string)=>add('18654',stage,p,new T.Quaternion().setFromUnitVectors(Y,bore.clone().normalize()),role);

 // 01 — zero-removal interface: a new 9L rail sits one Technic layer outside
 // each stock 15L chassis rail.  The resolver guarantees these four stock
 // holes are empty/reachable before this plan can exist.
 for(const s of [-1,1]){
  beam('40490',0,v(s*1.2,0,-.8),v(s*1.2,0,.8),X,'add-on base rail');
  for(const z of [-.8,.8])pin('2780',0,v(s*1.1,0,z),X,'empty chassis hardpoint');
 }

 // 02 — low 6–8–10 side triangles.  The two beam layers are deliberate: the
 // 3L pin + 1L spacer at the rear foot prevents the diagonal intersecting the
 // vertical leg while keeping every joint on the Technic grid.
 for(const s of [-1,1]){
  beam('40490',1,v(s*1.4,0,.6),v(s*1.4,1.6,.6),X,'side-truss vertical 9L');
  beam('32525',1,v(s*1.6,0,-.6),v(s*1.6,1.6,.6),X,'side-truss diagonal 11L');
  pin('2780',1,v(s*1.3,0,.6),X,'base / vertical joint');
  spacer(1,v(s*1.4,0,-.6),X,'diagonal foot spacer');
  pin('6558',1,v(s*1.4,0,-.6),X,'base / spacer / diagonal joint');
  pin('2780',1,v(s*1.5,1.6,.6),X,'triangle apex joint');
 }

 // 03 — two crossbars at different heights turn the two side trusses into a
 // torsion box.  Each crossbar is two stock 13L beams in neighboring Z layers,
 // joined through their overlap instead of stretching one LEGO mould.
 for(const s of [-1,1])for(const y of [.8,1.2]){
  add('15100',2,v(s*1.2,y,.6),quat(v(s,0,0),Z),'bridge adapter into truss');
  if(s<0)pin('2780',2,v(-1.2,y,.7),Z,'left bridge adapter joint');
  else{spacer(2,v(1.2,y,.8),Z,'right bridge depth spacer');pin('6558',2,v(1.2,y,.8),Z,'right bridge adapter joint')}
 }
 for(const y of [.8,1.2]){
  beam('41239',2,v(-2.2,y,.8),v(.2,y,.8),Z,'left crossbar 13L');
  beam('41239',2,v(-.2,y,1),v(2.2,y,1),Z,'right crossbar 13L');
  for(const x of [-.2,.2])pin('2780',2,v(x,y,.9),Z,'crossbar lap joint');
 }

 // 04 — pure-LEGO cradle.  The phone is captured by four independent surfaces:
 // two lower ledges, a two-rail backrest, and side retainers whose inner faces
 // sit at ±2.0 world units around the 3.91375-wide handset.  No foam/rubber is
 // needed to create the retaining geometry.
 // Backrest rails: left uses a 3L pin across the 0.4 Z offset, right a 2L pin.
 for(const s of [-1,1]){
  const x=s*.8;
  beam('40490',3,v(x,1.2,1.2),v(x,2.8,1.2),Z,'rigid backrest rail');
  pin(s<0?'6558':'2780',3,v(x,1.2,s<0?1:1.1),Z,'backrest / upper bridge joint');
 }
 // Two front-to-back 5L ledges carry the handset weight.  15100 turns the
 // bridge bore through 90 degrees; the following 2L pin raises each ledge one
 // layer so the phone rests on LEGO rather than on an invisible surface.
 for(const s of [-1,1]){
  const rearZ=s<0?1:1.2;
  add('15100',3,v(s*1.2,.8,rearZ),quat(Z.clone().negate(),Y),'bottom-ledge adapter');
  pin('2780',3,v(s*1.2,.9,rearZ),Y,'bottom-ledge vertical joint');
  beam('32316',3,v(s*1.2,1,rearZ),v(s*1.2,1,rearZ+.8),Y,'weight-bearing bottom ledge 5L');
 }
 // Outer uprights take the side-retainer and yoke loads back into both bridge
 // levels.  Both uprights share Z=1.2; the left therefore uses 3L pins and the
 // right 2L pins to meet the staggered crossbar layers.
 for(const s of [-1,1]){
  beam('32525',3,v(s*2.2,.8,1.2),v(s*2.2,2.8,1.2),Z,'cradle outer upright 11L');
  for(const y of [.8,1.2])pin(s<0?'6558':'2780',3,v(s*2.2,y,s<0?1:1.1),Z,'upright / bridge two-point lock');

  // 9L side beam is offset exactly one hole inward from the outer upright.
  // Two 15100 adapters + two pins make this a two-point rigid connection,
  // rather than a cantilevered decorative stop.
  beam('40490',3,v(s*2,1.2,1.4),v(s*2,2.8,1.4),X,'pure-LEGO side retainer 9L');
  for(const y of [1.4,2.4]){
   add('15100',3,v(s*2.2,y,1.4),quat(Z.clone().negate(),v(-s,0,0)),'side-retainer right-angle adapter');
   pin('2780',3,v(s*2.1,y,1.4),X,'side-retainer two-point joint');
  }
 }

 // 05 — place the phone, then close a removable LEGO yoke over its top edge.
 // The two lower 9L members sit at the same height so both phone corners have
 // ~sub-millimetre vertical clearance.  A 7L member one layer above bridges
 // the central seam.  Four independent supports (two side retainers + two
 // backrest rails) tie the yoke back into the cradle.
 beam('40490',4,v(-2.2,3,1.4),v(-.6,3,1.4),Y,'top locking yoke · left 9L');
 beam('40490',4,v(.6,3,1.4),v(2.2,3,1.4),Y,'top locking yoke · right 9L');
 beam('32524',4,v(-.6,3.2,1.4),v(.6,3.2,1.4),Y,'top locking yoke · center 7L');
 for(const x of [-.6,.6])pin('2780',4,v(x,3.1,1.4),Y,'top-yoke lap joint');
 for(const s of [-1,1]){
  // Side-retainer top → yoke endpoint.
  add('15100',4,v(s*2.2,2.8,1.4),quat(v(-s,0,0),Y),'top-yoke side adapter');
  pin('2780',4,v(s*2.2,2.9,1.4),Y,'top-yoke side lock');
  // Backrest top → lower yoke member at x=±0.8.
  add('15100',4,v(s*.8,2.8,1.4),quat(Z.clone().negate(),Y),'top-yoke backrest adapter');
  pin('2780',4,v(s*.8,2.9,1.4),Y,'top-yoke backrest lock');
 }

 const e=phoneEnvelope;
 return {
  parts,
  phonePose:{position:[0,e.bottom+e.height/2,e.back+e.depth/2] as [number,number,number],tilt:0},
  bridge:{leftX:-1.2,rightX:1.2,y:1.2,z:.8},
  retention:{bottomY:e.bottom,sideX:2,backZ:e.back,topY:e.bottom+e.height}
 };
}

export function mountInventory(parts:ReadonlyArray<MountPart>,stage?:number){
 return Object.entries(mountCatalog).map(([code,spec])=>({...spec,code:code as MountCode,quantity:parts.filter(p=>p.code===code&&(stage===undefined||p.stage===stage)).length})).filter(x=>x.quantity>0);
}
