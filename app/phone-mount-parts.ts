import * as T from 'three';
import type {MountInstallation} from './phone-mount-install';

/** Stock LDraw moulds only. No LEGO mesh is stretched to fit the phone or car. */
export const mountCatalog={
 '32278':{name:'Beam thẳng 15L',color:'#969696'},
 '41239':{name:'Beam thẳng 13L',color:'#1b2a34'},
 '40490':{name:'Beam thẳng 9L',color:'#f4f4f4'},
 '32525':{name:'Beam thẳng 11L',color:'#969696'},
 '32524':{name:'Beam thẳng 7L',color:'#1b2a34'},
 '32316':{name:'Beam thẳng 5L',color:'#1b2a34'},
 '6536':{name:'Cross block 1 × 2',color:'#f4f4f4'},
 '2780':{name:'Pin ma sát 2L',color:'#1b2a34'},
 '6558':{name:'Pin ma sát 3L',color:'#1e5aa8'},
} as const;
export type MountCode=keyof typeof mountCatalog;
export type MountPart={code:MountCode;stage:number;position:[number,number,number];quaternion:[number,number,number,number];role:string};

const X=new T.Vector3(1,0,0),Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1),STUD=.2;
const SPANS:Record<string,number>={'32316':.8,'32524':1.2,'40490':1.6,'32525':2,'41239':2.4,'32278':2.8};
const arr=(v:T.Vector3)=>v.toArray() as [number,number,number];
const qarr=(q:T.Quaternion)=>q.toArray() as [number,number,number,number];

function beamQuaternion(direction:T.Vector3,bore:T.Vector3){
 const z=direction.clone().normalize(),y=bore.clone().addScaledVector(z,-bore.dot(z)).normalize();
 const x=y.clone().cross(z).normalize();return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
}
function pinQuaternion(axis:T.Vector3){return new T.Quaternion().setFromUnitVectors(X,axis.clone().normalize())}
function crossBlockQuaternion(pinAxis:T.Vector3,verticalAxis=T.Vector3.prototype.clone.call(Y) as T.Vector3){
 // 6536 is used only as the real 90-degree interface between side-truss pins
 // and the vertical-bore bridge. Keep its long local Y axis upright and rotate
 // its transverse axis toward the truss pin.
 const y=verticalAxis.clone().normalize(),x=pinAxis.clone().addScaledVector(y,-pinAxis.dot(y)).normalize(),z=x.clone().cross(y).normalize();
 return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z));
}
function triangleApex(a:T.Vector3,b:T.Vector3,sideLength=1.2){
 const mid=a.clone().add(b).multiplyScalar(.5),base=b.clone().sub(a),half=base.length()/2;
 if(half>=sideLength)throw new Error('Khoảng hardpoint không phù hợp beam 7L.');
 const n=Y.clone().addScaledVector(base,-Y.dot(base)/Math.max(base.lengthSq(),1e-9)).normalize();
 return mid.addScaledVector(n,Math.sqrt(sideLength*sideLength-half*half));
}

