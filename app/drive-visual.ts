import * as T from 'three';
import type {PiecePose} from './explosion-layout';
import type {ModelData,Part} from './model-types';

export type WheelRig={ids:number[];center:T.Vector3;front:boolean;left:boolean;radius:number};
export type DriveRig={
 center:T.Vector3;
 forward:T.Vector3;
 side:T.Vector3;
 up:T.Vector3;
 alignment:T.Quaternion;
 wheels:WheelRig[];
 wheelByPart:Int16Array;
 roadY:number;
 mountPosition:T.Vector3;
 mountQuaternion:T.Quaternion;
};

const UP=new T.Vector3(0,1,0),WORLD_FORWARD=new T.Vector3(0,0,-1);
const tmpMatrix=new T.Matrix4();

function localBox(model:ModelData,p:Part){const b=model.geometries[p.geo].bounds;return new T.Box3(new T.Vector3().fromArray(b[0]),new T.Vector3().fromArray(b[1]))}
function partMatrix(ps:PiecePose){return tmpMatrix.compose(ps.position,ps.quaternion,ps.scale)}
function partCenter(model:ModelData,p:Part,base:PiecePose[]){return localBox(model,p).getCenter(new T.Vector3()).applyMatrix4(partMatrix(base[p.id]))}
function partBounds(model:ModelData,p:Part,base:PiecePose[]){return localBox(model,p).applyMatrix4(partMatrix(base[p.id]))}
function average(points:T.Vector3[]){const out=new T.Vector3();if(!points.length)return out;for(const p of points)out.add(p);return out.multiplyScalar(1/points.length)}
function centers(model:ModelData,parts:Part[],base:PiecePose[]){return parts.map(p=>partCenter(model,p,base))}
function groupCenter(model:ModelData,group:string,base:PiecePose[]){return average(centers(model,model.parts.filter(p=>p.group===group),base))}
function corners(model:ModelData,p:Part,base:PiecePose[],fn:(v:T.Vector3)=>void){
 const b=model.geometries[p.geo].bounds,m=partMatrix(base[p.id]).clone();
 for(let n=0;n<8;n++)fn(new T.Vector3(n&1?b[1][0]:b[0][0],n&2?b[1][1]:b[0][1],n&4?b[1][2]:b[0][2]).applyMatrix4(m));
}

/**
 * Derive the car's real longitudinal/lateral axes, four physical wheel clusters,
 * tyre radius, ground plane and a structural phone-rig anchor from the LDraw model.
 * Nothing here assumes a hand-tuned world orientation.
 */
export function createDriveRig(model:ModelData,base:PiecePose[]):DriveRig{
 const front=groupCenter(model,'front',base),rear=groupCenter(model,'rear',base);
 const forward=front.clone().sub(rear);forward.y=0;if(forward.lengthSq()<1e-6)forward.set(0,0,-1);forward.normalize();
 const up=UP.clone(),side=new T.Vector3().crossVectors(up,forward).normalize();
 const alignment=new T.Quaternion().setFromUnitVectors(forward,WORLD_FORWARD);
 const whole=new T.Box3();for(const p of model.parts)whole.union(partBounds(model,p,base));const center=whole.getCenter(new T.Vector3());

 const wheelParts=model.parts.filter(p=>p.group==='wheels'),wheelCentroid=average(centers(model,wheelParts,base));
 const buckets=new Map<string,Part[]>();
 for(const p of wheelParts){const c=partCenter(model,p,base),r=c.clone().sub(wheelCentroid),frontWheel=r.dot(forward)>=0,left=r.dot(side)>=0,key=(frontWheel?'f':'r')+(left?'l':'r');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key)!.push(p)}
 const wheels:WheelRig[]=[];
 for(const [key,parts] of buckets){
  if(!parts.length)continue;const c=average(centers(model,parts,base));
  const tyre=parts.filter(p=>/tyre|tire/i.test(model.geometries[p.geo].description));const radiusParts=tyre.length?tyre:parts;let radius=0;
  for(const p of radiusParts)corners(model,p,base,v=>{const d=v.sub(c),vertical=d.dot(up),longitudinal=d.dot(forward);radius=Math.max(radius,Math.hypot(vertical,longitudinal))});
  if(!Number.isFinite(radius)||radius<.2)radius=.8;
  wheels.push({ids:parts.map(p=>p.id),center:c,front:key[0]==='f',left:key[1]==='l',radius});
 }
 const wheelByPart=new Int16Array(model.parts.length);wheelByPart.fill(-1);wheels.forEach((w,i)=>w.ids.forEach(id=>{wheelByPart[id]=i}));
 const roadY=wheels.length?wheels.reduce((sum,w)=>sum+w.center.y-w.radius,0)/wheels.length-.035:whole.min.y-.035;

 // Anchor to actual structural chassis geometry, not bodywork. Long beams/frames
 // near the longitudinal centre are preferred; the top of that structural set
 // becomes the base plane for the two lower 13L rails in the phone tower.
 const chassis=model.parts.filter(p=>p.group==='chassis');
 let structure=chassis.filter(p=>/beam|liftarm|frame/i.test(model.geometries[p.geo].description));if(structure.length<4)structure=chassis;
 const wheelbase=Math.max(.5,front.distanceTo(rear));
 let central=structure.filter(p=>Math.abs(partCenter(model,p,base).clone().sub(center).dot(forward))<wheelbase*.28);if(central.length<2)central=structure;
 const structuralBounds=new T.Box3();for(const p of central)structuralBounds.union(partBounds(model,p,base));
 const anchor=center.clone();if(!structuralBounds.isEmpty()){const sc=structuralBounds.getCenter(new T.Vector3());anchor.addScaledVector(forward,sc.clone().sub(center).dot(forward));anchor.y=structuralBounds.max.y+.04}
 const mountPosition=anchor.clone().addScaledVector(up,-.2);
 const mountQuaternion=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(side,up,forward));
 return {center,forward,side,up,alignment,wheels,wheelByPart,roadY,mountPosition,mountQuaternion};
}

