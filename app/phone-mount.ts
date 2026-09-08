import * as T from 'three';
import type {ModelData} from './model-types';
import {mountCatalog,mountParts} from './phone-mount-parts';

/** Every LEGO mesh references an existing, unmodified LDraw geometry buffer.
 * Only the phone envelope and optional camera direction aid are illustrative.
 * Geometry buffers belong to Scene and are never disposed here.
 */
export function createPhoneMount(model:ModelData,sourceGeometries:T.BufferGeometry[]){
 const root=new T.Group(),stages=Array.from({length:5},()=>new T.Group());
 stages.forEach(g=>root.add(g));root.position.set(0,.3,.6);
 const materials:T.Material[]=[],geometries:T.BufferGeometry[]=[],instances:T.InstancedMesh[]=[];
 const mat=(color:number,options:Partial<T.MeshStandardMaterialParameters>={})=>{const m=new T.MeshStandardMaterial({color,roughness:.3,...options});materials.push(m);return m};
 const plastic=mat(0xffffff,{vertexColors:true,metalness:.03,side:T.DoubleSide});
 const black=mat(0x293841),phone=mat(0x354653,{metalness:.35}),glass=mat(0x101c25,{metalness:.4,roughness:.17});
 // LDraw straight beams: length +Z, bores Y. Map to length X, bores Z.
 const canonical=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(0,1,0),new T.Vector3(0,0,1),new T.Vector3(1,0,0)));
 const pinRotation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),-Math.PI/2);
 const axis=new T.Vector3(0,0,1),scale=new T.Vector3(.01,.01,.01),matrix=new T.Matrix4();
 for(let stage=0;stage<4;stage++)for(const [code,spec] of Object.entries(mountCatalog)){
  const entries=mountParts.filter(p=>p.stage===stage&&p.code===code);if(!entries.length)continue;
  const geo=model.geometries.findIndex(g=>g.name===code+'.dat'&&g.colorHex===spec.color);
  if(geo<0||!sourceGeometries[geo])throw new Error('Thiếu asset LDraw '+code+'.dat');
  const mesh=new T.InstancedMesh(sourceGeometries[geo],plastic,entries.length);
  mesh.userData={ldraw:code+'.dat',stage,description:model.geometries[geo].description};
  entries.forEach((part,i)=>{
   const rotation=new T.Quaternion().setFromAxisAngle(axis,part.angle);
   if(part.orientation==='beam')rotation.multiply(canonical);
   else if(part.orientation==='pin')rotation.multiply(pinRotation);
   matrix.compose(new T.Vector3(...part.position),rotation,scale);mesh.setMatrixAt(i,matrix);
  });
  mesh.computeBoundingSphere();stages[stage].add(mesh);instances.push(mesh);
 }
 function box(stage:number,size:number[],pos:number[],material:T.Material){const g=new T.BoxGeometry(...size as [number,number,number]);geometries.push(g);const mesh=new T.Mesh(g,material);mesh.position.fromArray(pos);stages[stage].add(mesh);return mesh}
 // Normal Aris nominal envelope; reserve clearance for measured case/camera bump.
 box(4,[156.2*.025,75.04*.025,8.55*.025],[0,2.96,.09],phone);
 box(4,[3.76,1.74,.015],[0,2.96,-.025],glass);
 // Approximate location of rear camera island after landscape rotation.
 box(4,[.58,.58,.06],[1.32,3.37,.23],black);
 for(const x of [1.17,1.47])for(const y of [3.22,3.52]){const g=new T.CylinderGeometry(.082,.082,.035,16);geometries.push(g);const m=new T.Mesh(g,glass);m.rotation.x=Math.PI/2;m.position.set(x,y,.28);stages[4].add(m)}

 // Camera direction/FOV are inspection aids only. They stay available in the
 // Advanced design view, but are hidden on the installed rig in Drive mode.
 const aids=new T.Group();stages[4].add(aids);
 const sight=new T.ArrowHelper(new T.Vector3(0,0,1),new T.Vector3(1.17,3.52,.3),2.3,0x487b9a,.25,.14);aids.add(sight);
 const lines:number[]=[];const eye=[1.17,3.52,.3],corners=[[-.8,2.8,2.6],[3.1,2.8,2.6],[3.1,4.4,2.6],[-.8,4.4,2.6]];
 corners.forEach((p,i)=>lines.push(...eye,...p,...p,...corners[(i+1)%4]));
 const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(lines,3));geometries.push(fg);const fm=new T.LineBasicMaterial({color:0x8aa7b9,transparent:true,opacity:.45});materials.push(fm);aids.add(new T.LineSegments(fg,fm));
 return {
  root,
  update(step:number,exploded:boolean){stages.forEach((g,i)=>{g.visible=i<=step;g.position.y=(i===4?.1:0)+(exploded?i*.85:0)});root.updateMatrixWorld(true)},
  setAids(visible:boolean){aids.visible=visible},
  dispose(){instances.forEach(m=>m.dispose());sight.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}
 };
}