export function buildMountParts(install:MountInstallation){
 const parts:MountPart[]=[];
 const add=(code:MountCode,stage:number,position:T.Vector3,quaternion:T.Quaternion,role:string)=>parts.push({code,stage,position:arr(position),quaternion:qarr(quaternion),role});
 const beam=(code:MountCode,stage:number,a:T.Vector3,b:T.Vector3,bore:T.Vector3,role:string)=>{
  const expected=SPANS[code];if(!expected)throw new Error('Không có span cho '+code);
  const distance=a.distanceTo(b);if(Math.abs(distance-expected)>.065)throw new Error(`${code} không khớp hardpoint: ${distance.toFixed(3)} / ${expected.toFixed(3)}`);
  add(code,stage,a.clone().add(b).multiplyScalar(.5),beamQuaternion(b.clone().sub(a),bore),role);
 };
 const pin=(code:'2780'|'6558',stage:number,p:T.Vector3,axis:T.Vector3,role:string)=>add(code,stage,p,pinQuaternion(axis),role);
 const a=install.anchors.map(x=>new T.Vector3(...x.local));
 const left=a.slice(0,2),right=a.slice(2,4);const railMode=install.railLayerMode;
 const sides=[left,right] as const;
 const baseNodes:{side:number;rear:T.Vector3;front:T.Vector3;apex:T.Vector3;connector:T.Vector3}[]=[];

 // 01 — two real 7L rails are pinned beside the exact selected chassis beam
 // holes. One Technic layer of separation prevents coplanar mesh collision.
 for(const anchors of sides){
  const side=Math.sign((anchors[0].x+anchors[1].x)/2)||1,shift=side*railMode*STUD;
  const ordered=[...anchors].sort((u,v)=>u.z-v.z),rear=ordered[0].clone(),front=ordered[1].clone();
  rear.x+=shift;front.x+=shift;
  beam('32524',0,rear,front,X,'chassis-side base rail');
  for(const original of ordered){const mount=original.clone();mount.x+=shift;pin('2780',0,original.clone().add(mount).multiplyScalar(.5),X,'actual chassis hardpoint pin')}
  const apex=triangleApex(rear,front),connector=apex.clone();
  baseNodes.push({side,rear,front,apex,connector});
 }

 // 02 — low triangular side trusses. The two diagonals occupy neighboring
 // Technic layers and meet through a long lateral pin, so no beam overlaps.
 for(const node of baseNodes){
  const layerA=new T.Vector3(node.side*STUD,0,0),layerB=new T.Vector3(node.side*STUD*2,0,0);
  beam('32524',1,node.rear.clone().add(layerA),node.apex.clone().add(layerA),X,'rear diagonal 7L');
  beam('32524',1,node.front.clone().add(layerB),node.apex.clone().add(layerB),X,'front diagonal 7L');
  pin('6558',1,node.rear.clone().addScaledVector(X,node.side*STUD*.5),X,'rear truss joint');
  pin('6558',1,node.front.clone().addScaledVector(X,node.side*STUD),X,'front truss joint');
  pin('6558',1,node.apex.clone().addScaledVector(X,node.side*STUD),X,'apex through-pin');
  add('6536',1,node.connector,crossBlockQuaternion(X),'90-degree bridge adapter');
 }

 // Use one shared bridge height/longitudinal station. The resolver already
 // requires the two chassis rails to be symmetric and near-coplanar.
 const bridgeCenter=new T.Vector3().add(baseNodes[0].connector).add(baseNodes[1].connector).multiplyScalar(.5);
 const bridgeY=Math.max(baseNodes[0].connector.y,baseNodes[1].connector.y)+STUD;
 const bridgeZ=bridgeCenter.z,leftX=baseNodes[0].connector.x,rightX=baseNodes[1].connector.x;
 const sideRearZ=bridgeZ-.4,sideFrontZ=bridgeZ+.4;
 for(const x of [leftX,rightX]){
  beam('32316',2,new T.Vector3(x,bridgeY,sideRearZ),new T.Vector3(x,bridgeY,sideFrontZ),Y,'top longitudinal rail 5L');
  pin('2780',2,new T.Vector3(x,bridgeY-STUD/2,bridgeZ),Y,'adapter to top rail');
 }
 const crossCode=install.crossCode as MountCode;
 for(const z of [sideRearZ,sideFrontZ]){
  beam(crossCode,2,new T.Vector3(leftX,bridgeY+STUD,z),new T.Vector3(rightX,bridgeY+STUD,z),Y,'cross-camera bridge');
  pin('6558',2,new T.Vector3(leftX,bridgeY+STUD/2,z),Y,'left bridge pin');
  pin('6558',2,new T.Vector3(rightX,bridgeY+STUD/2,z),Y,'right bridge pin');
 }

 // 04 — two 19-stud composite ledges: a stock 15L beam plus 5L end pieces
 // overlapping three holes in a second layer. This supports a 156 mm Aris
 // without scaling a LEGO mould. Short vertical stops leave the camera corner
 // open; the final retention is an explicitly non-LEGO elastic strap.
 const cradleX=(leftX+rightX)/2,ledgeY=bridgeY+STUD*2.25;
 for(const z of [sideRearZ,sideFrontZ]){
  beam('32278',3,new T.Vector3(cradleX-1.4,ledgeY,z),new T.Vector3(cradleX+1.4,ledgeY,z),Y,'15L cradle spine');
  for(const side of [-1,1]){
   const cx=cradleX+side*1.4;
   beam('32316',3,new T.Vector3(cx-side*.4,ledgeY+STUD,z),new T.Vector3(cx+side*.4,ledgeY+STUD,z),Y,'5L cradle extension');
   for(const px of [cradleX+side*1.0,cradleX+side*1.2,cradleX+side*1.4])pin('2780',3,new T.Vector3(px,ledgeY+STUD/2,z),Y,'cradle lap pin');
  }
 }
 const phoneZ=bridgeZ+.02,stopBottom=ledgeY+STUD;
 for(const side of [-1,1]){
  const x=cradleX+side*1.8;
  add('6536',3,new T.Vector3(x,stopBottom,phoneZ-.18),crossBlockQuaternion(Z),'side-stop adapter');
  beam('32316',3,new T.Vector3(x,stopBottom,phoneZ-.18),new T.Vector3(x,stopBottom+.8,phoneZ-.18),Z,'low side stop 5L');
 }
 return {parts,phonePose:{position:[cradleX,ledgeY+1.17,phoneZ] as [number,number,number],tilt:Math.PI/18},bridge:{leftX,rightX,y:bridgeY,z:bridgeZ}};
}

export function mountInventory(parts:ReadonlyArray<MountPart>,stage?:number){
 return Object.entries(mountCatalog).map(([code,spec])=>({...spec,code:code as MountCode,quantity:parts.filter(p=>p.code===code&&(stage===undefined||p.stage===stage)).length})).filter(x=>x.quantity>0);
}