/** Rotate a complete wheel assembly rigidly around its true cluster centre. */
export function sampleWheelPose(rig:DriveRig,partId:number,source:PiecePose,spin:number,steer:number,out:PiecePose){
 const index=rig.wheelByPart[partId];if(index<0)return false;const wheel=rig.wheels[index];
 const steerQ=new T.Quaternion().setFromAxisAngle(rig.up,wheel.front?steer:0),axle=rig.side.clone().applyQuaternion(steerQ),spinQ=new T.Quaternion().setFromAxisAngle(axle,spin),q=spinQ.multiply(steerQ);
 out.position.copy(source.position).sub(wheel.center).applyQuaternion(q).add(wheel.center);
 out.center.copy(source.center).sub(wheel.center).applyQuaternion(q).add(wheel.center);
 out.quaternion.copy(q).multiply(source.quaternion);out.scale.copy(source.scale);return true;
}

export type DriveRoad={root:T.Group;setGroundY:(y:number)=>void;update:(distance:number)=>void;dispose:()=>void};

/** Lightweight asphalt test lane. The car stays in a stable camera frame while
 * lane markings move underneath it, so wheel rotation and steering stay legible.
 */
export function createDriveRoad():DriveRoad{
 const root=new T.Group(),materials:T.Material[]=[],geometries:T.BufferGeometry[]=[];
 const material=(color:number,roughness=.9)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness:0});materials.push(m);return m};
 const asphalt=material(0x30363a,.97),paint=material(0xe9eceb,.72),edge=material(0xcfd4d2,.8),seam=material(0x24292c,1);
 const planeGeo=new T.PlaneGeometry(12,90);geometries.push(planeGeo);const plane=new T.Mesh(planeGeo,asphalt);plane.rotation.x=-Math.PI/2;plane.receiveShadow=true;root.add(plane);
 function strip(x:number,width:number,mat:T.Material){const g=new T.BoxGeometry(width,.018,90);geometries.push(g);const mesh=new T.Mesh(g,mat);mesh.position.set(x,.012,0);root.add(mesh)}
 strip(-5.15,.08,edge);strip(5.15,.08,edge);
 const markings=new T.Group();root.add(markings);
 const dashGeo=new T.BoxGeometry(.09,.022,1.55);geometries.push(dashGeo);const count=52,dashes=new T.InstancedMesh(dashGeo,paint,count);const matrix=new T.Matrix4();let n=0;for(const x of [-3.15,3.15])for(let i=-13;i<13;i++){matrix.makeTranslation(x,.016,i*3.25);dashes.setMatrixAt(n++,matrix)}dashes.computeBoundingSphere();markings.add(dashes);
 const seamGeo=new T.BoxGeometry(10.3,.012,.025);geometries.push(seamGeo);const seams=new T.InstancedMesh(seamGeo,seam,15);for(let i=0;i<15;i++){matrix.makeTranslation(0,.007,(i-7)*6.5);seams.setMatrixAt(i,matrix)}seams.computeBoundingSphere();markings.add(seams);
 return {root,setGroundY(y){root.position.y=y},update(distance){const spacing=3.25;markings.position.z=((distance%spacing)+spacing)%spacing},dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}};
}
